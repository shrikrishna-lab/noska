//! Offline microphone capture and chunked Whisper transcription for Noska Desktop.
//!
//! Audio remains in this process. Only text and safe error metadata cross IPC.

use std::{fs, io::{Read, Write}, path::{Path, PathBuf}, sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex, OnceLock}, thread::{self, JoinHandle}, time::{Duration, Instant}};

use cpal::{traits::{DeviceTrait, HostTrait, StreamTrait}, SampleFormat, Stream, StreamConfig};
use crossbeam_channel::{bounded, Receiver, Sender};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use whisper_rs::{get_lang_str, FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

// Unlike *.en variants, this model detects and transcribes Indian languages.
const DEFAULT_MODEL: &str = "ggml-base.bin";
const DEFAULT_MODEL_URL: &str = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";
const SAMPLE_RATE: u32 = 16_000;
const CHUNK_SAMPLES: usize = (SAMPLE_RATE as usize * 3) / 2;
const OVERLAP_SAMPLES: usize = SAMPLE_RATE as usize / 4;
const MIN_SPEECH_RMS: f32 = 0.008;
const CAPABILITY_MAX_MS: u128 = 700;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCapability { pub available: bool, pub realtime: bool, pub multilingual: bool, pub reason: Option<String>, pub elapsed_ms: Option<u128> }

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalModelStatus { pub installed: bool, pub path: String, pub bytes: Option<u64> }

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TranscriptPayload { session_id: String, text: String, full_transcript: String, detected_language: Option<String>, language_stable: bool }

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TranscriptionError { session_id: String, code: &'static str, message: String }

struct Session { session_id: String, stop: Arc<AtomicBool>, capture: JoinHandle<()>, worker: JoinHandle<()> }
struct AudioBlock { samples: Vec<f32>, sample_rate: u32 }
static ACTIVE_SESSION: OnceLock<Mutex<Option<Session>>> = OnceLock::new();
fn session_slot() -> &'static Mutex<Option<Session>> { ACTIVE_SESSION.get_or_init(|| Mutex::new(None)) }

fn default_model_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map(|dir| dir.join("models").join(DEFAULT_MODEL)).map_err(|error| format!("Unable to resolve Noska data directory: {error}"))
}

fn model_status(app: &AppHandle) -> Result<LocalModelStatus, String> {
    let path = default_model_path(app)?;
    let bytes = path.metadata().ok().map(|meta| meta.len());
    Ok(LocalModelStatus { installed: bytes.is_some(), path: path.display().to_string(), bytes })
}

fn download_default_model(path: PathBuf) -> Result<LocalModelStatus, String> {
    let parent = path.parent().ok_or_else(|| "Invalid local model path".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("Could not create model directory: {error}"))?;
    let temporary = path.with_extension("bin.partial");
    let mut response = reqwest::blocking::get(DEFAULT_MODEL_URL).map_err(|error| format!("Could not download local Whisper model: {error}"))?;
    if !response.status().is_success() { return Err(format!("Could not download local Whisper model: HTTP {}", response.status())); }
    let mut file = fs::File::create(&temporary).map_err(|error| format!("Could not create local model file: {error}"))?;
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let count = response.read(&mut buffer).map_err(|error| format!("Could not read local model download: {error}"))?;
        if count == 0 { break; }
        file.write_all(&buffer[..count]).map_err(|error| format!("Could not save local model: {error}"))?;
    }
    file.flush().map_err(|error| format!("Could not finalise local model: {error}"))?;
    fs::rename(&temporary, &path).map_err(|error| format!("Could not activate local model: {error}"))?;
    let bytes = path.metadata().map_err(|error| format!("Could not inspect downloaded model: {error}"))?.len();
    Ok(LocalModelStatus { installed: true, path: path.display().to_string(), bytes: Some(bytes) })
}

fn capability_for_model(model_path: &Path) -> LocalCapability {
    if !model_path.is_file() {
        return LocalCapability { available: false, realtime: false, multilingual: false, reason: Some(format!("Local Whisper model is not installed: {}", model_path.display())), elapsed_ms: None };
    }
    let started = Instant::now();
    let result = (|| -> Result<bool, String> {
        let context = WhisperContext::new_with_params(model_path, WhisperContextParameters::default()).map_err(|error| format!("Could not load local Whisper model: {error}"))?;
        let mut state = context.create_state().map_err(|error| format!("Could not initialise local Whisper: {error}"))?;
        let params = FullParams::new(SamplingStrategy::BeamSearch { beam_size: 1, patience: -1.0 });
        state.full(params, &[0.0_f32; SAMPLE_RATE as usize]).map_err(|error| format!("Local Whisper benchmark failed: {error}"))?;
        Ok(context.is_multilingual())
    })();
    let elapsed_ms = started.elapsed().as_millis();
    match result {
        Ok(multilingual) => LocalCapability { available: true, realtime: elapsed_ms <= CAPABILITY_MAX_MS, multilingual, reason: (elapsed_ms > CAPABILITY_MAX_MS).then(|| format!("Local Whisper benchmark took {elapsed_ms}ms")), elapsed_ms: Some(elapsed_ms) },
        Err(reason) => LocalCapability { available: false, realtime: false, multilingual: false, reason: Some(reason), elapsed_ms: Some(elapsed_ms) },
    }
}

/// Lightweight deterministic VAD; a dedicated model can replace this later.
fn has_speech(samples: &[f32]) -> bool {
    !samples.is_empty() && (samples.iter().map(|sample| sample * sample).sum::<f32>() / samples.len() as f32).sqrt() >= MIN_SPEECH_RMS
}

fn resample_to_16khz(samples: &[f32], source_rate: u32) -> Vec<f32> {
    if source_rate == SAMPLE_RATE || samples.is_empty() { return samples.to_vec(); }
    let target_len = samples.len() * SAMPLE_RATE as usize / source_rate as usize;
    (0..target_len).map(|index| {
        let position = index as f64 * source_rate as f64 / SAMPLE_RATE as f64;
        let left = position.floor() as usize;
        let right = (left + 1).min(samples.len() - 1);
        let fraction = (position - left as f64) as f32;
        samples[left] * (1.0 - fraction) + samples[right] * fraction
    }).collect()
}

fn merge_overlap(committed: &str, incoming: &str) -> String {
    let prior: Vec<&str> = committed.split_whitespace().collect();
    let next: Vec<&str> = incoming.split_whitespace().collect();
    for size in (1..=prior.len().min(next.len()).min(12)).rev() {
        if prior[prior.len() - size..].iter().map(|word| word.to_lowercase()).eq(next[..size].iter().map(|word| word.to_lowercase())) { return next[size..].join(" "); }
    }
    incoming.trim().to_string()
}

struct Transcription { text: String, detected_language: Option<String> }

fn transcribe(context: &WhisperContext, audio: &[f32], language: &str) -> Result<Transcription, String> {
    let mut state = context.create_state().map_err(|error| error.to_string())?;
    let mut params = FullParams::new(SamplingStrategy::BeamSearch { beam_size: 1, patience: -1.0 });
    if language == "auto" && !context.is_multilingual() { return Err("Auto language detection requires a multilingual Whisper model".to_string()); }
    params.set_language(Some(if language == "auto" { "auto" } else { language.split('-').next().unwrap_or("en") }));
    params.set_no_timestamps(true);
    params.set_single_segment(true);
    params.set_n_threads(4);
    state.full(params, audio).map_err(|error| error.to_string())?;
    let detected_language = (language == "auto" && context.is_multilingual())
        .then(|| get_lang_str(state.full_lang_id_from_state()).map(str::to_string)).flatten();
    Ok(Transcription { text: state.as_iter().map(|segment| segment.to_string()).collect::<Vec<_>>().join(" ").trim().to_string(), detected_language })
}

#[derive(Default)]
struct LanguageLock { stable: Option<String>, candidate: Option<(String, u8)> }
impl LanguageLock {
    fn observe(&mut self, language: Option<String>) -> (Option<String>, bool) {
        let Some(language) = language else { return (self.stable.clone(), self.stable.is_some()); };
        let count = match &self.candidate { Some((candidate, count)) if candidate == &language => count.saturating_add(1), _ => 1 };
        self.candidate = Some((language.clone(), count));
        if count >= 2 { self.stable = Some(language); }
        (self.stable.clone().or_else(|| self.candidate.as_ref().map(|(value, _)| value.clone())), self.stable.is_some())
    }
}

fn emit_error(app: &AppHandle, session_id: &str, code: &'static str, message: impl Into<String>) {
    let _ = app.emit("transcription-error", TranscriptionError { session_id: session_id.to_string(), code, message: message.into() });
}

fn run_worker(app: AppHandle, session_id: String, model_path: PathBuf, language: String, rx: Receiver<AudioBlock>, stop: Arc<AtomicBool>) {
    let context = match WhisperContext::new_with_params(model_path, WhisperContextParameters::default()) { Ok(context) => context, Err(error) => { emit_error(&app, &session_id, "model-load-failed", error.to_string()); return; } };
    let mut pending = Vec::new();
    let mut full_transcript = String::new();
    let mut language_lock = LanguageLock::default();
    while !stop.load(Ordering::Relaxed) {
        match rx.recv_timeout(Duration::from_millis(150)) {
            Ok(block) => pending.extend(resample_to_16khz(&block.samples, block.sample_rate)),
            Err(crossbeam_channel::RecvTimeoutError::Timeout) => continue,
            Err(crossbeam_channel::RecvTimeoutError::Disconnected) => break,
        }
        if pending.len() < CHUNK_SAMPLES || !has_speech(&pending) { continue; }
        let audio = pending.clone();
        pending = pending.split_off(pending.len().saturating_sub(OVERLAP_SAMPLES));
        match transcribe(&context, &audio, &language) {
            Ok(result) if !result.text.is_empty() => {
                let delta = merge_overlap(&full_transcript, &result.text);
                if !delta.is_empty() { full_transcript = [full_transcript, delta.clone()].into_iter().filter(|part| !part.is_empty()).collect::<Vec<_>>().join(" "); }
                let (detected_language, language_stable) = language_lock.observe(result.detected_language);
                let _ = app.emit("transcription-partial", TranscriptPayload { session_id: session_id.clone(), text: delta, full_transcript: full_transcript.clone(), detected_language, language_stable });
            }
            Ok(_) => {}
            Err(error) => emit_error(&app, &session_id, "runtime-failed", error),
        }
    }
    if pending.len() >= SAMPLE_RATE as usize / 3 && has_speech(&pending) {
        match transcribe(&context, &pending, &language) {
            Ok(result) if !result.text.is_empty() => {
                let delta = merge_overlap(&full_transcript, &result.text);
                if !delta.is_empty() { full_transcript = [full_transcript, delta.clone()].into_iter().filter(|part| !part.is_empty()).collect::<Vec<_>>().join(" "); }
                let (detected_language, language_stable) = language_lock.observe(result.detected_language);
                let _ = app.emit("transcription-final", TranscriptPayload { session_id, text: delta, full_transcript, detected_language, language_stable });
            }
            Ok(_) => {}
            Err(error) => emit_error(&app, &session_id, "runtime-failed", error),
        }
    }
}

fn build_input_stream(device: &cpal::Device, config: &StreamConfig, sample_format: SampleFormat, sender: Sender<AudioBlock>) -> Result<Stream, String> {
    let channels = config.channels as usize;
    let sample_rate = config.sample_rate.0;
    let error = |error| eprintln!("Noska local microphone error: {error}");
    match sample_format {
        SampleFormat::F32 => device.build_input_stream(config, move |data: &[f32], _| { let _ = sender.send(AudioBlock { samples: data.chunks(channels).map(|frame| frame[0]).collect(), sample_rate }); }, error, None),
        SampleFormat::I16 => device.build_input_stream(config, move |data: &[i16], _| { let _ = sender.send(AudioBlock { samples: data.chunks(channels).map(|frame| frame[0] as f32 / i16::MAX as f32).collect(), sample_rate }); }, error, None),
        SampleFormat::U16 => device.build_input_stream(config, move |data: &[u16], _| { let _ = sender.send(AudioBlock { samples: data.chunks(channels).map(|frame| (frame[0] as f32 / u16::MAX as f32) * 2.0 - 1.0).collect(), sample_rate }); }, error, None),
        format => return Err(format!("Unsupported microphone sample format: {format:?}")),
    }.map_err(|error| format!("Could not open microphone: {error}"))
}

fn run_capture(app: AppHandle, session_id: String, sender: Sender<AudioBlock>, stop: Arc<AtomicBool>) {
    let host = cpal::default_host();
    let Some(device) = host.default_input_device() else { emit_error(&app, &session_id, "microphone-unavailable", "No microphone input device is available"); return; };
    let supported = match device.default_input_config() { Ok(config) => config, Err(error) => { emit_error(&app, &session_id, "microphone-unavailable", format!("Could not read microphone configuration: {error}")); return; } };
    let config: StreamConfig = supported.clone().into();
    let stream = match build_input_stream(&device, &config, supported.sample_format(), sender) { Ok(stream) => stream, Err(error) => { emit_error(&app, &session_id, "microphone-denied", error); return; } };
    if let Err(error) = stream.play() { emit_error(&app, &session_id, "microphone-denied", format!("Could not start microphone: {error}")); return; }
    while !stop.load(Ordering::Relaxed) { thread::sleep(Duration::from_millis(40)); }
}

#[tauri::command]
pub fn capability_check(app: AppHandle) -> LocalCapability { match default_model_path(&app) { Ok(path) => capability_for_model(&path), Err(reason) => LocalCapability { available: false, realtime: false, multilingual: false, reason: Some(reason), elapsed_ms: None } } }

#[tauri::command]
pub fn local_model_status(app: AppHandle) -> Result<LocalModelStatus, String> { model_status(&app) }

/// Explicit user-triggered model installation. No audio or transcript leaves
/// the device; only the public GGML model asset is downloaded once.
#[tauri::command]
pub async fn install_local_model(app: AppHandle) -> Result<LocalModelStatus, String> {
    let path = default_model_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || download_default_model(path))
        .await
        .map_err(|error| format!("Local model installer stopped: {error}"))?
}

#[tauri::command]
pub fn start_local_transcription(app: AppHandle, session_id: String, language: String) -> Result<(), String> {
    let model_path = default_model_path(&app)?;
    let capability = capability_for_model(&model_path);
    if !capability.available || !capability.realtime {
        let message = capability.reason.unwrap_or_else(|| "Local Whisper is not available on this device".to_string());
        emit_error(&app, &session_id, if message.contains("not installed") { "model-missing" } else { "capability-failed" }, message.clone());
        return Err(message);
    }
    let mut slot = session_slot().lock().map_err(|_| "Local transcription state is unavailable".to_string())?;
    if slot.is_some() { return Err("A local transcription session is already running".to_string()); }
    let (sender, receiver) = bounded(32);
    let stop = Arc::new(AtomicBool::new(false));
    let worker_stop = Arc::clone(&stop);
    let capture_stop = Arc::clone(&stop);
    let worker_app = app.clone();
    let worker_session = session_id.clone();
    let worker = thread::spawn(move || run_worker(worker_app, worker_session, model_path, language, receiver, worker_stop));
    let capture_app = app.clone();
    let capture_session = session_id.clone();
    let capture = thread::spawn(move || run_capture(capture_app, capture_session, sender, capture_stop));
    *slot = Some(Session { session_id, stop, capture, worker });
    Ok(())
}

#[tauri::command]
pub fn stop_local_transcription(session_id: String) -> Result<(), String> {
    let mut slot = session_slot().lock().map_err(|_| "Local transcription state is unavailable".to_string())?;
    let Some(session) = slot.take() else { return Ok(()); };
    if session.session_id != session_id { *slot = Some(session); return Ok(()); }
    session.stop.store(true, Ordering::Relaxed);
    let _ = session.capture.join();
    let _ = session.worker.join();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn missing_model_fails_capability_check_without_attempting_inference() { assert!(!capability_for_model(Path::new("missing-noska-whisper.bin")).available); }
    #[test] fn vad_rejects_silence_and_accepts_speech() { assert!(!has_speech(&[0.0; 160])); assert!(has_speech(&[0.1; 160])); }
    #[test] fn chunk_overlap_does_not_duplicate_words() { assert_eq!(merge_overlap("hello from noska", "noska voice typing"), "voice typing"); }
    #[test]
    fn installed_model_can_be_loaded_when_explicitly_requested() {
        let Ok(path) = std::env::var("NOSKA_WHISPER_MODEL") else { return; };
        assert!(capability_for_model(Path::new(&path)).available, "the requested local Whisper model should load");
    }
    #[test] fn language_lock_requires_two_matching_chunks() {
        let mut lock = LanguageLock::default();
        assert_eq!(lock.observe(Some("hi".to_string())), (Some("hi".to_string()), false));
        assert_eq!(lock.observe(Some("hi".to_string())), (Some("hi".to_string()), true));
    }
}

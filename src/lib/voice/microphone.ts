/**
 * High-performance Microphone capture & real-time vocal frequency analysis for Noska Voice Input.
 * Features logarithmically-scaled vocal formant tracking (80Hz - 8kHz), AGC, and instant responsiveness.
 */

export interface MicrophoneSession {
  stream: MediaStream;
  audioCtx: AudioContext;
  analyser: AnalyserNode;
  getFrequencyBands: (bandCount?: number) => number[];
  getVolumeLevel: () => number;
  stop: () => void;
}

export async function startMicrophoneCapture(): Promise<MicrophoneSession> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone API (getUserMedia) is not supported in this environment");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false, // Don't suppress natural speech harmonics
        autoGainControl: true,
      },
    });
  } catch (err: any) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      throw new Error(
        "Microphone access denied. If the browser didn't ask for permission, go to Windows Settings → Privacy → Microphone and enable \"Let desktop apps access your microphone\", then reload the page."
      );
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      throw new Error("No microphone found. Please connect a microphone and try again.");
    }
    throw new Error(`Microphone error: ${err.message || err}`);
  }

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  // Crucial: ensure audio context is active
  if (audioCtx.state === "suspended") {
    await audioCtx.resume().catch(() => {});
  }

  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();

  // 256-point FFT gives 128 tight frequency bins with immediate ~5ms latency
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.3; // Ultra snappy real-time response
  analyser.minDecibels = -85;
  analyser.maxDecibels = -10;
  source.connect(analyser);

  const freqBufferLength = analyser.frequencyBinCount; // 128 bins
  const freqData = new Uint8Array(freqBufferLength);
  const timeData = new Uint8Array(analyser.fftSize);

  const sampleRate = audioCtx.sampleRate || 44100;
  const binWidth = sampleRate / analyser.fftSize;

  const getVolumeLevel = (): number => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    analyser.getByteTimeDomainData(timeData);
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const val = (timeData[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / timeData.length);
    // Highly responsive curve for human voice
    return Math.min(1, Math.max(0, rms * 6));
  };

  const getFrequencyBands = (bandCount: number = 13): number[] => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    analyser.getByteFrequencyData(freqData);
    const rmsVolume = getVolumeLevel();

    // Human speech vocal formants (100Hz fundamental to 5000Hz harmonics)
    const minFreq = 90;
    const maxFreq = 5200;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);

    const bands: number[] = [];

    for (let i = 0; i < bandCount; i++) {
      const fStart = Math.pow(10, logMin + (i / bandCount) * (logMax - logMin));
      const fEnd = Math.pow(10, logMin + ((i + 1) / bandCount) * (logMax - logMin));

      const binStart = Math.max(0, Math.min(freqBufferLength - 1, Math.floor(fStart / binWidth)));
      const binEnd = Math.max(binStart + 1, Math.min(freqBufferLength, Math.ceil(fEnd / binWidth)));

      let sum = 0;
      let count = 0;
      for (let j = binStart; j < binEnd; j++) {
        sum += freqData[j];
        count++;
      }

      const rawAvg = count > 0 ? sum / count : 0;
      // High-gain normalizer (normal voice is typically 20-90 byte value)
      const normalized = Math.min(1, Math.max(0, rawAvg / 140));

      // Formant sensitivity boost for mid frequencies (human vowels)
      const formantMultiplier = 1 + Math.sin((i / bandCount) * Math.PI) * 0.4;
      const amplified = Math.min(1, normalized * 1.8 * formantMultiplier);

      // Blend with overall time-domain voice envelope
      const finalLevel = Math.min(1, Math.max(0.02, amplified * 0.75 + rmsVolume * 0.45));
      bands.push(finalLevel);
    }

    return bands;
  };

  const stop = () => {
    try {
      stream.getTracks().forEach((track) => track.stop());
      if (audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    } catch (e) {
      console.warn("[Voice/Microphone] Error closing stream:", e);
    }
  };

  return {
    stream,
    audioCtx,
    analyser,
    getFrequencyBands,
    getVolumeLevel,
    stop,
  };
}

/**
 * High-performance Microphone capture & real-time vocal frequency analysis for Noska Voice Input.
 * Features logarithmically-scaled vocal formant tracking (80Hz - 6.5kHz), adaptive dynamic gain, and instant 60fps responsiveness.
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
        "Microphone access denied. Please allow microphone permissions in your browser or system settings."
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
  analyser.smoothingTimeConstant = 0.25; // Ultra snappy real-time response
  analyser.minDecibels = -90;
  analyser.maxDecibels = -15;
  source.connect(analyser);

  const freqBufferLength = analyser.frequencyBinCount; // 128 bins
  const freqData = new Uint8Array(freqBufferLength);
  const timeData = new Uint8Array(analyser.fftSize);

  const sampleRate = audioCtx.sampleRate || 44100;
  const binWidth = sampleRate / analyser.fftSize;

  let peakVolume = 0.15; // Dynamic auto-gain tracker

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

    // Dynamic AGC tracker
    if (rms > peakVolume) {
      peakVolume = Math.min(1.0, rms * 1.2);
    } else {
      peakVolume = Math.max(0.12, peakVolume * 0.995); // Gentle decay
    }

    const normalized = rms / Math.max(0.08, peakVolume);
    return Math.min(1, Math.max(0, normalized * 1.4));
  };

  const getFrequencyBands = (bandCount: number = 13): number[] => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    analyser.getByteFrequencyData(freqData);
    const rmsVolume = getVolumeLevel();

    // Human speech vocal formants (90Hz fundamental to 5200Hz harmonics)
    const minFreq = 90;
    const maxFreq = 5400;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);

    const bands: number[] = [];

    for (let i = 0; i < bandCount; i++) {
      const fStart = Math.pow(10, logMin + (i / bandCount) * (logMax - logMin));
      const fEnd = Math.pow(10, logMin + ((i + 1) / bandCount) * (logMax - logMin));

      const binStart = Math.max(0, Math.min(freqBufferLength - 1, Math.floor(fStart / binWidth)));
      const binEnd = Math.max(binStart + 1, Math.min(freqBufferLength, Math.ceil(fEnd / binWidth)));

      let maxVal = 0;
      let sum = 0;
      let count = 0;
      for (let j = binStart; j < binEnd; j++) {
        const v = freqData[j];
        if (v > maxVal) maxVal = v;
        sum += v;
        count++;
      }

      const rawAvg = count > 0 ? (sum / count) * 0.6 + maxVal * 0.4 : 0;
      
      // High-sensitivity logarithmic scaling for vocal detection
      const rawNormalized = Math.min(1, Math.max(0, rawAvg / 110));

      // Vocal bell curve boost centered on formant frequencies (300Hz - 2.8kHz)
      const centerFactor = Math.sin((i / (bandCount - 1)) * Math.PI);
      const formantMultiplier = 1.0 + centerFactor * 0.85;
      
      const bandEnergy = Math.min(1, rawNormalized * 1.9 * formantMultiplier);

      // Blend frequency band with RMS volume for rich, organic movement
      const finalLevel = Math.min(1, Math.max(0.04, bandEnergy * 0.8 + rmsVolume * 0.5));
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

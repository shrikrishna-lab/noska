/**
 * Microphone capture & real-time audio frequency analysis for Noska Voice Input.
 */

export interface MicrophoneSession {
  stream: MediaStream;
  audioCtx: AudioContext;
  analyser: AnalyserNode;
  getFrequencyBands: (bandCount?: number) => number[];
  stop: () => void;
}

export async function startMicrophoneCapture(): Promise<MicrophoneSession> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone API (getUserMedia) is not supported in this environment");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.8;
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const getFrequencyBands = (bandCount: number = 12): number[] => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    analyser.getByteFrequencyData(dataArray);

    const bands: number[] = [];
    const step = Math.max(1, Math.floor(bufferLength / bandCount));

    for (let i = 0; i < bandCount; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i * step; j < (i + 1) * step && j < bufferLength; j++) {
        sum += dataArray[j];
        count++;
      }
      const avg = count > 0 ? sum / count : 0;
      // Normalize to a value between 0.05 and 1.0
      const normalized = Math.min(1, Math.max(0.05, avg / 255));
      bands.push(normalized);
    }

    return bands;
  };

  const stop = () => {
    try {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      if (audioCtx.state !== "closed") {
        audioCtx.close();
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
    stop,
  };
}

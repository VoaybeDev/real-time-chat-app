import { useRef, useState, useCallback } from "react";

// Détecte le bon format audio selon le navigateur/OS
const getSupportedMimeType = () => {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "",
  ];
  return types.find((t) => !t || MediaRecorder.isTypeSupported(t)) || "";
};

export const useVoiceMessage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const fixBlobDuration = (blob) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const tmpUrl = URL.createObjectURL(blob);
      audio.src = tmpUrl;

      audio.addEventListener("loadedmetadata", () => {
        if (audio.duration === Infinity || Number.isNaN(audio.duration)) {
          audio.currentTime = 1e101;
          audio.addEventListener(
            "timeupdate",
            function handler() {
              audio.removeEventListener("timeupdate", handler);
              URL.revokeObjectURL(tmpUrl);
              resolve(blob);
            },
            { once: true }
          );
        } else {
          URL.revokeObjectURL(tmpUrl);
          resolve(blob);
        }
      });
    });
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        const mType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mType });

        fixBlobDuration(blob).then((fixedBlob) => {
          const url = URL.createObjectURL(fixedBlob);
          setAudioBlob(fixedBlob);
          setAudioUrl(url);
        });

        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();

      setIsRecording(true);
      setDuration(0);
      setAudioBlob(null);
      setAudioUrl(null);

      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      console.error("Erreur microphone:", err);
      alert("❌ Impossible d’accéder au microphone (HTTPS obligatoire sur mobile).");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    chunksRef.current = [];
    clearInterval(timerRef.current);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  }, []);

  const resetAudio = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  }, []);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return {
    isRecording,
    audioBlob,
    audioUrl,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    resetAudio,
    formatDuration,
  };
};

// ✅ rend l'import compatible avec:  import useVoiceMessage from ...
export default useVoiceMessage;
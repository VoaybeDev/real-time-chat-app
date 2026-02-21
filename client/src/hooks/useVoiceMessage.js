import { useRef, useState, useCallback } from 'react';

// Détecte le bon format audio selon le navigateur/OS
const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    '',
  ];
  return types.find((t) => !t || MediaRecorder.isTypeSupported(t)) || '';
};

export const useVoiceMessage = () => {
  const [isRecording,  setIsRecording]  = useState(false);
  const [audioBlob,    setAudioBlob]    = useState(null);
  const [audioUrl,     setAudioUrl]     = useState(null);
  const [duration,     setDuration]     = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);
  const startTimeRef     = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      // Contraintes compatibles mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch {
        recorder = new MediaRecorder(stream); // fallback sans options
      }

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Calcule la durée réelle
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        const mType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mType });

        // Fix durée 0s : crée un blob avec durée correcte via FileReader
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

      timerRef.current = setInterval(
        () => setDuration(Math.round((Date.now() - startTimeRef.current) / 1000)),
        1000
      );
    } catch (err) {
      console.error('Erreur microphone:', err);
      if (err.name === 'NotAllowedError') {
        alert('❌ Accès au microphone refusé.\n\nSur mobile, le site doit être en HTTPS.\nUtilise l\'URL ngrok fournie.');
      } else if (err.name === 'NotFoundError') {
        alert('❌ Aucun microphone détecté.');
      } else {
        alert(`❌ Erreur microphone : ${err.message}`);
      }
    }
  }, []);

  // Fix bug durée 0s sur Chrome/mobile
  const fixBlobDuration = (blob) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(blob);
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration === Infinity || isNaN(audio.duration)) {
          // Force le navigateur à calculer la durée
          audio.currentTime = 1e101;
          audio.addEventListener('timeupdate', function handler() {
            this.removeEventListener('timeupdate', handler);
            URL.revokeObjectURL(audio.src);
            resolve(blob); // retourne le blob original
          });
        } else {
          URL.revokeObjectURL(audio.src);
          resolve(blob);
        }
      });
    });
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
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
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return {
    isRecording, audioBlob, audioUrl, duration,
    startRecording, stopRecording, cancelRecording, resetAudio, formatDuration,
  };
};
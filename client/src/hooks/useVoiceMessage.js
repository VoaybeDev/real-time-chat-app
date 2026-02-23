import { useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (socket) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle | calling | receiving | in-call
  const [callType, setCallType] = useState(null); // audio | video
  const [callerId, setCallerId] = useState(null);
  const [targetId, setTargetId] = useState(null);

  const pcRef = useRef(null);

  const cleanupPC = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const endCall = useCallback((remoteTargetId = null) => {
    const target = remoteTargetId || targetId;
    if (target) socket?.emit('call:end', { targetId: target });

    cleanupPC();
    localStream?.getTracks().forEach((t) => t.stop());

    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setCallType(null);
    setCallerId(null);
    setTargetId(null);
  }, [socket, targetId, localStream, cleanupPC]);

  const getLocalStream = useCallback(async (type) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    });
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback((stream, remoteTargetId) => {
    cleanupPC();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const remoteMediaStream = new MediaStream();
    setRemoteStream(remoteMediaStream);

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => remoteMediaStream.addTrack(track));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && remoteTargetId) {
        socket?.emit('call:ice-candidate', { targetId: remoteTargetId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endCall(remoteTargetId);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket, cleanupPC, endCall]);

  const startCall = useCallback(async (receiverId, type = 'audio') => {
    try {
      setCallType(type);
      setTargetId(receiverId);
      setCallStatus('calling');

      const stream = await getLocalStream(type);
      const pc = createPeerConnection(stream, receiverId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit('call:initiate', { receiverId, callType: type, offer });
    } catch (err) {
      console.error('Erreur démarrage appel:', err);
      setCallStatus('idle');
    }
  }, [socket, getLocalStream, createPeerConnection]);

  const answerCall = useCallback(async (incomingCallerId, offer, type = 'audio') => {
    try {
      setCallStatus('in-call');
      setTargetId(incomingCallerId);

      const stream = await getLocalStream(type);
      const pc = createPeerConnection(stream, incomingCallerId);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit('call:answer', { callerId: incomingCallerId, answer });
    } catch (err) {
      console.error('Erreur réponse appel:', err);
      setCallStatus('idle');
    }
  }, [socket, getLocalStream, createPeerConnection]);

  const handleCallAnswered = useCallback(async ({ answer }) => {
    try {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      setCallStatus('in-call');
    } catch (err) {
      console.error('Erreur set remote description:', err);
    }
  }, []);

  const handleICECandidate = useCallback(async ({ candidate }) => {
    try {
      await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Erreur ajout ICE candidate:', err);
    }
  }, []);

  const rejectCall = useCallback((incomingCallerId) => {
    socket?.emit('call:reject', { callerId: incomingCallerId });
    setCallStatus('idle');
    setCallerId(null);
  }, [socket]);

  const toggleMic = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, [localStream]);

  return {
    localStream, remoteStream, callStatus, callType, callerId, targetId,
    setCallStatus, setCallType, setCallerId,
    startCall, answerCall, rejectCall, endCall,
    handleCallAnswered, handleICECandidate,
    toggleMic, toggleCamera,
  };
};
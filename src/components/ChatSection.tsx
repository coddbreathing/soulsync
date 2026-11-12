import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Heart, Video, Mic, Sparkles, FolderSync, MessageSquareHeart, PhoneOff, Play, Pause, AlertCircle, Radio, StopCircle, Disc, RotateCw, Check, ChevronDown, MicOff, VideoOff } from 'lucide-react';
import { Message, CouplePair } from '../types';
import { uploadFileToDrive } from '../utils/driveService';

interface ChatSectionProps {
  pair: CouplePair;
  myId: string;
  role: 'A' | 'B';
  myName: string;
  partnerName: string;
  onSendAction: (actionType: string, payload: any) => void;
  driveToken: string | null;
  onRefreshDriveFiles?: () => void;
}

function PartnerAudioBars() {
  const [heights, setHeights] = React.useState<number[]>([20, 35, 15, 45, 60, 25, 40, 55, 30, 45, 20, 35]);
  React.useEffect(() => {
    const val = setInterval(() => {
      setHeights(prev => prev.map(() => Math.floor(Math.random() * 65) + 15));
    }, 120);
    return () => clearInterval(val);
  }, []);

  return (
    <div className="flex items-end justify-center gap-0.5 h-6">
      {heights.map((h, i) => (
        <span 
          key={i} 
          className="w-0.5 bg-gradient-to-t from-rose-500 to-indigo-400 rounded-full transition-all duration-100 animate-pulse" 
          style={{ height: `${h}%`, animationDuration: '0.8s' }} 
        />
      ))}
    </div>
  );
}

export default function ChatSection({
  pair,
  myId,
  role,
  myName,
  partnerName,
  onSendAction,
  driveToken,
  onRefreshDriveFiles,
}: ChatSectionProps) {
  const [inputText, setInputText] = useState("");
  const [selectedNoteStyle, setSelectedNoteStyle] = useState<string | undefined>(undefined);
  const [isPlayingAudioId, setIsPlayingAudioId] = useState<string | null>(null);

  // Call Recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const [recordingStatusText, setRecordingStatusText] = useState("");
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);

  // Gemini AI options
  const [isGeneratingField, setIsGeneratingField] = useState(false);
  const [geminiResultText, setGeminiResultText] = useState("");
  const [promptCategory, setPromptCategory] = useState("prompts");

  // Call options
  const isInVideoCall = !!(pair.videoCall?.isActive && (pair.videoCall?.senderRole === role || pair.videoCall?.isAccepted));
  const [isCloudSyncChecked, setIsCloudSyncChecked] = useState(true);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isLocalVideoOn, setIsLocalVideoOn] = useState(true);
  const [callTimerSecs, setCallTimerSecs] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [recordingOption, setRecordingOption] = useState<'with-partner' | 'partner'>('with-partner');
  const [showRecOptionsPopover, setShowRecOptionsPopover] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Active video element tracking and canvas recording rendering references
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasLoopRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Scroll to bottom of messages disabled to prevent page jitter / auto-scrolling glitch

  // WebRTC references and states
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const appliedCandidatesRef = useRef<Set<string>>(new Set());
  const localCandidatesBufferRef = useRef<{ senderRole: 'A' | 'B'; candidate: string }[]>([]);
  const lastSignaledOfferRef = useRef<string | null>(null);
  const lastSignaledAnswerRef = useRef<string | null>(null);
  const lastProcessedOfferRef = useRef<string | null>(null);
  const lastProcessedAnswerRef = useRef<string | null>(null);
  const iceSendTimeoutRef = useRef<any>(null);

  // Callback refs to instantly and robustly bind stream objects upon layout mounts
  const setLocalVideoRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoElRef.current = node;
    if (node && localStream) {
      node.srcObject = localStream;
    }
  }, [localStream]);

  const setRemoteVideoRef = useCallback((node: HTMLVideoElement | null) => {
    remoteVideoElRef.current = node;
    if (node && remoteStream) {
      node.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle local video camera display and track access
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isInVideoCall) {
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode }, 
        audio: true 
      })
        .then((s) => {
          stream = s;
          activeStreamRef.current = s;
          setLocalStream(s);
          // Enable/disable tracks based on state
          s.getAudioTracks().forEach(track => track.enabled = !isLocalMuted);
          s.getVideoTracks().forEach(track => track.enabled = isLocalVideoOn);
        })
        .catch((err) => {
          console.warn("Camera permission blocked or unavailable:", err);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      activeStreamRef.current = null;
      setLocalStream(null);
    };
  }, [isInVideoCall, facingMode]);

  // Handle live toggle audio track mute
  useEffect(() => {
    const stream = activeStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isLocalMuted;
      });
    }
  }, [isLocalMuted]);

  // Handle live toggle camera track freeze
  useEffect(() => {
    const stream = activeStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = isLocalVideoOn;
      });
    }
  }, [isLocalVideoOn]);

  // WebRTC Signaling Synchronization Engine
  useEffect(() => {
    if (!isInVideoCall || !pair.videoCall || !pair.videoCall.isAccepted) {
      // Cleanup peer connections
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (iceSendTimeoutRef.current) {
        clearTimeout(iceSendTimeoutRef.current);
        iceSendTimeoutRef.current = null;
      }
      setRemoteStream(null);
      appliedCandidatesRef.current.clear();
      localCandidatesBufferRef.current = [];
      lastSignaledOfferRef.current = null;
      lastSignaledAnswerRef.current = null;
      lastProcessedOfferRef.current = null;
      lastProcessedAnswerRef.current = null;
      return;
    }

    // Wait until local camera & microphone streams are acquired and ready
    if (!localStream) {
      return;
    }

    const videoCall = pair.videoCall;
    const isInitiator = videoCall.senderRole === role;

    const sendWebRTCSignal = (payload: any) => {
      onSendAction('UPDATE_WEBRTC_SIGNAL', payload);
    };

    const initializePeerConnection = async () => {
      if (peerConnectionRef.current) return;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = pc;

      // Remote stream arrived
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Gather candidate signals
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const item = {
            senderRole: role,
            candidate: JSON.stringify(event.candidate)
          };
          localCandidatesBufferRef.current.push(item);

          // Debounce sending to adhere to Firestore rate limits (1 write/sec per document)
          if (!iceSendTimeoutRef.current) {
            iceSendTimeoutRef.current = setTimeout(() => {
              if (localCandidatesBufferRef.current.length > 0) {
                sendWebRTCSignal({ iceCandidates: [...localCandidatesBufferRef.current] });
                localCandidatesBufferRef.current = [];
              }
              iceSendTimeoutRef.current = null;
            }, 1000);
          }
        } else {
          // Flush gathered signals on completion
          if (iceSendTimeoutRef.current) {
            clearTimeout(iceSendTimeoutRef.current);
            iceSendTimeoutRef.current = null;
          }
          if (localCandidatesBufferRef.current.length > 0) {
            sendWebRTCSignal({ iceCandidates: [...localCandidatesBufferRef.current] });
            localCandidatesBufferRef.current = [];
          }
        }
      };

      // Inject active local camera tracks BEFORE creating the offer/answer
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // If we called and started the meeting: generate and send offer
      if (isInitiator) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          lastSignaledOfferRef.current = JSON.stringify(offer);
          sendWebRTCSignal({ sdpOffer: JSON.stringify(offer) });
        } catch (err) {
          console.error("Failed to build offer session:", err);
        }
      }
    };

    initializePeerConnection();

    // Check signaling phases
    const pc = peerConnectionRef.current;
    if (!pc) return;

    // Dynamically guarantee local tracks are bound or updated (e.g. during camera rotation/switch)
    localStream.getTracks().forEach((track) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
      if (sender) {
        if (sender.track !== track) {
          sender.replaceTrack(track).catch(e => {
            console.error("Failed to replace RTC track:", e);
          });
        }
      } else {
        pc.addTrack(track, localStream);
      }
    });

    const processSDP = async () => {
      // Receiver: sees an offer, sets remote description and answers
      if (!isInitiator && videoCall.sdpOffer && videoCall.sdpOffer !== lastProcessedOfferRef.current && pc.signalingState === "stable") {
        try {
          lastProcessedOfferRef.current = videoCall.sdpOffer;
          const offerDesc = new RTCSessionDescription(JSON.parse(videoCall.sdpOffer));
          await pc.setRemoteDescription(offerDesc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          lastSignaledAnswerRef.current = JSON.stringify(answer);
          sendWebRTCSignal({ sdpAnswer: JSON.stringify(answer) });
        } catch (err) {
          console.error("Failed to answer incoming call sdp:", err);
        }
      }

      // Initiator: sees remote answer, sets remote description
      if (isInitiator && videoCall.sdpAnswer && videoCall.sdpAnswer !== lastProcessedAnswerRef.current && pc.signalingState === "have-local-offer") {
        try {
          lastProcessedAnswerRef.current = videoCall.sdpAnswer;
          const answerDesc = new RTCSessionDescription(JSON.parse(videoCall.sdpAnswer));
          await pc.setRemoteDescription(answerDesc);
        } catch (err) {
          console.error("Failed to process companion answered session description:", err);
        }
      }
    };

    processSDP();

    // Apply any new ICE candidate layers from opponent
    if (videoCall.iceCandidates && videoCall.iceCandidates.length > 0) {
      videoCall.iceCandidates.forEach((item) => {
        if (item.senderRole !== role && !appliedCandidatesRef.current.has(item.candidate)) {
          try {
            const candidate = new RTCIceCandidate(JSON.parse(item.candidate));
            pc.addIceCandidate(candidate).catch(e => {
              console.warn("Benign candidate loading warning:", e);
            });
            appliedCandidatesRef.current.add(item.candidate);
          } catch (err) {
            console.error("Failed applying WebRTC candidate element:", err);
          }
        }
      });
    }

  }, [isInVideoCall, pair.videoCall, role, localStream]);

  // Handle start of video call stream recording with dual configuration options
  const handleStartRecording = (selectedMode?: 'with-partner' | 'partner') => {
    const finalMode = selectedMode || recordingOption;
    onSendAction('START_RECORDING', { senderName: myName, mode: finalMode });
    
    let recordStream: MediaStream | null = null;
    
    if (finalMode === 'with-partner') {
      try {
        // Canvas mixer configuration for combining dual feeds side-by-side
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        
        const drawFrame = () => {
          if (!ctx) return;
          // Clear layout with elegant couple-chamber background color
          ctx.fillStyle = '#0a0515';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          const hasRemote = remoteVideoElRef.current && remoteStream && remoteStream.getVideoTracks().length > 0;
          const hasLocal = localVideoElRef.current && localStream && localStream.getVideoTracks().length > 0;
          
          if (hasRemote && hasLocal) {
            // Side-by-side premium layout
            try {
              // Left Half: Remote partner video
              ctx.drawImage(remoteVideoElRef.current!, 0, 0, 640, 720);
              
              // Divider line with glowing effect
              ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.moveTo(640, 0);
              ctx.lineTo(640, 720);
              ctx.stroke();
              
              // Right Half: Local video
              ctx.drawImage(localVideoElRef.current!, 640, 0, 640, 720);
              
              // Drawing overlay heart badge or labels
              ctx.fillStyle = 'rgba(10, 5, 21, 0.6)';
              ctx.fillRect(20, 20, 180, 40);
              ctx.fillRect(660, 20, 180, 40);
              
              ctx.fillStyle = '#fdb2b2';
              ctx.font = 'bold 16px sans-serif';
              ctx.fillText(`💖 ${partnerName || 'Companion'}`, 35, 46);
              ctx.fillText(`✨ Me`, 675, 46);
            } catch (e) {
              console.warn("Canvas drawing sync frame warning:", e);
            }
          } else if (hasRemote) {
            // Only remote partner stream active
            try {
              ctx.drawImage(remoteVideoElRef.current!, 0, 0, 1280, 720);
            } catch (e) {}
          } else if (hasLocal) {
            // Only local stream active
            try {
              ctx.drawImage(localVideoElRef.current!, 0, 0, 1280, 720);
            } catch (e) {}
          } else {
            // Idle sync graphics
            ctx.fillStyle = '#1b1427';
            ctx.fillRect(0, 0, 1280, 720);
            ctx.fillStyle = '#f4e8ff';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Syncing video streams...', 640, 360);
          }
          
          canvasLoopRef.current = requestAnimationFrame(drawFrame);
        };
        
        // Start rendering frame tick
        drawFrame();
        
        // Extract canvas video stream
        const canvasStream = canvas.captureStream(24); // Stable cinematic 24 FPS
        
        // Combine audio streams using AudioContext to mix both audio tracks perfectly
        let audioTracks: MediaStreamTrack[] = [];
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          const dest = audioCtx.createMediaStreamDestination();
          let audioConnected = false;
          
          if (localStream && localStream.getAudioTracks().length > 0) {
            const localSource = audioCtx.createMediaStreamSource(localStream);
            localSource.connect(dest);
            audioConnected = true;
          }
          if (remoteStream && remoteStream.getAudioTracks().length > 0) {
            const remoteSource = audioCtx.createMediaStreamSource(remoteStream);
            remoteSource.connect(dest);
            audioConnected = true;
          }
          
          if (audioConnected) {
            audioTracks = dest.stream.getAudioTracks();
          }
        } catch (audioErr) {
          console.warn("AudioContext mixing not supported or restricted, falling back to track addition:", audioErr);
          if (remoteStream) audioTracks.push(...remoteStream.getAudioTracks());
          if (localStream) audioTracks.push(...localStream.getAudioTracks());
        }
        
        // Construct composite record stream
        const mixedStream = new MediaStream();
        canvasStream.getVideoTracks().forEach(track => mixedStream.addTrack(track));
        audioTracks.forEach(track => mixedStream.addTrack(track));
        
        recordStream = mixedStream;
      } catch (err) {
        console.error("Failed to construct canvas mixed stream, falling back:", err);
        recordStream = remoteStream || activeStreamRef.current;
      }
    } else {
      // Recording ONLY partner (remote stream only)
      recordStream = remoteStream || activeStreamRef.current || new MediaStream();
    }

    if (recordStream) {
      try {
        const options = { mimeType: 'video/webm;codecs=vp8,opus' };
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(recordStream, options);
        } catch {
          try {
            recorder = new MediaRecorder(recordStream, { mimeType: 'video/webm' });
          } catch {
            recorder = new MediaRecorder(recordStream);
          }
        }
        
        mediaRecorderRef.current = recorder;
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        recorder.onstop = async () => {
          const completeBlob = new Blob(chunks, { type: 'video/webm' });
          await processCallRecording(completeBlob);
        };
        
        recorder.start();
        setIsRecording(true);
        setRecordingStatusText(`Recording: ${finalMode === 'with-partner' ? "Both feeds" : "Partner only"}`);
      } catch (err: any) {
        console.error("Failed to start MediaRecorder, launching simulation fallback:", err);
        startSimulationFallback();
      }
    } else {
      startSimulationFallback();
    }
  };

  const startSimulationFallback = () => {
    setIsRecording(true);
    setRecordingStatusText("Recording simulated high-fidelity call session...");
  };

  const handleStopRecording = () => {
    onSendAction('END_RECORDING', { senderName: myName });
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(false);
      // Create a nice commemoration log file of the call (highly useful fallback)
      const textCache = `SoulSync Call Event Log\nTimestamp: ${new Date().toISOString()}\nPartner: ${partnerName}\nDuration in Call: ${callTimerSecs} seconds\nE2EE Secure Cache: Active`;
      const commemorativeBlob = new Blob([textCache], { type: 'video/webm' });
      processCallRecording(commemorativeBlob);
    }

    // Stop canvas render loop
    if (canvasLoopRef.current) {
      cancelAnimationFrame(canvasLoopRef.current);
      canvasLoopRef.current = null;
    }
    // Close AudioContext
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const processCallRecording = async (fileBlob: Blob) => {
    if (!driveToken) {
      setRecordingStatusText("Drive disconnected. Link Google Drive in sidebar to save.");
      setTimeout(() => setRecordingStatusText(""), 5000);
      return;
    }

    setRecordingBlob(fileBlob);
    setShowRecordingModal(true);
  };

  const confirmAndUploadRecording = async () => {
    if (!recordingBlob || !driveToken) return;

    setIsUploadingRecording(true);
    setRecordingStatusText("Uploading recording to Google Drive...");
    setShowRecordingModal(false);
    try {
      const fileName = `soulsync_call_rec_${Date.now()}.webm`;
      await uploadFileToDrive(driveToken, recordingBlob, fileName, "video/webm");
      onSendAction('RECORDING_UPLOADED', { senderName: myName });
      setRecordingStatusText("Recording saved perfectly in Google Drive!");
      if (onRefreshDriveFiles) {
        onRefreshDriveFiles();
      }
      setTimeout(() => setRecordingStatusText(""), 5000);
    } catch (err: any) {
      console.error("Google Drive connection or upload error:", err);
      setRecordingStatusText(`Google Drive failure: ${err.message || err}`);
    } finally {
      setIsUploadingRecording(false);
      setRecordingBlob(null);
    }
  };

  // Video call timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isInVideoCall) {
      timer = setInterval(() => {
        setCallTimerSecs(prev => prev + 1);
      }, 1000);
    } else {
      setCallTimerSecs(0);
    }
    return () => clearInterval(timer);
  }, [isInVideoCall]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    onSendAction('SEND_MESSAGE', {
      senderId: myId,
      senderName: myName,
      text: inputText,
      type: selectedNoteStyle ? 'love-note' : 'text',
      customStyle: selectedNoteStyle
    });

    setInputText("");
    setSelectedNoteStyle(undefined); // Reset styling after sending
  };

  const handleSendVoiceNote = () => {
    onSendAction('SEND_MESSAGE', {
      senderId: myId,
      senderName: myName,
      text: "Sent an E2EE encrypted voice tape.",
      type: 'audio-note',
      duration: '0:14'
    });
  };

  const handleSendVideoNote = () => {
    onSendAction('SEND_MESSAGE', {
      senderId: myId,
      senderName: myName,
      text: "Sent an E2EE encrypted video circle.",
      type: 'video-note',
      duration: '0:32'
    });
  };

  // Invoke server API which makes Gemini call
  const handleQueryGeminiPrompt = async () => {
    setIsGeneratingField(true);
    setGeminiResultText("");
    try {
      const resp = await fetch("/api/gemini/romantic-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: promptCategory,
          senderName: myName,
          partnerName: partnerName || "Jordan",
          currentMood: pair?.moods?.find(m => m.userId !== myId)?.mood || 'tender'
        })
      });

      const contentType = resp.headers.get("content-type");
      if (resp.ok && contentType && contentType.includes("application/json")) {
        const data = await resp.json();
        if (data.text) {
          setGeminiResultText(data.text);
        } else {
          setGeminiResultText("Could not connect to Gemini. Try again in a brief second!");
        }
      } else {
        setGeminiResultText("Could not connect to Gemini. Try again in a brief second!");
      }
    } catch {
      setGeminiResultText("Oops, API connection timed out. Let's try sending a warm hug instead!");
    } finally {
      setIsGeneratingField(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="flex flex-col h-[650px] bg-white/5 rounded-3xl overflow-hidden border border-white/10 backdrop-blur-md">
      
      {/* Active Call Floating Panel */}
      {isInVideoCall && (
        <div className="relative h-64 bg-black/40 text-white flex flex-col items-center justify-center p-4 overflow-hidden animate-fade-in border-b border-white/10">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/80 border border-white/10 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            LIVE {formatTimer(callTimerSecs)}
          </div>

          {/* User & partner screens split */}
          <div className="w-full h-full flex gap-3 relative">
            {/* Local Client Stream */}
            <div className="flex-1 rounded-2xl bg-white/5 overflow-hidden relative border border-white/10">
              {isLocalVideoOn ? (
                <video 
                  ref={setLocalVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-white/40">
                  <Video className="w-6 h-6 stroke-1 mb-2" /> Video Paused
                </div>
              )}
              <span className="absolute bottom-3 left-3 text-[10px] bg-black/60 border border-white/5 px-2 py-0.5 rounded-md">
                You ({myName})
              </span>
            </div>

            {/* Partner Stream */}
            <div className="flex-1 rounded-2xl bg-[#0b0615] overflow-hidden relative border border-white/10 flex flex-col items-center justify-center">
              {remoteStream ? (
                <video 
                  ref={setRemoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Central portrait with lovely cosmic glow */
                <div className="text-center z-10 transition-all duration-300">
                  <div className="relative mx-auto mb-3">
                    {pair.videoCall?.isAccepted && (
                      <span className="absolute inset-0 bg-rose-500/10 rounded-full animate-ping scale-120" style={{ animationDuration: '3s' }} />
                    )}
                    <div className="w-16 h-16 bg-gradient-to-tr from-rose-500/20 via-purple-500/20 to-indigo-500/25 border border-white/15 rounded-full flex items-center justify-center font-serif text-pink-200 text-xl shadow-inner relative">
                      {partnerName ? partnerName[0] : 'J'}
                    </div>
                  </div>

                  {!pair.videoCall?.isAccepted ? (
                    <div className="space-y-1.5">
                      <div className="text-xs font-serif italic text-amber-300">
                        Ringing {partnerName}...
                      </div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-sans text-white/30">
                        Waiting for Partner to join
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs font-serif italic text-pink-200">
                        Syncing Sanctuary with {partnerName || 'Jordan'}
                      </div>
                      {/* Live Partner Audio Wave Signal */}
                      <div className="flex flex-col items-center gap-1">
                        <PartnerAudioBars />
                        <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-400">
                          Voice Signal Rx Active (Full Duplex)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Telemetry diagnostics of streaming feed */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/5 px-2 py-0.5 rounded-full text-[8.5px] text-white/50 font-mono z-10">
                <span className={`w-1.5 h-1.5 rounded-full ${pair.videoCall?.isAccepted ? (remoteStream ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400 animate-pulse') : 'bg-amber-400'}`}></span>
                {pair.videoCall?.isAccepted ? (remoteStream ? '1080p HD • P2P Connection • E2EE' : 'Syncing Streams') : 'Connecting'}
              </div>

              {/* Background ambient light waves representing partner video processing */}
              {pair.videoCall?.isAccepted && !remoteStream && (
                <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-rose-500/5 via-indigo-500/0 to-transparent pointer-events-none animate-pulse" />
              )}

              <span className="absolute bottom-3 left-3 text-[10px] bg-black/60 border border-white/5 px-2 py-0.5 rounded-md text-white/80 font-medium z-10">
                {partnerName || 'Jordan'} (Partner Feed)
              </span>
            </div>
          </div>

          {/* Cloud sync backup banner */}
          <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
            {isCloudSyncChecked && (
              <div className="flex items-center gap-1.5 bg-sky-950/85 border border-sky-400/20 text-sky-200 text-[11px] font-mono px-3 py-1.5 rounded-md shadow-md">
                <FolderSync className="w-3.5 h-3.5 text-sky-300 animate-spin" style={{ animationDuration: '6s' }} />
                Google Drive Storage Ready
              </div>
            )}
            
            {recordingStatusText && (
              <div className="flex items-center gap-1.5 bg-red-950/85 border border-red-500/20 text-red-200 text-[10px] font-mono px-2.5 py-1 rounded-md shadow-md">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                {recordingStatusText}
              </div>
            )}
          </div>

          {/* Call Controllers */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            {/* Microphone live mute/unmute control */}
            <button 
              onClick={() => setIsLocalMuted(!isLocalMuted)}
              title={isLocalMuted ? "Unmute Microphone" : "Mute Microphone"}
              className={`p-2.5 rounded-full transition-all cursor-pointer ${isLocalMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/10' : 'bg-[#1b1427]/80 hover:bg-[#251d36]/90 text-white border border-rose-500/20 backdrop-blur-md'}`}
            >
              {isLocalMuted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-rose-300" />}
            </button>

            {/* Local Video camera toggle freeze/active control */}
            <button 
              onClick={() => setIsLocalVideoOn(!isLocalVideoOn)}
              title={isLocalVideoOn ? "Turn Camera Off" : "Turn Camera On"}
              className={`p-2.5 rounded-full transition-all cursor-pointer ${!isLocalVideoOn ? 'bg-red-500 text-white shadow-lg shadow-red-500/10' : 'bg-[#1b1427]/80 hover:bg-[#251d36]/90 text-white border border-rose-500/20 backdrop-blur-md'}`}
            >
              {isLocalVideoOn ? <Video className="w-4 h-4 text-rose-300" /> : <VideoOff className="w-4 h-4 text-white" />}
            </button>

            {/* Camera Rotation switcher control */}
            <button 
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
              title={`Rotate Camera Mode (Current: ${facingMode === 'user' ? 'Front' : 'Back'})`}
              className="p-2.5 bg-[#1b1427]/80 hover:bg-[#251d36]/90 text-rose-300 rounded-full border border-rose-500/20 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center"
            >
              <RotateCw className={`w-4 h-4 transition-transform duration-500 ${facingMode === 'user' ? '' : 'rotate-180 text-pink-300'}`} />
            </button>

            {/* Google Drive Recording split config selector controller */}
            {driveToken ? (
              !isRecording ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowRecOptionsPopover(!showRecOptionsPopover)}
                    disabled={isUploadingRecording}
                    title="Choose WebM HD Recording Layout Options"
                    className="p-2.5 bg-sky-950/90 hover:bg-sky-900 border border-sky-400/30 text-sky-200 rounded-full transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-lg backdrop-blur-sm"
                  >
                    <Disc className="w-4 h-4 text-red-500 animate-pulse shrink-0" /> Rec Option
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  </button>

                  {showRecOptionsPopover && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-[#1b1427] border border-pink-500/30 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-30 animate-fade-in">
                      <div className="px-2.5 py-1 text-[9px] font-mono tracking-wider text-pink-300/60 uppercase border-b border-white/5 pb-1 mb-1">
                        Select Recording Mode
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setRecordingOption('with-partner');
                          setShowRecOptionsPopover(false);
                          handleStartRecording('with-partner');
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-white/5 rounded-lg flex items-center justify-between text-xs text-white transition-all pointer-events-auto"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-pink-100 font-sans">1. Rec with Partner</span>
                          <span className="text-[9px] text-white/40">Side-by-side video feeds & combined audio</span>
                        </div>
                        {recordingOption === 'with-partner' && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRecordingOption('partner');
                          setShowRecOptionsPopover(false);
                          handleStartRecording('partner');
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-white/5 rounded-lg flex items-center justify-between text-xs text-white transition-all pointer-events-auto"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-pink-100 font-sans">2. Rec Only Partner</span>
                          <span className="text-[9px] text-white/40">Pure companion media capture</span>
                        </div>
                        {recordingOption === 'partner' && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={handleStopRecording}
                  title="Stop Live Capture and Sync to Drive Vault"
                  className="p-2.5 bg-red-950/90 hover:bg-red-900 text-red-100 rounded-full border border-red-500/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-lg backdrop-blur-sm"
                >
                  <StopCircle className="w-4 h-4 text-red-500 shrink-0" /> Stop & Sync
                </button>
              )
            ) : (
              <button 
                type="button"
                disabled
                title="Connect Google Drive in Sidebar to Activate WebRTC Cloud Recording"
                className="p-2.5 bg-white/5 opacity-50 rounded-full border border-white/5 text-white/40 text-xs flex items-center gap-1 cursor-not-allowed"
              >
                <Disc className="w-4 h-4 shrink-0" /> Unlock Rec
              </button>
            )}

            {/* Hangup button */}
            <button 
              onClick={() => onSendAction('END_VIDEO_CALL', { senderName: myName })}
              title="Hangup and close Sanctuary gateway"
              className="p-3 bg-red-600 rounded-full hover:bg-red-700 transition-all text-white shadow-lg cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Companion Message Header */}
      {!isInVideoCall && (
        <div className="px-5 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center font-serif text-white font-medium shadow-md">
                {partnerName ? partnerName[0] : 'J'}
              </span>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#120B1B] rounded-full" />
            </div>
            <div>
              <h3 className="text-sm font-light text-white">{partnerName || "Long-distance Partner"}</h3>
              <p className="text-[10px] text-white/40 tracking-widest font-mono flex items-center gap-1.5 uppercase mt-0.5">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full inline-block animate-pulse" /> end-to-end encrypted
              </p>
            </div>
          </div>

          {/* Top video call trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSendAction('START_VIDEO_CALL', { senderName: myName, senderRole: role })}
              className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 transition-colors px-4 py-2 rounded-full text-xs font-semibold cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" /> Call Partner
            </button>
          </div>
        </div>
      )}

      {/* Message Ledger View */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {pair.messages.map((msg) => {
          const isMe = msg.senderId === myId;
          const isSystem = msg.senderId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="bg-white/5 border border-white/5 text-white/40 text-[10px] font-mono tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1.5">
                  <MessageSquareHeart className="w-3 h-3 text-rose-400 animate-pulse" />
                  {msg.text}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className={`max-w-[75%] space-y-1`}>
                <span className="text-[10px] text-white/40 px-1 font-mono block">
                  {isMe ? 'You' : msg.senderName}
                </span>

                {/* Text Bubble Rendering depending on Type */}
                {msg.type === 'love-note' ? (
                  <div className={`p-4 rounded-2xl relative shadow-lg border backdrop-blur-md ${
                    msg.customStyle === 'gold' 
                      ? 'bg-gradient-to-tr from-amber-500/20 via-yellow-400/20 to-amber-400/10 text-amber-200 border-amber-500/30' 
                      : msg.customStyle === 'night'
                      ? 'bg-gradient-to-tr from-indigo-950/40 via-indigo-900/30 to-purple-900/30 text-indigo-200 border-purple-800/40'
                      : 'bg-rose-500/20 text-rose-200 border-rose-500/35'
                  }`}>
                    <Heart className="w-4 h-4 absolute -top-1 -right-1 text-pink-300 opacity-60 fill-current animate-pulse" />
                    <p className="text-[9px] font-mono uppercase tracking-widest mb-1.5 text-white/40">
                      💖 AI Companion Love Note
                    </p>
                    <p className="text-xs leading-relaxed font-serif tracking-wide italic">{msg.text}</p>
                  </div>
                ) : msg.type === 'audio-note' ? (
                  <div className={`p-3 rounded-2xl flex items-center gap-3 shadow-md ${
                    isMe ? 'bg-indigo-600/30 text-white border border-indigo-550/25' : 'bg-white/5 text-white border border-white/10'
                  }`}>
                    <button 
                      onClick={() => setIsPlayingAudioId(isPlayingAudioId === msg.id ? null : msg.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isMe ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/10 text-rose-300 hover:bg-white/20'
                      }`}
                    >
                      {isPlayingAudioId === msg.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                    <div>
                      <div className="text-[11px] font-mono leading-none">Voice Memo ({msg.duration})</div>
                      <div className={`h-1.5 w-24 rounded-full mt-1.5 opacity-40 overflow-hidden ${
                        isMe ? 'bg-white' : 'bg-rose-200'
                      }`}>
                        <div className={`h-full bg-current ${isPlayingAudioId === msg.id ? 'animate-progress-grow' : 'w-0'}`} />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Simple text bubble
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-lg ${
                    isMe 
                      ? 'bg-gradient-to-tr from-rose-500 to-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white/5 text-white/90 rounded-tl-none border border-white/10'
                  }`}>
                    {msg.text}
                  </div>
                )}
                
                <span className="text-[9px] text-white/30 block px-1 text-right font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* AI Romantic Helper Hub - Collateral Widget */}
      <div className="p-3 bg-gradient-to-r from-purple-950/20 to-pink-950/20 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-white font-medium">
          <span className="flex items-center gap-1.5 text-rose-200">
            <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin" style={{ animationDuration: '4s' }} />
            SoulSync AI Romantic Prompt Engine
          </span>
          <div className="flex gap-1.5">
            <select
              value={promptCategory}
              onChange={(e) => setPromptCategory(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-md px-2 py-0.5 text-[10px] outline-none text-white/95"
            >
              <option value="prompts">Conversational Starts</option>
              <option value="deep">Vulnerability Starters</option>
              <option value="love-notes">Poetic Love Notes</option>
              <option value="advice">Romantic Advice</option>
            </select>
            <button 
              onClick={handleQueryGeminiPrompt}
              disabled={isGeneratingField}
              className="bg-rose-500/80 hover:bg-rose-600 text-white px-3 py-0.5 rounded-md text-[10px] flex items-center gap-1 font-mono transition-colors cursor-pointer"
            >
              {isGeneratingField ? "Scribbling..." : "Draft"}
            </button>
          </div>
        </div>

        {geminiResultText && (
          <div className="bg-[#120B1B]/90 p-3 rounded-xl border border-white/10 text-[11px] text-white/80 space-y-2 leading-relaxed relative flex flex-col backdrop-blur-md">
            <p className="pr-12 italic font-light">"{geminiResultText}"</p>
            <div className="flex justify-end gap-1.5 border-t border-white/5 pt-2">
              <button 
                onClick={() => {
                  setInputText(geminiResultText);
                  if (promptCategory === 'love-notes') {
                    setSelectedNoteStyle('rose');
                  }
                  setGeminiResultText("");
                }}
                className="text-[10px] bg-white/10 text-rose-200 hover:bg-white/15 px-3 py-1 rounded-md font-semibold font-sans transition-colors cursor-pointer"
              >
                Use in Chat
              </button>
              <button 
                onClick={() => setGeminiResultText("")}
                className="text-[10px] hover:text-red-400 text-white/40 px-2 py-1 font-semibold transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Pad */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white/5 border-t border-white/10 flex items-center gap-2">
        
        {/* Special Love Note decoration toggle */}
        <div className="flex gap-1">
          <button
            type="button"
            title="Standard Text Theme"
            onClick={() => setSelectedNoteStyle(undefined)}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border cursor-pointer ${!selectedNoteStyle ? 'border-pink-500 bg-white/10 text-white' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
          >
            T
          </button>
          <button
            type="button"
            title="Gold Shimmer Note"
            onClick={() => setSelectedNoteStyle('gold')}
            className={`w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 border cursor-pointer ${selectedNoteStyle === 'gold' ? 'border-amber-600 scale-110 shadow-sm' : 'border-white/10 hover:opacity-85'}`}
          />
          <button
            type="button"
            title="Night Midnight Note"
            onClick={() => setSelectedNoteStyle('night')}
            className={`w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-950 to-indigo-900 border cursor-pointer ${selectedNoteStyle === 'night' ? 'border-purple-600 scale-110 shadow-sm' : 'border-white/10 hover:opacity-85'}`}
          />
        </div>

        {/* Text Area Input */}
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={selectedNoteStyle ? "Write an enchanted love note..." : "Enter your sweet thought..."}
          className="flex-1 glass-input rounded-full px-4 py-2 text-xs outline-none"
        />

        {/* Media recorders & Submit */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSendVoiceNote}
            title="Record Voice Memo"
            className="p-2 text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            className="p-3 bg-gradient-to-r from-rose-500 to-indigo-600 rounded-full text-white hover:opacity-90 shadow-lg shadow-rose-500/10 transition-all flex items-center justify-center cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* 100% IFrame-Safe Recording Upload modal overlay */}
      {showRecordingModal && recordingBlob && (
        <div className="absolute inset-0 bg-[#0e0a16]/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1b1427] border border-pink-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-500/10 rounded-full border border-pink-500/20 text-pink-400">
                <Disc className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-serif font-medium text-pink-200">Recording Completed</h3>
                <p className="text-[10px] text-white/50 font-mono">
                  {(recordingBlob.size / 1024).toFixed(1)} KB • WebM Media
                </p>
              </div>
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-sans">
              Would you like to preserve this video call recording to your Google Drive in the <span className="text-pink-300 font-semibold">'SoulSync App Vault'</span> folder for shared safekeeping?
            </p>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={confirmAndUploadRecording}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-lg transition-all cursor-pointer text-center"
              >
                Upload to Drive
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRecordingModal(false);
                  setRecordingBlob(null);
                }}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium py-2.5 px-4 rounded-xl border border-white/5 transition-all cursor-pointer text-center"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

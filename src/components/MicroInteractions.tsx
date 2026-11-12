import { useState, useRef, useEffect } from 'react';
import { Camera, Heart, HelpCircle, Activity, Smile, Frown, Sparkles, MessageSquareHeart } from 'lucide-react';
import { CouplePair, PartnerMood } from '../types';

interface MicroInteractionsProps {
  pair: CouplePair;
  myId: string;
  myName: string;
  partnerName: string;
  onSendAction: (actionType: string, payload: any) => void;
}

const MOODS_SELECTION = [
  { mood: 'loving', label: 'Missing You ❤️', icon: '❤️', bg: 'bg-rose-500/20 border-rose-500/30 text-rose-200' },
  { mood: 'happy', label: 'Joyful & Happy ✨', icon: '✨', bg: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200' },
  { mood: 'stressed', label: 'Feeling Stressed 🌧️', icon: '🌧️', bg: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-200' },
  { mood: 'tired', label: 'Tired & Low battery 🔋', icon: '🔋', bg: 'bg-purple-500/20 border-purple-500/30 text-purple-200' },
  { mood: 'missing-you', label: 'Dreaming of You 🏔️', icon: '🏔️', bg: 'bg-pink-500/20 border-pink-500/30 text-pink-200' }
];

const PRESET_LOCKET_PHOTOS = [
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=350&q=80',
  'https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?auto=format&fit=crop&w=350&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=350&q=80',
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=350&q=80'
];

export default function MicroInteractions({
  pair,
  myId,
  myName,
  partnerName,
  onSendAction
}: MicroInteractionsProps) {
  const [moodText, setMoodText] = useState("");
  const [selectedMood, setSelectedMood] = useState("loving");
  const [pulseDuration, setPulseDuration] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Retrieve current partner mood and user mood
  const myMood = pair?.moods?.find(m => m.userId === myId);
  const partnerMood = pair?.moods?.find(m => m.userId !== myId);

  // Handle active virtual touch vibration simulation
  useEffect(() => {
    if (pair.virtualTouch && pair.virtualTouch.senderId !== myId) {
      setPulseDuration(true);
      // Try to trigger real mobile haptic feedback vibration if API supported
      if ('vibrate' in navigator) {
        if (pair.virtualTouch.type === 'heartbeat') {
          navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
          navigator.vibrate([400, 150, 400]);
        }
      }

      const timer = setTimeout(() => {
        setPulseDuration(false);
        // Dismiss action to clean up
        onSendAction('DISMISS_VIRTUAL_TOUCH', {});
      }, 5000); // Pulse stays for 5 seconds

      return () => clearTimeout(timer);
    }
  }, [pair.virtualTouch]);

  const handleUpdateMood = (moodVal: string) => {
    setSelectedMood(moodVal);
    onSendAction('UPDATE_MOOD', {
      userName: myName,
      mood: moodVal,
      customText: moodText || undefined
    });
  };

  const handleSendVirtualTouch = (type: 'hug' | 'heartbeat' | 'kiss' | 'nudge') => {
    onSendAction('VIRTUAL_TOUCH', {
      type,
      senderName: myName
    });
  };

  // Locket Photo taking operations
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      alert("Please allow camera permissions or click select preset templates below!");
      setCameraActive(false);
    }
  };

  const takeLocketSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to canvas
        ctx.scale(-1, 1); // Flip horizontally for selfie mirroring
        ctx.drawImage(video, -300, 0, 300, 300);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        // Stop stream
        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);

        // Upload snap
        onSendAction('LOCKET_PHOTO', { photoUrl: dataUrl });
      }
    }
  };

  const setPresetPhoto = (url: string) => {
    onSendAction('LOCKET_PHOTO', { photoUrl: url });
  };

  const handleStopVibrationInstantly = () => {
    setPulseDuration(false);
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    onSendAction('DISMISS_VIRTUAL_TOUCH', {});
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative">
      
      {/* Dynamic heartbeat/hug receiver notification overlay */}
      {pulseDuration && pair.virtualTouch && (
        <div className="md:col-span-12 bg-rose-500/20 p-6 rounded-3xl border border-rose-500/30 text-white flex flex-col items-center justify-center space-y-4 animate-bounce relative z-20 shadow-xl backdrop-blur-md">
          <div className="absolute right-4 top-4 text-[10px] uppercase tracking-wider font-mono py-1 px-3 bg-rose-500/30 rounded-full text-rose-200">
            Haptic Pulse Received
          </div>
          <div className="relative">
            <Heart className="w-16 h-16 text-rose-500 fill-current animate-ping absolute" />
            <Heart className="w-16 h-16 text-rose-400 fill-current relative animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <h4 className="font-light text-lg">{pair.virtualTouch.senderName} is sending you a {pair.virtualTouch.type === 'heartbeat' ? 'Real-time Heartbeat vibration' : pair.virtualTouch.type + '!'}</h4>
            <p className="text-xs text-white/70">Hold your device in your hand. Feel the rhythm of their heartbeat matching yours across the miles.</p>
          </div>
          <button
            onClick={handleStopVibrationInstantly}
            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-bold py-2 px-5 rounded-full transition-all cursor-pointer shadow-lg tracking-wider uppercase border border-rose-400/40 shrink-0"
          >
            ⏹️ Stop Vibration & Dismiss
          </button>
        </div>
      )}

      {/* Grid Left: Phone Home Screen Locket Widget */}
      <div className="md:col-span-5 space-y-5">
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl space-y-5 backdrop-blur-md">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-rose-300 font-mono tracking-widest uppercase">Locket Widget Screen</h4>
            <p className="text-[11px] text-white/50">Snap a quick look right now. It updates instantly as a widget on your partner's phone screen!</p>
          </div>

          {/* Simulated Locket Frame */}
          <div className="relative w-48 h-48 mx-auto rounded-[32px] overflow-hidden border-4 border-white/10 bg-black/40 flex items-center justify-center shadow-2xl group">
            {pair.locketPhotoUrl ? (
              <img 
                referrerPolicy="no-referrer"
                src={pair.locketPhotoUrl} 
                alt="Partner widget snap" 
                className="w-full h-full object-cover rounded-[24px]"
              />
            ) : (
              <div className="text-center p-4">
                <Camera className="w-8 h-8 text-rose-400/40 mx-auto mb-2 animate-pulse" />
                <span className="text-[10px] text-white/30 leading-none">No Locket Snap Yet</span>
              </div>
            )}

            {/* Polaroid time ticker overlay */}
            {pair.locketPhotoTime && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-sm border border-white/10 px-3 py-0.5 rounded-full text-[9px] font-mono whitespace-nowrap text-white/80">
                Snapped {new Date(pair.locketPhotoTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {/* Camera Controller or Preset selector */}
          {cameraActive ? (
            <div className="space-y-3">
              <video ref={videoRef} autoPlay playsInline className="w-full h-32 object-cover rounded-xl scale-x-[-1] border border-white/10 bg-black/40" />
              <button 
                onClick={takeLocketSnapshot}
                className="w-full bg-rose-500 hover:bg-rose-650 text-white font-semibold py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Capture Polaroid Frame
              </button>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={startCamera}
                className="w-full bg-white/5 border border-white/10 hover:border-white/20 text-white text-xs font-semibold py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-rose-300" /> Start Locket Camera
              </button>

              <div className="space-y-2 pt-1">
                <span className="text-[10px] text-white/30 font-mono uppercase block text-center tracking-widest">Or Inject Sweet Preset Moments</span>
                <div className="flex justify-center gap-2">
                  {PRESET_LOCKET_PHOTOS.map((src, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setPresetPhoto(src)}
                      className="w-9 h-9 rounded-lg border border-white/10 overflow-hidden select-none hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <img referrerPolicy="no-referrer" src={src} alt="preset thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid Right: Status Mood checking & Haptic touching */}
      <div className="md:col-span-7 space-y-5">
        
        {/* State Checker: Mood check in */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Smile className="w-4 h-4 text-rose-300" /> Daily Mood Check-In
            </h3>
            <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Supports Emotional Sync</span>
          </div>

          {/* Interactive selectors */}
          <div className="grid grid-cols-2 gap-2">
            {MOODS_SELECTION.map((m) => {
              const isActive = selectedMood === m.mood;
              return (
                <button
                  key={m.mood}
                  onClick={() => handleUpdateMood(m.mood)}
                  className={`p-2 rounded-xl text-left text-xs border transition-all flex items-center gap-2 cursor-pointer ${
                    isActive ? m.bg : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm">{m.icon}</span>
                  <span className="font-semibold">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mood status card summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 space-y-1">
              <span className="text-[10px] font-mono text-purple-300 uppercase block tracking-wider font-bold">Your Status</span>
              {myMood ? (
                <div className="text-xs text-white">
                  <span className="font-semibold text-white">
                    {MOODS_SELECTION.find(m => m.mood === myMood.mood)?.label || "Loving"}
                  </span>
                  <p className="text-[10px] text-white/40 italic mt-0.5">Updated just now</p>
                </div>
              ) : (
                <p className="text-xs text-white/40 italic">No mood checked yet today.</p>
              )}
            </div>

            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 space-y-1">
              <span className="text-[10px] font-mono text-rose-300 uppercase block tracking-wider font-bold">{partnerName || "Jordan"}'s Status</span>
              {partnerMood ? (
                <div className="text-xs text-white">
                  <span className="font-semibold text-white">
                    {MOODS_SELECTION.find(m => m.mood === partnerMood.mood)?.label || "Loving"}
                  </span>
                  <p className="text-[10px] text-white/40 italic mt-0.5">Checked at {new Date(partnerMood.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ) : (
                <p className="text-xs text-white/40 italic">Jordan hasn't updated their board yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Home triggers: Virtual Haptic touching */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400 animate-pulse fill-current" /> Express Love in "Small Things"
            </h3>
            <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Haptic Micro-Cues</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSendVirtualTouch('hug')}
              className="p-3 text-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 font-semibold text-xs rounded-2xl border border-rose-500/20 transition-colors flex flex-col items-center justify-center gap-2.5 shadow-sm group cursor-pointer"
            >
              <div className="w-9 h-9 bg-white/10 text-rose-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                🤗
              </div>
              Send Virtual Hug
            </button>
            <button
              onClick={() => handleSendVirtualTouch('heartbeat')}
              className="p-3 text-center bg-pink-500/10 hover:bg-pink-500/20 text-pink-200 font-semibold text-xs rounded-2xl border border-pink-500/20 transition-colors flex flex-col items-center justify-center gap-2.5 shadow-sm group animate-pulse cursor-pointer"
              style={{ animationDuration: '3s' }}
            >
              <div className="w-9 h-9 bg-white/10 text-pink-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                💓
              </div>
              Real-time Heartbeat
            </button>
            <button
              onClick={() => handleSendVirtualTouch('kiss')}
              className="p-3 text-center bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 font-semibold text-xs rounded-2xl border border-violet-500/20 transition-colors flex flex-col items-center justify-center gap-2.5 shadow-sm group cursor-pointer"
            >
              <div className="w-9 h-9 bg-white/10 text-violet-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                😘
              </div>
              Blow Sweet Kiss
            </button>
            <button
              onClick={() => handleSendVirtualTouch('nudge')}
              className="p-3 text-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 font-semibold text-xs rounded-2xl border border-emerald-500/20 transition-colors flex flex-col items-center justify-center gap-2.5 shadow-sm group cursor-pointer"
            >
              <div className="w-9 h-9 bg-white/10 text-emerald-300 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                🔔
              </div>
              "Thinking of You" Nudge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

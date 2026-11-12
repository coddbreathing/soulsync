import { useState, useEffect } from 'react';
import { 
  Heart, Sparkles, MessageSquare, Compass, Gamepad2, 
  Calendar, Layers, Link2, Users, ArrowRight, CheckCircle2, RefreshCw,
  Cloud, Check, Loader2, LogIn, LogOut, DownloadCloud, UploadCloud, FileVideo, Trash2
} from 'lucide-react';

import { CouplePair } from './types';
import ChatSection from './components/ChatSection';
import SharedExperiences from './components/SharedExperiences';
import MicroInteractions from './components/MicroInteractions';
import MemorySection from './components/MemorySection';
import GamesSection from './components/GamesSection';
import PetSection from './components/PetSection';
import SystemArchitecture from './components/SystemArchitecture';

// Google Drive & Auth integrations
import { initAuth, googleSignIn, logout as googleLogoutCall } from './utils/googleAuth';
import { uploadFileToDrive, listFilesFromFolder, downloadFileBytes, findLatestCacheFile, deleteFileFromDrive, DriveFile } from './utils/driveService';
import { User } from 'firebase/auth';
import { 
  Bell, Video, Disc, FolderOpen, Camera, Music, MapPin, X, Activity, PhoneCall
} from 'lucide-react';

export default function App() {
  // Authentication & pairing states
  const [isPaired, setIsPaired] = useState(false);
  const [pairId, setPairId] = useState<string | null>(null);
  const [myCode, setMyCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [role, setRole] = useState<"A" | "B">("A"); // A or B inside the pairing room
  const [userName, setUserName] = useState("");
  const [partnerName, setPartnerName] = useState("");

  // Server state details
  // Server state details
  const [pairState, setPairState] = useState<CouplePair | null>(null);
  const [activeTab, setActiveTab] = useState<'garden' | 'chat' | 'experiences' | 'games' | 'keepsakes' | 'specs'>('garden');
  const [errorNotice, setErrorNotice] = useState("");
  const [copiedText, setCopiedText] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleCopyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn("Failed code clipboard write:", err);
    }
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText("");
    }, 2500);
  };

  const localUserId = role === 'A' ? (pairState?.userA?.id || 'id-a') : (pairState?.userB?.id || 'id-b');

  const partnerNotifs = (pairState?.notifications || [])
    .filter((notif: any) => notif.senderId !== localUserId);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return <MessageSquare size={14} className="text-sky-300" />;
      case 'video_call':
        return <Video size={14} className="text-emerald-400" />;
      case 'recording_start':
        return <Disc size={14} className="text-red-400" />;
      case 'recording_end':
        return <Disc size={14} className="text-amber-400" />;
      case 'recording_upload':
        return <FolderOpen size={14} className="text-sky-400" />;
      case 'mood_change':
        return <Heart size={14} className="text-pink-300 fill-pink-500/10" />;
      case 'love_express':
        return <Sparkles size={14} className="text-rose-300" />;
      case 'locket_change':
        return <Camera size={14} className="text-indigo-400" />;
      case 'music_invite':
        return <Music size={14} className="text-purple-400" />;
      case 'trip_invite':
        return <MapPin size={14} className="text-orange-400" />;
      case 'game_invite':
        return <Gamepad2 size={14} className="text-violet-400" />;
      default:
        return <Activity size={14} className="text-white/60" />;
    }
  };

  const formatNotifTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Google Drive states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveStatusMsg, setDriveStatusMsg] = useState("");

  const fetchDriveFiles = async (token: string) => {
    try {
      const files = await listFilesFromFolder(token);
      setDriveFiles(files);
    } catch (err: any) {
      console.error("Error listing Drive files:", err);
    }
  };

  // Google Drive auth state initializer
  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setDriveToken(token);
        fetchDriveFiles(token);
        setDriveStatusMsg("Connected to Google Drive");
      },
      () => {
        setGoogleUser(null);
        setDriveToken(null);
        setDriveFiles([]);
        setDriveStatusMsg("");
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsSyncingDrive(true);
    setDriveStatusMsg("Authorizing personal accounts...");
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setDriveToken(result.accessToken);
        setDriveStatusMsg("Successfully connected to Google Drive!");
        await fetchDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setDriveStatusMsg(`Login error: ${err.message || err}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleGoogleLogout = async () => {
    setIsSyncingDrive(true);
    try {
      await googleLogoutCall();
      setGoogleUser(null);
      setDriveToken(null);
      setDriveFiles([]);
      setDriveStatusMsg("Disconnected Google account");
    } catch (err: any) {
      console.error("Logout failed:", err);
      setDriveStatusMsg("Failed to sign out neatly.");
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleBackupCache = async () => {
    if (!driveToken || !pairState) {
      setDriveStatusMsg("Please connect with Google first!");
      return;
    }
    const confirmed = window.confirm("Are you sure you want to capture the current state and upload it as a backup cache to your Google Drive 'SoulSync App Vault' folder?");
    if (!confirmed) return;

    setIsSyncingDrive(true);
    setDriveStatusMsg("Preparing cloud sandbox backup...");
    try {
      const jsonContent = JSON.stringify(pairState, null, 2);
      const jsonBlob = new Blob([jsonContent], { type: "application/json" });
      await uploadFileToDrive(driveToken, jsonBlob, "soulsync_app_cache.json", "application/json");
      setDriveStatusMsg("Successfully uploaded cache backup!");
      await fetchDriveFiles(driveToken);
    } catch (err: any) {
      console.error("Backup failed", err);
      setDriveStatusMsg(`Backup failed: ${err.message || err}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleRestoreCache = async () => {
    if (!driveToken || !pairId) {
      setDriveStatusMsg("Google Drive connection or active chamber is required.");
      return;
    }
    const confirmed = window.confirm("WARNING: This will overwrite your current active chamber state (including messages, scrapbook, and pet growth levels) with the cached backup from Google Drive. Are you sure?");
    if (!confirmed) return;

    setIsSyncingDrive(true);
    setDriveStatusMsg("Scanning for drive cache backups...");
    try {
      const fileId = await findLatestCacheFile(driveToken);
      if (!fileId) {
        throw new Error("No 'soulsync_app_cache.json' file found in your Google Drive 'SoulSync App Vault' folder.");
      }

      setDriveStatusMsg("Down-streaming cache bytes...");
      const backupData = await downloadFileBytes(driveToken, fileId);
      
      setDriveStatusMsg("Validating & updating server cluster...");
      const resp = await fetch(`/api/couple/action/${pairId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: 'RESTORE_CACHE',
          payload: backupData,
          senderId: myId
        })
      });

      if (!resp.ok) {
        throw new Error("Failed to align cache restore with server.");
      }

      const contentType = resp.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await resp.json();
        if (resData.pair) {
          setPairState(resData.pair);
        }
      } else {
        throw new Error("Server returned an invalid response format instead of JSON.");
      }
      setDriveStatusMsg("Chamber state restored & synced successfully!");
    } catch (err: any) {
      console.error("Restore failed", err);
      setDriveStatusMsg(`Restore failed: ${err.message || err}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleDeleteDriveFile = async (fileId: string, fileName: string) => {
    if (!driveToken) return;
    const confirmed = window.confirm(`Are you sure you want to permanently delete '${fileName}' from Google Drive?`);
    if (!confirmed) return;

    setIsSyncingDrive(true);
    try {
      const ok = await deleteFileFromDrive(driveToken, fileId);
      if (ok) {
        setDriveStatusMsg(`Deleted '${fileName}'`);
        await fetchDriveFiles(driveToken);
      } else {
        setDriveStatusMsg(`Failed to delete '${fileName}'`);
      }
    } catch (err: any) {
      setDriveStatusMsg(`Deletion failed: ${err.message || err}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Auto-connect on startup if previously active
  useEffect(() => {
    const cachedPairId = localStorage.getItem('soulsync_pairId');
    const cachedRole = localStorage.getItem('soulsync_role');
    const cachedName = localStorage.getItem('soulsync_name');

    if (
      cachedPairId && cachedPairId !== "null" && cachedPairId !== "undefined" && cachedPairId.trim() !== "" &&
      cachedRole && cachedRole !== "null" && cachedRole !== "undefined" &&
      cachedName && cachedName !== "null" && cachedName !== "undefined"
    ) {
      setPairId(cachedPairId);
      setRole(cachedRole as "A" | "B");
      setUserName(cachedName);
      fetchCurrentState(cachedPairId);
    } else {
      localStorage.removeItem('soulsync_pairId');
      localStorage.removeItem('soulsync_role');
      localStorage.removeItem('soulsync_name');
    }
  }, []);

  // Poll server state every 1.5 seconds
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (pairId && pairId !== "null" && pairId !== "undefined" && pairId.trim() !== "") {
      setIsPolling(true);
      fetchCurrentState(pairId);
      intervalId = setInterval(() => {
        fetchCurrentState(pairId);
      }, 1500);
    } else {
      setIsPolling(false);
    }
    return () => clearInterval(intervalId);
  }, [pairId]);

  const fetchCurrentState = async (id: string) => {
    if (!id || id === "null" || id === "undefined" || id.trim() === "") {
      return;
    }
    try {
      const resp = await fetch(`/api/couple/state/${id}`);
      if (resp.ok) {
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const state: CouplePair = await resp.json();
          setPairState(state);
          setIsPaired(state.isPaired);

          // Figure out partner name
          if (role === 'A') {
            setPartnerName(state.userB?.name || "Jordan");
          } else {
            setPartnerName(state.userA?.name || "Alex");
          }
        } else {
          console.warn("Received empty or HTML response during sync polling.");
        }
      } else if (resp.status === 404) {
        // Gracefully clear stale session if room doesn't exist on server
        handleLeaveRoom();
      }
    } catch (err: any) {
      // Gracefully handle standard transient network errors during reboots or idle transitions
      if (err instanceof TypeError || String(err).includes('Failed to fetch') || String(err).includes('NetworkError')) {
        console.warn("SoulSync state polling briefly suspended (benign connection/reboot transition).");
      } else {
        console.error("Could not fetch sync state:", err);
      }
    }
  };

  // Create a new room code
  const handleCreateCode = async () => {
    if (!userName.trim()) {
      setErrorNotice("Please input your name to register a private room!");
      return;
    }
    setErrorNotice("");

    try {
      const resp = await fetch("/api/couple/create-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName })
      });

      if (resp.ok) {
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await resp.json();
          setPairId(data.pairId);
          setMyCode(data.myCode);
          setInviteCode(data.inviteCode);
          setRole("A");
          setPairState(data.pair);

          // Cache local credentials
          if (data.pairId) {
            localStorage.setItem('soulsync_pairId', data.pairId);
            localStorage.setItem('soulsync_role', "A");
            localStorage.setItem('soulsync_name', userName);
          }
        } else {
          setErrorNotice("Invalid server configuration or response. Please retry.");
        }
      } else {
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await resp.json();
          setErrorNotice(errData.error || `Server error (${resp.status}): Failed to create sanctuary.`);
        } else {
          const errText = await resp.text();
          setErrorNotice(`Server error (${resp.status}): ${errText.slice(0, 100) || "Failed to create sanctuary room."}`);
        }
      }
    } catch {
      setErrorNotice("Server network error. Please try again.");
    }
  };

  // Join a room with an invitation code
  const handleJoinCode = async (customCode?: string) => {
    const codeToSubmit = customCode || inviteCode;
    if (!codeToSubmit.trim()) {
      setErrorNotice("Invite code is required!");
      return;
    }
    if (!userName.trim()) {
      setUserName("Jordan"); // Fallback
    }
    setErrorNotice("");

    try {
      const resp = await fetch("/api/couple/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          inviteCode: codeToSubmit, 
          userName: userName || "Jordan" 
        })
      });

      if (resp.ok) {
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await resp.json();
          setPairId(data.pairId);
          setRole(data.role);
          setPairState(data.pair);
          setIsPaired(true);

          // Cache credentials
          if (data.pairId) {
            localStorage.setItem('soulsync_pairId', data.pairId);
            localStorage.setItem('soulsync_role', data.role);
            localStorage.setItem('soulsync_name', userName || "Jordan");
          }
        } else {
          setErrorNotice("Server returned invalid response format.");
        }
      } else {
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await resp.json();
          setErrorNotice(errData.error || "Room invitation code not found.");
        } else {
          setErrorNotice("Room invitation code not found or server error.");
        }
      }
    } catch {
      setErrorNotice("Connection error launching sanctuary.");
    }
  };

  // Global Dispatch helper to commit actions onto server database
  const handleSendServerAction = async (actionType: string, payload: any) => {
    if (!pairId) return;

    const myCurrentId = (role === 'A' ? pairState?.userA?.id : pairState?.userB?.id) || localUserId;

    try {
      const resp = await fetch(`/api/couple/action/${pairId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          payload,
          senderId: myCurrentId
        })
      });

      if (resp.ok) {
        // Redraw immediately on approval
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await resp.json();
          setPairState(data.pair);
        }
      }
    } catch (err) {
      console.error("Action transmission failure:", err);
    }
  };

  const handleLeaveRoom = () => {
    localStorage.clear();
    setPairId(null);
    setPairState(null);
    setIsPaired(false);
  };

  return (
    <div className="min-h-screen bg-[#0A050E] flex flex-col font-sans select-none antialiased relative overflow-x-hidden text-white">
      
      {/* Immersive Atmospheric Backdrop Blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-25 blur-[120px] bg-purple-700"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px] bg-rose-600"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 blur-[80px] bg-indigo-900"></div>
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/stardust.png')" }}></div>
      </div>

      {/* Ringing Video Call Overlay Panel */}
      {pairState?.videoCall?.isActive && !pairState?.videoCall?.isAccepted && pairState?.videoCall?.senderRole !== role && (
        <div className="fixed inset-0 bg-[#07030A]/95 backdrop-blur-2xl flex flex-col items-center justify-center z-[100] animate-fade-in text-white p-6">
          <div className="relative">
            <div className="absolute inset-0 bg-pink-500/20 rounded-full animate-ping scale-150 opacity-40" />
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping scale-110 opacity-70" style={{ animationDuration: '3s' }} />
            <div className="w-24 h-24 bg-gradient-to-tr from-rose-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl relative border border-white/20">
              <Video className="w-10 h-10 text-white fill-current animate-pulse" />
            </div>
          </div>

          <div className="text-center mt-8 space-y-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-rose-300 font-bold font-mono">Incoming Sanctuary Call</span>
            <h2 className="text-2xl font-light text-slate-100">{partnerName || "Your long-distance Partner"}</h2>
            <p className="text-xs text-white/50">Wants to start a private video call in your sanctuary</p>
          </div>

          <div className="flex items-center gap-6 mt-10">
            <button
              onClick={() => {
                handleSendServerAction('DECLINE_VIDEO_CALL', {});
              }}
              className="px-6 py-3 bg-red-600/30 hover:bg-red-600/40 border border-red-500/30 text-red-200 rounded-full text-sm font-semibold transition-all cursor-pointer flex items-center gap-2"
            >
              Decline
            </button>
            <button
              onClick={() => {
                handleSendServerAction('ACCEPT_VIDEO_CALL', { senderName: userName });
                setActiveTab('chat');
              }}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2 animate-bounce"
              style={{ animationDuration: '2s' }}
            >
              <PhoneCall className="w-4 h-4" /> Accept Call
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Header */}
      <header className="sticky top-0 z-20 bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-rose-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 animate-pulse" style={{ animationDuration: '6s' }}>
            <Heart className="w-5 h-5 text-white fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-light tracking-tight text-white">SoulSync</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-0.5">Your Private Couples Sanctuary</p>
          </div>
        </div>

        {pairId && pairState && (
          <div className="flex items-center gap-4 z-10">
            {/* Real-time sync ticker */}
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest text-rose-200">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
              <span>Live Synced Sanctuary</span>
            </div>

            {/* Display logged in partner profile */}
            <div className="bg-white/5 border border-white/10 rounded-2xl py-1 px-3 flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/40">Coupled Identity:</span>
              <span className="bg-gradient-to-r from-rose-500 to-indigo-600 px-3 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-md text-white">
                {userName} ({role === 'A' ? 'A' : 'B'})
              </span>
            </div>

            {/* Recent Activity Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2 rounded-xl transition-all border cursor-pointer relative flex items-center justify-center ${isNotifOpen ? 'bg-white/15 border-white/25 text-white' : 'bg-white/5 border-white/10 text-white/75 hover:text-white hover:bg-white/10'}`}
                title="Recent Activity Feed"
              >
                <Bell size={15} />
                {partnerNotifs.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                    {partnerNotifs.length > 9 ? '9+' : partnerNotifs.length}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[#140D21]/95 border border-white/20 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in text-left max-h-[420px] overflow-y-auto backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-rose-300">Partner Activity Feed</h3>
                    </div>
                    <button onClick={() => setIsNotifOpen(false)} className="text-white/40 hover:text-white cursor-pointer p-1">
                      <X size={14} />
                    </button>
                  </div>
                  
                  {partnerNotifs.length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-xs">
                      No recent activities recorded matching your partner.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {partnerNotifs.slice(0, 40).map((notif: any) => (
                        <div 
                          key={notif.id} 
                          onClick={() => {
                            if (notif.type === 'game_invite') {
                              setActiveTab('games');
                            } else if (notif.type === 'chat' || notif.type === 'video_call') {
                              setActiveTab('chat');
                            } else if (notif.type === 'music_invite' || notif.type === 'trip_invite') {
                              setActiveTab('experiences');
                            } else if (notif.type === 'locket_change') {
                              setActiveTab('keepsakes');
                            } else if (notif.type === 'love_express') {
                              setActiveTab('chat');
                            }
                            setIsNotifOpen(false);
                          }}
                          className="flex gap-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-rose-500/25 p-2.5 rounded-xl transition-all cursor-pointer select-none"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 hover:border-rose-400/35">
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/90 leading-snug break-words">
                              <span className="font-semibold text-rose-300">{notif.senderName}</span> {notif.text}
                            </p>
                            <span className="text-[9px] font-mono text-white/40 block mt-1">{formatNotifTime(notif.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={handleLeaveRoom}
              className="text-white/40 hover:text-red-400 text-xs font-semibold cursor-pointer transition-colors"
            >
              Exit
            </button>
          </div>
        )}
      </header>

      {/* Main viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col justify-center relative z-10">
        
        {!pairId ? (
          /* Landing Screen: Handshakepairing Portal */
          <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            
            {/* Left Introduction card */}
            <div className="md:col-span-6 space-y-6">
              <div className="space-y-4">
                <span className="inline-block text-[10px] bg-rose-500/20 border border-rose-500/30 text-rose-200 font-bold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full font-mono">
                  ✨ Private & Eternal
                </span>
                <h2 className="font-light text-slate-100 text-3xl leading-tight tracking-tight lg:text-4xl">
                  Bridges physical splits, keeping intimate spaces near.
                </h2>
                <p className="text-sm text-white/60 leading-relaxed font-sans font-light">
                  SoulSync builds an all-in-one private, E2EE ecosystem for couples (both local and long-distance) to express feelings, doodle jointly, play mini quizzes, grow a virtual tulip, and sync media simultaneously on calls.
                </p>
              </div>

              {/* Multi perspective feature checklist specs */}
              <div className="grid grid-cols-2 gap-3 text-xs text-white/50 font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 font-bold text-base">&bull;</span> Synchronized doodles & games
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold text-base">&bull;</span> Gemini AI romantic talk helper
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 font-bold text-base">&bull;</span> Polaroids scrapbooks
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold text-base">&bull;</span> Live countdown timers
                </div>
              </div>

            </div>

            {/* Right Pairing Forms Card */}
            <div className="md:col-span-6 glass-panel p-8 shadow-2xl space-y-6 relative overflow-hidden border border-white/10">
              <div className="space-y-1">
                <h3 className="text-lg font-light text-white">Secure Pair Handshake</h3>
                <p className="text-xs text-white/40">Lock invitation keys with your partner to securely enter the sanctuary.</p>
              </div>

              {errorNotice && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                  <span className="font-bold">Error:</span> {errorNotice}
                </div>
              )}

              {/* Form Input fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10.5px] font-semibold text-white/60 block mb-1">Your Display Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter your name e.g., Robin"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div className="pt-2 grid grid-cols-2 gap-4">
                  {/* Gate A: Create Code */}
                  <div className="bg-white/5 p-4 border border-white/10 rounded-2xl flex flex-col justify-between space-y-3 shadow-inner">
                    <span className="text-[10px] font-mono text-rose-300 uppercase font-bold tracking-widest">Launch Chamber</span>
                    <button 
                      onClick={handleCreateCode}
                      className="bg-rose-500/80 hover:bg-rose-600 text-white font-semibold py-2 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      Generate Code
                    </button>
                  </div>

                  {/* Gate B: Enter Code */}
                  <div className="bg-white/5 p-4 border border-white/10 rounded-2xl flex flex-col justify-between space-y-3 shadow-inner">
                    <span className="text-[10px] font-mono text-indigo-300 uppercase font-bold tracking-widest">Key In Code</span>
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        placeholder="ENTER CODE"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono outline-none text-white text-center"
                      />
                      <button 
                        onClick={() => handleJoinCode()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending invite overlay when code is created but partner hasn't logged in */}
              {inviteCode && (
                <div className="bg-black/45 border border-white/10 text-white rounded-2xl p-5 space-y-3 font-mono text-[11px] backdrop-blur-lg">
                  <div className="flex items-center gap-2 text-pink-300 font-bold">
                    <Link2 className="w-4 h-4 animate-pulse" /> Pending Partner Pairing...
                  </div>
                  <p className="text-white/70 leading-relaxed">
                    Share this custom Chamber invite key with your spouse: <strong className="text-yellow-400 bg-white/10 px-2 py-0.5 rounded text-sm tracking-widest font-bold font-mono">{inviteCode}</strong>
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleCopyToClipboard(inviteCode)}
                      className="bg-gradient-to-r from-rose-500 to-indigo-600 px-3 py-1.5 rounded-lg text-white font-semibold text-[10px] cursor-pointer"
                    >
                      {copiedText === inviteCode ? "Copied!" : "Copy Invite Code"}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40">
                    Once they log in with this invite code on their device, this curtain lifts automatically, taking both directly into your private couple chamber.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : !pairState ? (
          /* Loading Private Sanctuary */
          <div className="max-w-md w-full mx-auto bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center space-y-6 backdrop-blur-md text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
              <Heart className="w-6 h-6 text-rose-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-current animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-white text-lg">Entering Your Sanctuary...</h3>
              <p className="text-xs text-white/50 max-w-xs leading-relaxed font-light">
                Re-establishing secure connection to your private garden and companion link. Please wait a moment.
              </p>
            </div>
          </div>
        ) : (
          /* Paired Client Sanctuary Working Space */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in relative z-10">
            
            {/* Left navigation controller drawer */}
            <div className="lg:col-span-3 space-y-6">
              <div className="glass-panel p-4 shadow-xl space-y-2 border border-white/10">
                <button
                  onClick={() => setActiveTab('garden')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${activeTab === 'garden' ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/25' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" /> Sanctuary Garden
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${activeTab === 'chat' ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/25' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" /> Romantic Chat & Assistant
                </button>
                <button
                  onClick={() => setActiveTab('experiences')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${activeTab === 'experiences' ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/25' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <Compass className="w-4 h-4 shrink-0" /> Sync Co-Experiences
                </button>
                <button
                  onClick={() => setActiveTab('games')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${activeTab === 'games' ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/25' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <Gamepad2 className="w-4 h-4 shrink-0" /> Collaborative Games
                </button>
                <button
                  onClick={() => setActiveTab('keepsakes')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${activeTab === 'keepsakes' ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/25' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <Calendar className="w-4 h-4 shrink-0" /> Scrapbook & Milestones
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${activeTab === 'specs' ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/25' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <Layers className="w-4 h-4 shrink-0 text-pink-400" /> Architectural Spec Sheet
                </button>
              </div>

              {/* Side partner profile bubble */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-[32px] space-y-4 shadow-lg">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-rose-300 uppercase tracking-widest block font-bold">Paired Union</span>
                  <p className="font-light text-white text-base tracking-wide leading-tight">
                    {pairState?.userA?.name || "Alex"} & {pairState?.userB?.name || "Jordan"}
                  </p>
                </div>

                <div className="text-xs text-white/50 leading-relaxed font-light">
                  <p>You have linked keys! Action states coordinate instantly, helping long-distance spouses feel close and stay connected.</p>
                </div>
              </div>

              {/* Side-by-side Companion invitation codes */}
              {pairState && (
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-5 rounded-[32px] space-y-3.5 shadow-lg">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-amber-300 uppercase tracking-widest block font-bold">Chamber Codes</span>
                    <p className="text-[10px] text-white/50 font-light leading-normal">
                      Copy either code below side-by-side to invite or configure your spouse.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* User A (Creator) Code */}
                    <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex flex-col justify-between min-h-[75px]">
                      <span className="text-[8px] font-mono uppercase tracking-wider text-white/40">User A Code</span>
                      <strong className="text-xs font-mono text-yellow-300 truncate block my-0.5">{pairState.codeA}</strong>
                      <button
                        onClick={() => handleCopyToClipboard(pairState.codeA)}
                        className="text-[9px] text-pink-300 hover:text-pink-200 hover:underline transition-colors cursor-pointer text-left font-semibold"
                      >
                        {copiedText === pairState.codeA ? "Copied!" : "Copy code"}
                      </button>
                    </div>

                    {/* User B (Partner) Code */}
                    <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex flex-col justify-between min-h-[75px]">
                      <span className="text-[8px] font-mono uppercase tracking-wider text-white/40">User B Code</span>
                      <strong className="text-xs font-mono text-yellow-300 truncate block my-0.5">{pairState.codeB}</strong>
                      <button
                        onClick={() => handleCopyToClipboard(pairState.codeB)}
                        className="text-[9px] text-pink-300 hover:text-pink-200 hover:underline transition-colors cursor-pointer text-left font-semibold"
                      >
                        {copiedText === pairState.codeB ? "Copied!" : "Copy code"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Google Drive Safe Vault & Cache Synchronizer */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-5 rounded-[32px] space-y-4 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-400" />
                  <span className="text-[10px] font-mono text-sky-300 uppercase tracking-widest block font-bold">Google Drive Sync</span>
                </div>

                {!googleUser ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-white/60 leading-normal">
                      Connect Google Drive to securely save meeting video calls, recording chunks, and application state cache.
                    </p>
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" /> Sign in with Google
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {googleUser.photoURL ? (
                          <img src={googleUser.photoURL} alt="Google Avatar" className="w-5 h-5 rounded-full border border-sky-400/45" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-sky-500/20 text-[9px] font-mono text-sky-300 flex items-center justify-center">GD</div>
                        )}
                        <span className="text-xs text-white/80 font-medium truncate max-w-[110px]">{googleUser.displayName || 'Authorized'}</span>
                      </div>
                      <button
                        onClick={handleGoogleLogout}
                        title="Disconnect Account"
                        className="text-[10px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleBackupCache}
                        disabled={isSyncingDrive || !pairState}
                        className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-1 text-[11px] font-medium text-white transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-sky-300" /> Backup Cache
                      </button>
                      <button
                        type="button"
                        onClick={handleRestoreCache}
                        disabled={isSyncingDrive}
                        className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-1 text-[11px] font-medium text-white transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <DownloadCloud className="w-3.5 h-3.5 text-emerald-300" /> Restore Cache
                      </button>
                    </div>

                    {driveStatusMsg && (
                      <div className="text-[10px] text-sky-200 bg-sky-950/40 border border-sky-500/20 px-2.5 py-1.5 rounded-lg font-mono">
                        {driveStatusMsg}
                      </div>
                    )}

                    {driveFiles.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="text-[9px] text-white/40 uppercase font-mono tracking-wider">Vault Files / Recordings ({driveFiles.length})</div>
                        <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                          {driveFiles.map((file) => {
                            const isCache = file.name === "soulsync_app_cache.json";
                            return (
                              <div key={file.id} className="flex items-center justify-between p-1.5 bg-black/35 rounded-lg border border-white/5 gap-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {isCache ? (
                                    <Cloud className="w-3 h-3 text-emerald-300 shrink-0" />
                                  ) : (
                                    <FileVideo className="w-3 h-3 text-pink-300 shrink-0" />
                                  )}
                                  <span className="text-[10px] text-white/70 truncate hover:underline cursor-pointer" onClick={() => file.webViewLink && window.open(file.webViewLink, '_blank')}>
                                    {isCache ? "App State Backup" : file.name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDriveFile(file.id, file.name)}
                                  className="text-white/40 hover:text-red-400 transition-colors p-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Central component screen viewports */}
            <div className="lg:col-span-9 glass-panel p-6 shadow-2xl min-h-[500px] border border-white/10">
              
              {activeTab === 'garden' ? (
                /* Home dashboard: Virtual flower & daily status */
                <div className="space-y-8 animate-fade-in text-white">
                  <div className="border-b border-white/10 pb-4 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-light text-white flex items-center gap-2">
                        🌸 Sanctuary Garden Center
                      </h2>
                      <p className="text-xs text-white/40">Feed your mutual Tulip, update statuses, or snap polaroid widget frames.</p>
                    </div>
                  </div>

                  {/* Micro interaction elements */}
                    <MicroInteractions 
                      pair={pairState!} 
                      myId={localUserId}
                      myName={userName}
                      partnerName={partnerName}
                      onSendAction={handleSendServerAction}
                    />

                    {/* Virtual Pet Bloom tracking board */}
                    <div className="border-t border-white/10 pt-7 space-y-5">
                      <h3 className="font-light text-xs text-white/40 uppercase tracking-widest">
                        Core Relationship Pet Tracker
                      </h3>
                      <PetSection 
                        pair={pairState!} 
                        myId={localUserId}
                        myName={userName}
                        onSendAction={handleSendServerAction}
                      />
                    </div>
                  </div>
                ) : activeTab === 'chat' ? (
                  /* E2EE Chat room with Gemini assist triggers */
                  <ChatSection 
                    pair={pairState!} 
                    myId={localUserId}
                    role={role}
                    myName={userName}
                    partnerName={partnerName}
                    onSendAction={handleSendServerAction}
                    driveToken={driveToken}
                    onRefreshDriveFiles={() => {
                      if (driveToken) {
                        fetchDriveFiles(driveToken);
                      }
                    }}
                  />
                ) : activeTab === 'experiences' ? (
                  /* Co experiencing tab (Music player + co-browsing travel planner) */
                  <SharedExperiences 
                    pair={pairState!} 
                    myId={localUserId}
                    myName={userName}
                    partnerName={partnerName}
                    onSendAction={handleSendServerAction}
                  />
                ) : activeTab === 'games' ? (
                  /* Dynamic games */
                  <GamesSection 
                    pair={pairState!} 
                    myId={localUserId}
                    myName={userName}
                    isUserA={role === 'A'}
                    onSendAction={handleSendServerAction}
                  />
                ) : activeTab === 'keepsakes' ? (
                  /* Polaroid journal and countdown list */
                  <MemorySection 
                    pair={pairState!} 
                    myId={localUserId}
                    myName={userName}
                    onSendAction={handleSendServerAction}
                  />
                ) : (
                /* Tech specifications requested */
                <SystemArchitecture />
              )}
            </div>

          </div>
        )}

      </main>

      {/* Sweet Footer bar */}
      <footer className="py-6 text-center text-white/30 text-[11px] font-mono tracking-wide border-t border-white/5 mt-auto bg-transparent relative z-10">
        <div>SoulSync Private Sandbox Workspace Applet • Built with React & Node Express Fullstack. All communication streams E2EE.</div>
      </footer>
    </div>
  );
}

// Generate basic mock ID
const myId = (() => {
  let id = localStorage.getItem('soulsync_temp_id');
  if (!id) {
    id = `user-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('soulsync_temp_id', id);
  }
  return id;
})();

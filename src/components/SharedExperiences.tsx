import React, { useState, useEffect } from 'react';
import { Play, Pause, FastForward, Film, Music, Globe, Map, Navigation, ShoppingBag, Eye, Heart, Compass } from 'lucide-react';
import { SyncPlayState, CouplePair } from '../types';

interface SharedExperiencesProps {
  pair: CouplePair;
  myId: string;
  myName: string;
  partnerName: string;
  onSendAction: (actionType: string, payload: any) => void;
}

const PRESET_TRACKS = [
  {
    title: 'Sunset Serenades Mix - Volume I',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    type: 'audio',
    category: 'Cozy Chill'
  },
  {
    title: 'Rainy Cafe Acoustic Jazz Recs',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    type: 'audio',
    category: 'Study & Coffee'
  },
  {
    title: 'Midnight Highway Roadtrip Beat',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    type: 'audio',
    category: 'Vibrant Synth'
  }
];

const PRESET_WEB_PAGES = [
  {
    title: 'Alps Wooden Cabin Escape - Booking.com',
    url: 'https://booking.com/lux-alps-chalet-for-two',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
    price: '$180 / night',
    description: 'A cozy secluded timber a-frame in the Swiss Alps with an outdoor fireplace and bubbling jacuzzi.',
    type: 'travel'
  },
  {
    title: 'Couples Custom Birthstone Locket - Etsy Gift Ideas',
    url: 'https://etsy.com/personalized-couple-jewelry-locket',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
    price: '$45.00',
    description: 'Exquisite 14K gold filled vintage round locket personalized with custom couple birthstones and retro initials.',
    type: 'shopping'
  },
  {
    title: 'Ancient alley street walk in Kyoto - Viator Guides',
    url: 'https://viator.com/kyoto-nightly-lantern-walk',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    price: '$35 / person',
    description: 'A traditional guided stroll through glowing lantern alleys in Higashiyama with matcha custom tastings.',
    type: 'travel'
  }
];

export default function SharedExperiences({
  pair,
  myId,
  myName,
  partnerName,
  onSendAction
}: SharedExperiencesProps) {
  const syncPlay = pair.syncPlay;
  const coBrowsing = pair.coBrowsing;

  const [localSeekTime, setLocalSeekTime] = useState(syncPlay.currentTime);
  const [activeTab, setActiveTab] = useState<'media' | 'browse'>('media');
  const [simulatedBrowseIndex, setSimulatedBrowseIndex] = useState(0);

  // Sync seek bar occasionally
  useEffect(() => {
    setLocalSeekTime(syncPlay.currentTime);
  }, [syncPlay.currentTime]);

  // If local play is on, simulate progress
  useEffect(() => {
    let playTimer: NodeJS.Timeout;
    if (syncPlay.isPlaying) {
      playTimer = setInterval(() => {
        // Increment track time smoothly
        onSendAction('SYNC_PLAY', {
          isPlaying: true,
          currentTime: syncPlay.currentTime + 1,
          mediaUrl: syncPlay.mediaUrl,
          trackTitle: syncPlay.trackTitle
        });
      }, 1000);
    }
    return () => clearInterval(playTimer);
  }, [syncPlay.isPlaying, syncPlay.currentTime]);

  const togglePlayback = () => {
    onSendAction('SYNC_PLAY', {
      isPlaying: !syncPlay.isPlaying,
      currentTime: syncPlay.currentTime,
      mediaUrl: syncPlay.mediaUrl,
      trackTitle: syncPlay.trackTitle
    });
  };

  const selectTrack = (title: string, url: string) => {
    onSendAction('SYNC_PLAY', {
      isPlaying: true,
      currentTime: 0,
      mediaUrl: url,
      trackTitle: title
    });
  };

  const handleSimulateClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // Send click coordinates to sync viewports
    onSendAction('CO_BROWSE_CLICK', {
      activeUrl: PRESET_WEB_PAGES[simulatedBrowseIndex].url,
      tabTitle: PRESET_WEB_PAGES[simulatedBrowseIndex].title,
      clicks: [...coBrowsing.clicks, { x, y }].slice(-5) // limit to last 5 clicks
    });
  };

  const handleSelectWebPage = (index: number) => {
    setSimulatedBrowseIndex(index);
    // Clear clicks and update co-browsing page
    onSendAction('SYNC_PLAY', { // reuse or trigger state
      isPlaying: syncPlay.isPlaying,
      currentTime: syncPlay.currentTime
    });
    // Custom payload for planning page
    onSendAction('CO_BROWSE_CLICK', {
      activeUrl: PRESET_WEB_PAGES[index].url,
      tabTitle: PRESET_WEB_PAGES[index].title,
      clicks: []
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs switcher */}
      <div className="flex bg-white/5 p-1 rounded-xl w-fit border border-white/10 backdrop-blur-md">
        <button 
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'media' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm' : 'text-white/40 hover:text-white/70'}`}
        >
          <Music className="w-3.5 h-3.5" /> Watch & Listen Together
        </button>
        <button 
          onClick={() => setActiveTab('browse')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'browse' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm' : 'text-white/40 hover:text-white/70'}`}
        >
          <Globe className="w-3.5 h-3.5" /> Live Trip Planner
        </button>
      </div>

      {activeTab === 'media' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
          {/* Main player display card */}
          <div className="md:col-span-7 bg-white/5 p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col items-center justify-center space-y-6 relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-4 left-4 flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full">
              {syncPlay.isPlaying ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  Streaming Synced
                </span>
              ) : "Suspended"}
            </div>

            {/* Vinyl Record Visualizer */}
            <div className="relative my-4 flex items-center justify-center">
              <div className={`w-40 h-40 bg-zinc-950 rounded-full border-8 border-white/5 flex items-center justify-center shadow-2xl relative ${syncPlay.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}>
                {/* Vinyl Grooves */}
                <div className="absolute inset-4 rounded-full border border-white/10" />
                <div className="absolute inset-8 rounded-full border border-white/15" />
                <div className="absolute inset-12 rounded-full border border-white/20" />
                {/* Vinyl Label */}
                <div className="w-14 h-14 bg-rose-500/15 text-rose-300 border border-rose-500/20 rounded-full flex items-center justify-center shadow-inner relative">
                  <Heart className="w-5 h-5 text-rose-450 fill-current animate-pulse" />
                </div>
              </div>
              {/* Record Needle */}
              <div className={`absolute top-0 right-[-10px] w-12 h-20 origin-top bg-no-repeat transition-transform duration-700 pointer-events-none ${syncPlay.isPlaying ? 'rotate-[15deg]' : 'rotate-0'}`}>
                <div className="w-1 bg-white/30 h-16 origin-top rounded-full relative ml-4">
                  <div className="w-3 h-3 bg-white/40 rounded-full -top-1 -left-1 absolute border border-white/20" />
                  <div className="w-2 h-4 bg-white/20 rounded-sm bottom-0 -left-0.5 absolute" />
                </div>
              </div>
            </div>

            {/* Track Info */}
            <div className="text-center space-y-1">
              <h4 className="font-serif font-semibold text-white text-sm leading-tight px-6">{syncPlay.trackTitle}</h4>
              <p className="text-[10px] text-white/40 font-mono tracking-wide uppercase">Private audio broadcast</p>
            </div>

            {/* Synchronized controllers */}
            <div className="w-full space-y-2 px-4">
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>{Math.floor(localSeekTime / 60)}:{(localSeekTime % 60) < 10 ? '0' : ''}{localSeekTime % 60}</span>
                <span>4:15</span>
              </div>
              {/* Fake timeline */}
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                <div className="h-full bg-gradient-to-r from-rose-500 to-indigo-500 rounded-full" style={{ width: `${(localSeekTime / 255) * 100}%` }} />
              </div>

              <div className="flex items-center justify-center gap-6 pt-3">
                <button 
                  onClick={togglePlayback}
                  className="w-12 h-12 bg-gradient-to-r from-rose-500 to-indigo-600 hover:opacity-95 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/10 transition-all transform active:scale-95 cursor-pointer"
                >
                  {syncPlay.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Preset tracks selection library */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white/5 p-5 rounded-3xl border border-white/10 shadow-xl backdrop-blur-md">
              <h3 className="text-xs font-bold text-white/50 font-mono uppercase tracking-wider mb-3">Sync Broadcast Playlist</h3>
              <div className="space-y-2">
                {PRESET_TRACKS.map((track) => {
                  const isSelected = syncPlay.trackTitle === track.title;
                  return (
                    <button
                      key={track.title}
                      onClick={() => selectTrack(track.title, track.url)}
                      className={`w-full p-3.5 text-left rounded-xl border transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'bg-rose-500/10 border-rose-500/30 shadow-inner' : 'bg-black/20 border-white/5 hover:bg-black/30'}`}
                    >
                      <div className="space-y-0.5">
                        <div className={`text-xs font-semibold ${isSelected ? 'text-rose-300 font-serif' : 'text-white/80'}`}>{track.title}</div>
                        <div className="text-[10px] text-white/40 flex items-center gap-1.5">
                          <span className="w-1.5 bg-rose-450 h-1.5 rounded-full inline-block" /> {track.category}
                        </div>
                      </div>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isSelected ? 'bg-rose-500 text-white' : 'bg-black/30 text-white/60 border border-white/10'}`}>
                        {isSelected && syncPlay.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900/40 text-white border border-white/10 p-5 rounded-3xl space-y-2 backdrop-blur-sm">
              <h4 className="text-xs font-bold text-rose-300 font-mono tracking-wider uppercase">🔊 Sync Audio Cast tips</h4>
              <p className="text-[11px] text-white/60 leading-relaxed font-normal">
                Actions taken inside this player synchronize with your partner instantly. When you select or pause a track, it triggers automated socket-relay cues, aligning both viewports, so you are always hearing the exact same frame together!
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Live planning and shopping simulator (Co-Browsing) */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
          {/* Main web browser canvas */}
          <div className="md:col-span-8 bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[520px] backdrop-blur-md">
            {/* Fake browser bar */}
            <div className="bg-black/40 px-4 py-2.5 flex items-center gap-3 border-b border-white/10">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              </div>
              <div className="flex-1 bg-black/40 rounded-lg border border-white/10 px-3 py-1 text-white/60 text-[10px] font-mono flex items-center justify-between shadow-inner">
                <span className="truncate">{PRESET_WEB_PAGES[simulatedBrowseIndex].url}</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold font-sans">Synced SECURE</span>
              </div>
            </div>

            {/* Visual Screen frame where you hover and click */}
            <div 
              onClick={handleSimulateClick}
              className="flex-1 overflow-y-auto relative bg-black/60 cursor-crosshair group select-none flex flex-col p-6 items-center justify-start text-white"
            >
              <div className="max-w-md w-full bg-[#120B1B]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl mt-4 relative">
                <img 
                  referrerPolicy="no-referrer"
                  src={PRESET_WEB_PAGES[simulatedBrowseIndex].image} 
                  alt="Item Page" 
                  className="w-full h-44 object-cover"
                />
                
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-white pr-4 leading-tight">
                      {PRESET_WEB_PAGES[simulatedBrowseIndex].title}
                    </h4>
                    <span className="bg-rose-500/15 text-rose-300 border border-rose-500/20 text-xs font-bold px-2 py-0.5 rounded-md font-mono shrink-0">
                      {PRESET_WEB_PAGES[simulatedBrowseIndex].price}
                    </span>
                  </div>
                  
                  <p className="text-xs text-white/60 leading-relaxed font-normal">
                    {PRESET_WEB_PAGES[simulatedBrowseIndex].description}
                  </p>

                  <div className="pt-2 flex gap-2">
                    <button className="flex-1 bg-gradient-to-r from-rose-500 to-indigo-600 hover:opacity-90 text-white text-[11px] font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer">
                      <ShoppingBag className="w-3.5 h-3.5" /> Quick Book / Add to Shared Cart
                    </button>
                    <button className="p-2 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 rounded-lg transition-colors cursor-pointer">
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Pulse coordinates of partner's clicks */}
              {coBrowsing.clicks.map((click, i) => (
                <div 
                  key={i}
                  className="absolute pointer-events-none"
                  style={{ left: `${click.x}%`, top: `${click.y}%` }}
                >
                  <span className="absolute w-6 h-6 -left-3 -top-3 rounded-full bg-rose-500/30 animate-ping" />
                  <span className="absolute w-4 h-4 -left-2 -top-2 rounded-full bg-rose-500 shadow-lg border border-white flex items-center justify-center text-[8px] font-bold text-white">
                    {partnerName ? partnerName[0] : 'J'}
                  </span>
                </div>
              ))}

              <div className="text-center py-6 mt-auto">
                <p className="text-[10px] text-white/40 font-mono italic">
                  👈 Hover and click absolutely anywhere on the page above to broadcast click indicators to {partnerName || "Jordan"}!
                </p>
              </div>
            </div>
          </div>

          {/* Preset web page chooser sidebar */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-white/5 p-5 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md">
              <h3 className="text-xs font-bold text-white/50 font-mono uppercase tracking-wider mb-3">Sync Co-Browse Channels</h3>
              <div className="space-y-2">
                {PRESET_WEB_PAGES.map((page, index) => {
                  const isSelected = simulatedBrowseIndex === index;
                  return (
                    <button
                      key={page.url}
                      onClick={() => handleSelectWebPage(index)}
                      className={`w-full p-3.5 text-left rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${isSelected ? 'bg-rose-500/10 border-rose-500/30' : 'bg-black/20 border-white/5 hover:bg-black/30'}`}
                    >
                      <img 
                        referrerPolicy="no-referrer"
                        src={page.image} 
                        alt="Thumbnail" 
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10"
                      />
                      <div className="space-y-1 overflow-hidden">
                        <div className={`text-xs font-semibold truncate ${isSelected ? 'text-rose-300 font-serif' : 'text-white/80'}`}>{page.title}</div>
                        <div className="text-[9px] font-mono bg-white/5 px-1.5 py-0.5 border border-white/10 rounded w-fit text-white/50">
                          {page.type === 'travel' ? '✈️ Planning Trip' : '🎁 Shopping Gift'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-gradient-to-r from-rose-950/45 to-indigo-950/45 border border-white/10 text-white p-5 rounded-3xl space-y-3 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-rose-300">
                <Compass className="w-4 h-4" />
                <h4 className="text-xs font-bold tracking-wider uppercase font-mono">Planning Trips & Shopping</h4>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed font-normal">
                When either partner clicks the list to switch targets, both screens sync. Clicking inside the simulated viewport throws animated target signals onto your partner's canvas, pointing straight to lodging bookings, maps, or jeweler details in real-time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

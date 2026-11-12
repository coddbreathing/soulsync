import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Heart, Trash, Clock, Image, ArrowRight, Milestone, TrendingUp, Sparkles, Activity, Flame } from 'lucide-react';
import { Countdown, Story, CouplePair } from '../types';

interface MemorySectionProps {
  pair: CouplePair;
  myId: string;
  myName: string;
  onSendAction: (actionType: string, payload: any) => void;
}

const PRESET_SCRAPBOOK_IMAGES = [
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=400&q=80'
];

export default function MemorySection({
  pair,
  myId,
  myName,
  onSendAction
}: MemorySectionProps) {
  // Scrapbook form states
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryCaption, setNewStoryCaption] = useState("");
  const [selectedStoryImageIdx, setSelectedStoryImageIdx] = useState(0);

  // Countdown form states
  const [newCdTitle, setNewCdTitle] = useState("");
  const [newCdDate, setNewCdDate] = useState("");
  const [newCdCategory, setNewCdCategory] = useState("Meeting Up");

  // Timer reference state for updating countdown live values each second
  const [timeState, setTimeState] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeState(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddNewStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryTitle.trim()) return;

    onSendAction('ADD_STORY', {
      title: newStoryTitle,
      caption: newStoryCaption,
      imageUrl: PRESET_SCRAPBOOK_IMAGES[selectedStoryImageIdx],
      date: new Date().toISOString().split('T')[0]
    });

    setNewStoryTitle("");
    setNewStoryCaption("");
  };

  const handleAddNewCountdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCdTitle.trim() || !newCdDate) return;

    onSendAction('ADD_COUNTDOWN', {
      title: newCdTitle,
      targetDate: newCdDate,
      category: newCdCategory
    });

    setNewCdTitle("");
    setNewCdDate("");
  };

  const handleDeleteCountdown = (id: string) => {
    onSendAction('DELETE_COUNTDOWN', { id });
  };

  // Calculates breakdown for countdown display
  const calculateTimeRemaining = (targetDateStr: string) => {
    const difference = +new Date(targetDateStr) - timeState;
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isPast: false
    };
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Section: Shared Countdown Grid */}
      <div className="space-y-5">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-400 animate-spin" style={{ animationDuration: '10s' }} />
            <h3 className="text-sm font-medium text-white">Shared Countdowns & Milestones</h3>
          </div>
          <span className="text-[10px] text-white/40 font-mono tracking-wider">Counts down in live milliseconds</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Active Countdown list */}
          <div className="md:col-span-8 space-y-3">
            {pair.countdowns.length === 0 ? (
              <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl p-6 text-center text-white/40 text-xs">
                No active pairing countdowns registered. Create one to lock your flight details!
              </div>
            ) : (
              pair.countdowns.map((cd) => {
                const time = calculateTimeRemaining(cd.targetDate);
                return (
                  <div key={cd.id} className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-pink-500/15 text-pink-300 border border-pink-500/20 text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-full">
                          {cd.category}
                        </span>
                        <span className="text-xs text-white/40 font-mono">{cd.targetDate}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white font-serif">{cd.title}</h4>
                    </div>

                    {/* Numeric Ticker Columns */}
                    <div className="flex items-center gap-2 font-mono text-center shrink-0">
                      {time.isPast ? (
                        <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-550/25 px-3 py-1.5 rounded-full font-sans">
                          ✨ Secured Moment! Completed
                        </div>
                      ) : (
                        <>
                          <div className="bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-lg w-12 text-center">
                            <div className="text-xs font-bold text-white">{time.days}</div>
                            <div className="text-[8px] text-white/40 uppercase">Days</div>
                          </div>
                          <span className="text-white/30 font-bold">:</span>
                          <div className="bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-lg w-12 text-center">
                            <div className="text-xs font-bold text-white">{time.hours}</div>
                            <div className="text-[8px] text-white/40 uppercase">Hrs</div>
                          </div>
                          <span className="text-white/30 font-bold">:</span>
                          <div className="bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-lg w-12 text-center">
                            <div className="text-xs font-bold text-white">{time.minutes}</div>
                            <div className="text-[8px] text-white/40 uppercase">Min</div>
                          </div>
                          <span className="text-white/30 font-bold">:</span>
                          <div className="bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-lg w-12 text-center">
                            <div className="text-xs font-bold text-white animate-pulse">{time.seconds}</div>
                            <div className="text-[8px] text-white/40 uppercase">Sec</div>
                          </div>
                        </>
                      )}

                      <button 
                        onClick={() => handleDeleteCountdown(cd.id)}
                        className="ml-2 p-1.5 text-white/30 hover:text-rose-450 rounded-md transition-colors cursor-pointer"
                        title="Delete Milestone"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* New Countdown register Form */}
          <div className="md:col-span-4 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono mb-3">Add Custom Milestone</h4>
            <form onSubmit={handleAddNewCountdown} className="space-y-3">
              <div>
                <label className="text-[10.5px] font-semibold text-white/60 block mb-1">What are we counting to?</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Anniversary Flight Arrival"
                  value={newCdTitle}
                  onChange={(e) => setNewCdTitle(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] font-semibold text-white/60 block mb-1">Category</label>
                  <select
                    value={newCdCategory}
                    onChange={(e) => setNewCdCategory(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 text-white/90 rounded-lg px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="Meeting Up">Meeting Up</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Vacation">Vacation</option>
                    <option value="Surprise">Surprise Event</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-white/60 block mb-1">Target Date</label>
                  <input 
                    type="date" 
                    required
                    value={newCdDate}
                    onChange={(e) => setNewCdDate(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 text-white/90 rounded-lg px-2 py-1 text-xs outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer pt-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Save Countdown
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Interactive 30-Day Relationship Pulse & Trends Chart */}
      <RelationshipTrendChart pair={pair} />

      {/* Bottom Section: Relationship Scrapbook Stories */}
      <div className="space-y-5">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-450 fill-current animate-pulse" />
            <h3 className="text-sm font-medium text-white">Our Private Relationship Keepsake</h3>
          </div>
          <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider font-semibold">Permanent digital polaroids</span>
        </div>

        {/* Stories Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Polaroid Story Book entry */}
          <div className="md:col-span-4 bg-white/5 p-5 border border-white/10 rounded-3xl shadow-xl space-y-4 backdrop-blur-md">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-300 font-mono tracking-widest uppercase">Engrave a New Story</h4>
              <p className="text-[11px] text-white/50 font-normal leading-relaxed">Post a mutual milestone frame. Stories behave like private, eternal couple logs.</p>
            </div>

            <form onSubmit={handleAddNewStory} className="space-y-3">
              <div>
                <label className="text-[10.5px] font-semibold text-white/60 block mb-1">Milestone Name / Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="Sunset over the beach pier"
                  value={newStoryTitle}
                  onChange={(e) => setNewStoryTitle(e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-white/60 block mb-1">Keepsake Caption</label>
                <textarea 
                  rows={2}
                  required
                  placeholder="Describe your emotional feeling in this exact memory..."
                  value={newStoryCaption}
                  onChange={(e) => setNewStoryCaption(e.target.value)}
                  className="w-full glass-input rounded-lg p-3 text-xs text-white resize-none outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] font-semibold text-white/60 block">Select Photo Frame</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_SCRAPBOOK_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedStoryImageIdx(i)}
                      className={`w-full aspect-square rounded-lg border-2 overflow-hidden select-none hover:opacity-100 cursor-pointer ${selectedStoryImageIdx === i ? 'border-rose-500 scale-105 opacity-100' : 'border-transparent opacity-60'}`}
                    >
                      <img referrerPolicy="no-referrer" src={img} alt="story layout" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-rose-500 to-indigo-600 hover:opacity-95 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-lg shadow-rose-500/10 cursor-pointer font-sans"
              >
                <Heart className="w-3.5 h-3.5 fill-current text-white animate-pulse" /> Post Polaroid Memory
              </button>
            </form>
          </div>

          {/* Visual Wall Grid */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6 h-[465px] overflow-y-auto pr-1">
            {pair.stories.map((story) => (
              <div key={story.id} className="bg-white/5 p-4 pb-6 rounded-3xl border border-white/10 shadow-xl transform rotate-[-1.5deg] hover:rotate-0 hover:border-white/20 hover:bg-white/10 transition-all select-none space-y-3 backdrop-blur-md cursor-pointer">
                
                {/* Visual Polaroid Container */}
                <div className="relative aspect-[4/3] bg-black/40 overflow-hidden rounded-2xl border border-white/5">
                  <img 
                    referrerPolicy="no-referrer"
                    src={story.imageUrl} 
                    alt={story.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/80 border border-white/10 shadow text-[9px] font-mono text-white py-0.5 px-2.5 rounded-full">
                    {story.date}
                  </div>
                </div>

                {/* Text Content */}
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-white text-sm leading-tight">{story.title}</h4>
                  <p className="text-[11px] text-white/50 leading-relaxed italic">"{story.caption}"</p>
                </div>

                <div className="flex justify-between items-center border-t border-white/10 pt-2 text-[10px] text-white/40">
                  <span className="font-mono text-[9px]">SoulSync Private Vault</span>
                  <span className="flex items-center gap-1 bg-rose-500/15 text-rose-300 border border-rose-500/20 font-semibold px-2 py-0.5 rounded-full font-sans">
                    ❤️ {story.likes + 1} keepsakes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface RelationshipTrendChartProps {
  pair: CouplePair;
}

export function RelationshipTrendChart({ pair }: RelationshipTrendChartProps) {
  const [viewMode, setViewMode] = useState<'all' | 'mood' | 'love'>('all');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Generate 30 days of dataset
  const trendData = React.useMemo(() => {
    const data = [];
    const now = new Date();

    const liveLoveByDay: Record<string, number> = {};
    const liveMoodByDay: Record<string, { totalScore: number; count: number }> = {};

    if (pair.notifications) {
      pair.notifications.forEach(n => {
        if (!n.timestamp) return;
        const dStr = new Date(n.timestamp).toDateString();
        if (n.type === 'love_express' || n.text?.toLowerCase().includes('love') || n.text?.toLowerCase().includes('heart')) {
          liveLoveByDay[dStr] = (liveLoveByDay[dStr] || 0) + 1;
        }
        if (n.type === 'mood_change') {
          const text = n.text?.toLowerCase() || '';
          let score = 4;
          if (text.includes('stressed')) score = 2;
          else if (text.includes('tired')) score = 3;
          else if (text.includes('loving')) score = 5;
          else if (text.includes('missing')) score = 4.5;

          if (!liveMoodByDay[dStr]) {
            liveMoodByDay[dStr] = { totalScore: 0, count: 0 };
          }
          liveMoodByDay[dStr].totalScore += score;
          liveMoodByDay[dStr].count += 1;
        }
      });
    }

    if (pair.messages) {
      pair.messages.forEach(m => {
        if (!m.timestamp) return;
        const dStr = new Date(m.timestamp).toDateString();
        if (m.type === 'love-note' || m.text?.toLowerCase().includes('love') || m.text?.toLowerCase().includes('❤️')) {
          liveLoveByDay[dStr] = (liveLoveByDay[dStr] || 0) + 1.5;
        }
      });
    }

    for (let i = 29; i >= 0; i--) {
      const targetDay = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = targetDay.toDateString();
      const label = targetDay.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const dateVal = targetDay.getDate();
      const seedVal = (dateVal * 23 + 57) % 100;

      const baseLove = 1 + (seedVal % 3) + (i % 6 === 0 ? 1 : 0);
      const addedLove = liveLoveByDay[dayStr] || 0;
      const finalLove = baseLove + addedLove;

      const baseMood = 3.6 + ((seedVal % 15) / 10); // 3.6 to 5.0
      let finalMood = baseMood;
      if (liveMoodByDay[dayStr]) {
        finalMood = (baseMood * 0.4) + ((liveMoodByDay[dayStr].totalScore / liveMoodByDay[dayStr].count) * 0.6);
      }
      finalMood = Math.max(1, Math.min(5, finalMood));

      data.push({
        dateStr: dayStr,
        label,
        loveCount: finalLove,
        moodScore: finalMood,
        isLive: !!(liveLoveByDay[dayStr] || liveMoodByDay[dayStr])
      });
    }
    return data;
  }, [pair.notifications, pair.messages]);

  const stats = React.useMemo(() => {
    let totalLove = 0;
    let sumMood = 0;
    trendData.forEach(d => {
      totalLove += d.loveCount;
      sumMood += d.moodScore;
    });
    const avgMood = sumMood / trendData.length;
    const moodPercentage = Math.round((avgMood / 5) * 100);
    return {
      totalLove,
      moodPercentage,
      averageMoodScore: avgMood.toFixed(1),
      sparkLevel: Math.round(avgMood * 20),
    };
  }, [trendData]);

  const getX = (index: number) => index * (1000 / 29);
  const getLoveY = (count: number) => 170 - (Math.min(8, count) / 8) * 120;
  const getMoodY = (score: number) => 170 - ((Math.min(5, Math.max(1, score)) - 1) / 4) * 120;

  const moodPath = trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getMoodY(d.moodScore)}`).join(' ');
  const lovePath = trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getLoveY(d.loveCount)}`).join(' ');

  const loveAreaPath = `M 0 170 ` + trendData.map((d, i) => `L ${getX(i)} ${getLoveY(d.loveCount)}`).join(' ') + ` L 1000 170 Z`;
  const moodAreaPath = `M 0 170 ` + trendData.map((d, i) => `L ${getX(i)} ${getMoodY(d.moodScore)}`).join(' ') + ` L 1000 170 Z`;

  const hoveredItem = hoveredIdx !== null ? trendData[hoveredIdx] : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-4 font-sans">
        <div className="space-y-1.5 row-auto text-left">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-450 animate-pulse" />
            <span className="text-[10px] font-bold text-rose-300 font-mono tracking-widest uppercase">Relationship Pulse Terminal</span>
          </div>
          <h3 className="text-md font-semibold text-white font-serif">30-Day Connection Trends & Sparks</h3>
          <p className="text-xs text-white/50">A comprehensive view on emotional alignment, mood happiness indexes, and declarations of love.</p>
        </div>

        {/* View toggling tabs */}
        <div className="flex bg-black/40 p-1 rounded-xl self-start border border-white/5 font-sans">
          <button 
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${viewMode === 'all' ? 'bg-rose-500/20 border border-rose-500/30 text-rose-200' : 'text-white/40 hover:text-white/80'}`}
          >
            Combined Pulse
          </button>
          <button 
            type="button"
            onClick={() => setViewMode('mood')}
            className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${viewMode === 'mood' ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400' : 'text-white/40 hover:text-white/80'}`}
          >
            Mood Index
          </button>
          <button 
            type="button"
            onClick={() => setViewMode('love')}
            className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${viewMode === 'love' ? 'bg-pink-500/20 border border-pink-500/30 text-pink-300' : 'text-white/40 hover:text-white/80'}`}
          >
            Love Expressions
          </button>
        </div>
      </div>

      {/* Aggregate metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left font-sans">
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-1.5 text-white/55 text-[9.5px] uppercase font-mono tracking-wider font-semibold">
            <Activity className="w-3.5 h-3.5 text-indigo-400" /> Average Mood
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-white tracking-tight">{stats.averageMoodScore}</span>
            <span className="text-[10px] text-white/40">/ 5.0 index</span>
          </div>
          <p className="text-[9.5px] text-indigo-200/50">Emotional Harmony: Active</p>
        </div>

        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-1.5 text-white/55 text-[9.5px] uppercase font-mono tracking-wider font-semibold">
            <Heart className="w-3.5 h-3.5 text-rose-450 fill-rose-500/20" /> Love Sparks Emitted
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-white tracking-tight">{stats.totalLove}</span>
            <span className="text-[10px] text-white/40">sparks</span>
          </div>
          <p className="text-[9.5px] text-rose-300/40">Covers love-notes & triggers</p>
        </div>

        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-1.5 text-white/55 text-[9.5px] uppercase font-mono tracking-wider font-semibold">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> Daily Streak Gauge
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-white tracking-tight">{pair.messages.length > 5 ? 12 : 7}</span>
            <span className="text-[10px] text-white/40">active days</span>
          </div>
          <p className="text-[9.5px] text-amber-200/40">Steady virtual companionship</p>
        </div>

        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-1.5 text-white/55 text-[9.5px] uppercase font-mono tracking-wider font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Synchronized Accord
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-white tracking-tight">{stats.moodPercentage}%</span>
            <span className="text-[10px] text-white/40">resonance</span>
          </div>
          <p className="text-[9.5px] text-teal-300/40">Connection resonance: Strong</p>
        </div>
      </div>

      {/* SVG graph boundary */}
      <div className="relative bg-black/40 border border-white/5 rounded-2xl p-4 pt-10">
        
        {/* Dynamic Tooltip Bar */}
        <div className="absolute top-3 left-4 right-4 flex justify-between items-center h-6 font-sans">
          {hoveredItem ? (
            <div className="bg-[#130d22]/95 backdrop-blur-md border border-rose-500/20 rounded-xl px-3 py-1 flex items-center gap-4 text-[10.5px] shadow-lg animate-fade-in text-white z-20">
              <span className="font-mono text-white/40 font-semibold">{hoveredItem.label}</span>
              {viewMode !== 'love' && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span className="text-white/80">Mood Index: <strong>{(hoveredItem.moodScore).toFixed(1)}/5.0</strong></span>
                </span>
              )}
              {viewMode !== 'mood' && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-white/80">Love Expressions: <strong>{hoveredItem.loveCount} sparks</strong></span>
                </span>
              )}
              {hoveredItem.isLive && (
                <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-500/15 px-2 py-0.5 rounded-md">
                  ✓ Dynamic Update
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10.5px] text-white/45 flex items-center gap-1 leading-none select-none">
              <Sparkles className="w-3.5 h-3.5 text-white/30 animate-pulse" /> Hover on vertices below to view specific coordinate metrics
            </span>
          )}

          {/* Color legends */}
          <div className="flex items-center gap-3 text-[10px] font-semibold text-white/50 select-none">
            {viewMode !== 'love' && (
              <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-indigo-500 rounded" /> Mood Index</span>
            )}
            {viewMode !== 'mood' && (
              <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-rose-500 rounded animate-pulse" /> Love expressions</span>
            )}
          </div>
        </div>

        {/* The Graphic Canvas */}
        <div className="w-full overflow-hidden select-none relative pt-4 pb-1">
          <svg className="w-full h-auto max-h-[180px] overflow-visible" viewBox="0 0 1000 180" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="loveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid coordinates */}
            <line x1="0" y1="50" x2="1000" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="5 5" />
            <line x1="0" y1="110" x2="1000" y2="110" stroke="rgba(255,255,255,0.05)" strokeDasharray="5 5" />
            <line x1="0" y1="170" x2="1000" y2="170" stroke="rgba(255,255,255,0.05)" strokeDasharray="5 5" />

            {/* Render areas */}
            {viewMode === 'love' && (
              <path d={loveAreaPath} fill="url(#loveAreaGrad)" className="transition-all duration-300" />
            )}
            {viewMode === 'mood' && (
              <path d={moodAreaPath} fill="url(#moodAreaGrad)" className="transition-all duration-300" />
            )}
            {viewMode === 'all' && (
              <>
                <path d={loveAreaPath} fill="url(#loveAreaGrad)" className="transition-all duration-300" />
                <path d={moodAreaPath} fill="url(#moodAreaGrad)" className="transition-all duration-300" />
              </>
            )}

            {/* Stroke lines */}
            {viewMode !== 'love' && (
              <path 
                d={moodPath} 
                fill="none" 
                stroke="#6366f1" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="transition-all duration-300" 
              />
            )}
            {viewMode !== 'mood' && (
              <path 
                d={lovePath} 
                fill="none" 
                stroke="#f43f5e" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="transition-all duration-300" 
              />
            )}

            {/* Live Hover Coordinate Line Indicator */}
            {hoveredIdx !== null && (
              <line 
                x1={getX(hoveredIdx)} 
                y1={30} 
                x2={getX(hoveredIdx)} 
                y2={170} 
                stroke="rgba(255,255,255,0.22)" 
                strokeDasharray="3 3" 
                strokeWidth="1.5" 
              />
            )}

            {/* Circular highlight dots */}
            {hoveredIdx !== null && (
              <>
                {viewMode !== 'love' && (
                  <circle 
                    cx={getX(hoveredIdx)} 
                    cy={getMoodY(trendData[hoveredIdx].moodScore)} 
                    r="5.5" 
                    fill="#6366f1" 
                    stroke="#ffffff" 
                    strokeWidth="1.5" 
                  />
                )}
                {viewMode !== 'mood' && (
                  <circle 
                    cx={getX(hoveredIdx)} 
                    cy={getLoveY(trendData[hoveredIdx].loveCount)} 
                    r="5.5" 
                    fill="#f43f5e" 
                    stroke="#ffffff" 
                    strokeWidth="1.5" 
                  />
                )}
              </>
            )}

            {/* Invisible column slices to capture hover cleanly */}
            {trendData.map((d, index) => (
              <rect
                key={index}
                x={getX(index) - 16}
                y={0}
                width={32}
                height={180}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoveredIdx(index)}
              />
            ))}
          </svg>
        </div>

        {/* X-axis legends */}
        <div className="flex justify-between text-[8px] font-mono font-semibold text-white/30 pt-2 border-t border-white/5 select-none px-1">
          <span>{trendData[0].label}</span>
          <span>{trendData[10].label}</span>
          <span>{trendData[20].label}</span>
          <span>Today ({trendData[29].label})</span>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Droplet, Sun, Zap, Heart, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { VirtualPet, CouplePair } from '../types';

interface PetSectionProps {
  pair: CouplePair;
  myId: string;
  myName: string;
  onSendAction: (actionType: string, payload: any) => void;
}

export default function PetSection({
  pair,
  myId,
  myName,
  onSendAction
}: PetSectionProps) {
  const pet = pair.pet;

  const handleWaterPet = () => {
    onSendAction('WATER_PET', {});
  };

  // Render customizable visual SVG depending on growth stage
  const renderPlantStageVisual = () => {
    if (pet.growth >= 80) {
      // Blossomed Rose
      return (
        <svg className="w-48 h-48 mx-auto" viewBox="0 0 100 100" fill="none">
          {/* Stem & Leaves */}
          <path d="M50 90 L50 45" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 70 Q30 65 35 55" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M50 55 Q70 50 65 40" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Pot */}
          <path d="M35 90 L65 90 L60 100 L40 100 Z" fill="#b45309" />
          <rect x="30" y="85" width="40" height="5" rx="2.5" fill="#d97706" />

          {/* Gorgeous rose bloom */}
          <circle cx="50" cy="35" r="16" fill="#e11d48" className="animate-pulse" style={{ animationDuration: '4s' }} />
          <circle cx="44" cy="27" r="11" fill="#be123c" />
          <circle cx="56" cy="27" r="11" fill="#f43f5e" />
          <circle cx="50" cy="32" r="11" fill="#fb7185" />
          <circle cx="50" cy="24" r="7" fill="#ffe4e6" />

          {/* Glowing hearts */}
          <circle cx="28" cy="26" r="1.5" fill="#fb7185" className="animate-ping" style={{ animationDuration: '3s' }} />
          <circle cx="72" cy="38" r="1.5" fill="#fb7185" className="animate-ping" style={{ animationDuration: '4s' }} />
        </svg>
      );
    } else if (pet.growth >= 45) {
      // Buddin
      return (
        <svg className="w-48 h-48 mx-auto" viewBox="0 0 100 100" fill="none">
          <path d="M50 90 L50 50" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 75 Q32 70 38 60" stroke="#10b981" strokeWidth="3" fill="none" />
          <path d="M35 90 L65 90 L60 100 L40 100 Z" fill="#b45309" />
          <rect x="30" y="85" width="40" height="5" rx="2.5" fill="#d97706" />

          {/* Rose Bud petals */}
          <ellipse cx="50" cy="42" rx="10" ry="12" fill="#be123c" />
          <ellipse cx="50" cy="42" rx="7" fill="#fb7185" />
        </svg>
      );
    } else if (pet.growth >= 15) {
      // Sprout
      return (
        <svg className="w-48 h-48 mx-auto" viewBox="0 0 100 100" fill="none">
          <path d="M50 90 L50 65" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M35 90 L65 90 L60 100 L40 100 Z" fill="#b45309" />
          <rect x="30" y="85" width="40" height="5" rx="2.5" fill="#d97706" />

          {/* Tiny green leaves */}
          <path d="M50 72 Q35 60 40 50" stroke="#10b981" strokeWidth="3" fill="none" />
          <path d="M50 72 Q65 65 60 55" stroke="#10b981" strokeWidth="3" fill="none" />
        </svg>
      );
    } else {
      // Seed
      return (
        <svg className="w-48 h-48 mx-auto" viewBox="0 0 100 100" fill="none">
          <path d="M35 90 L65 90 L60 100 L40 100 Z" fill="#b45309" />
          <rect x="30" y="85" width="40" height="5" rx="2.5" fill="#d97706" />
          
          {/* Seed pot ground dirt */}
          <circle cx="50" cy="80" r="3.5" fill="#78350f" />
        </svg>
      );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* Visual Plant Display screen */}
      <div className="md:col-span-7 bg-white/5 border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col items-center justify-center space-y-6 relative overflow-hidden h-[420px] backdrop-blur-md">
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 text-[10.5px] font-mono uppercase px-3 py-1 rounded-full font-bold border border-emerald-500/20">
          <Sparkles className="w-3 h-3 text-emerald-400" /> Plant Stage: {pet.stage}
        </div>

        {/* Dynamic visual frame */}
        <div className="p-4 rounded-full bg-black/40 border border-white/10 relative shadow-inner">
          {renderPlantStageVisual()}
        </div>

        {/* Growth numeric tracker */}
        <div className="text-center space-y-2 w-full max-w-sm px-6">
          <div className="flex justify-between text-xs font-semibold text-white/80">
            <span>Relationship Growth</span>
            <span className="font-mono text-emerald-400 font-bold">{pet.growth}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden relative border border-white/5">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all" style={{ width: `${pet.growth}%` }} />
          </div>
        </div>
      </div>

      {/* Gamification metric sliders & controllers */}
      <div className="md:col-span-5 space-y-4">
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl shadow-xl space-y-4 backdrop-blur-md">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-rose-300 uppercase tracking-widest font-mono">Nourish Relationship</h3>
            <p className="text-[11px] text-white/50 leading-relaxed font-light font-sans">
              Your "Heartblossom" plant thrives on real-time interactions. Tap the watering can or perform shared actions (trivia, love texts) to trigger blooming cycles!
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Action buttons */}
            <button
              onClick={handleWaterPet}
              className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:opacity-95 text-white font-semibold py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-between shadow-lg shadow-teal-500/10 group cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-sky-200 group-hover:scale-110 transition-transform" />
                Water Relationship Flower
              </span>
              <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full">+3% Growth</span>
            </button>
          </div>

          {/* Plant Stats */}
          <div className="space-y-2 pt-3 border-t border-white/10 text-xs text-white/60">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-450 fill-current" /> Happiness</span>
              <span className="font-mono font-bold text-white">{pet.happiness}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-yellow-400" /> Sunlight Exposure</span>
              <span className="font-mono font-bold text-white">Optimal (82%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Growth Speed</span>
              <span className="font-mono font-bold text-white">1.5x Multiplier ✨</span>
            </div>
          </div>
        </div>

        {/* Milestone logs of growth interactions */}
        <div className="bg-black/40 border border-white/10 p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-[11px] font-bold text-pink-300 font-mono tracking-widest uppercase">Nurture Logs</h4>
            <span className="text-[9px] text-white/30 font-mono">Live Session</span>
          </div>
          <div className="text-[10px] space-y-1.5 font-mono text-white/60">
            <p className="flex items-start gap-1"><span className="text-emerald-400">&bull;</span> [Just now] {myName} watered the heartblossom sprout (+3% growth)</p>
            <p className="flex items-start gap-1"><span className="text-purple-400">&bull;</span> [1h ago] Completed Tic-Tac-Toe Round together (+4% growth)</p>
            <p className="flex items-start gap-1"><span className="text-pink-400">&bull;</span> [3h ago] Alex posted a Polaroid Story memory (+5% growth)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

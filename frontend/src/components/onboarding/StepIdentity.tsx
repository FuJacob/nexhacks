import React from "react";
import type { Voice } from "../../types";

interface StepIdentityProps {
  name: string;
  setName: (name: string) => void;
  selectedVoice: string;
  setSelectedVoice: (id: string) => void;
  voices: Voice[];
}

// Curated top 4 voices as requested
const DISPLAY_VOICES = [
  { id: "e59f481c-0e24-42f4-9457-45dfeb9dd96d", label: "Asteria", role: "The Bestie", icon: "👩" },
  { id: "ebf39446-513b-4820-8356-d7d8e63bc2e3", label: "Orion", role: "The Hype Man", icon: "👨" },
  { id: "1234", label: "Athena", role: "The Moderator", icon: "👩" }, // Fallback IDs if not present, need to handle gracefully
  { id: "5678", label: "Helios", role: "The Narrator", icon: "👨" },
];

export const StepIdentity: React.FC<StepIdentityProps> = ({
  name,
  setName,
  selectedVoice,
  setSelectedVoice,
  voices,
}) => {
  return (
    <div className="flex flex-col h-full animate-enter">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3 tracking-tight">The Identity</h1>
        <p className="text-zinc-400 text-lg">
          Give your chat a face and a voice.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12">
        {/* Avatar Ring */}
        <div className="relative group cursor-pointer">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-1 animate-pulse-slow">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-4 border-black overflow-hidden relative">
               <img 
                 src="/logo.png" 
                 className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                 alt="Avatar"
                 onError={(e) => {
                    // Fallback if logo not found
                    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + name;
                 }}
               />
               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-semibold uppercase tracking-wider">Edit</span>
               </div>
            </div>
          </div>
        </div>

        {/* Name Input */}
        <div className="w-full max-w-sm">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your AI (e.g. Chat, Glitch, Sidekick)"
            className="w-full bg-transparent text-center text-3xl font-bold border-b-2 border-zinc-800 py-2 focus:border-white focus:outline-none transition-colors placeholder:text-zinc-700"
            autoFocus
          />
        </div>

        {/* Voice Cards */}
        <div className="w-full max-w-2xl">
          <div className="flex gap-4 overflow-x-auto pb-6 px-4 snap-x justify-center">
            {/* Map over available voices, but try to match our curated list display style */}
            {voices.slice(0, 4).map((voice, idx) => {
               const curated = DISPLAY_VOICES[idx] || { label: voice.name, role: "Assistant", icon: voice.gender === 'female' ? '👩' : '👨' };
               const isSelected = selectedVoice === voice.id;

               return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`
                    flex-shrink-0 w-48 snap-center cursor-pointer relative group transition-all duration-300
                    flex flex-col items-center p-6 rounded-2xl border-2
                    ${isSelected 
                      ? "bg-zinc-900 border-white scale-105 shadow-xl shadow-white/5" 
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900"}
                  `}
                >
                  <div className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all">{curated.icon}</div>
                  <h3 className="font-bold text-lg">{voice.name}</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mt-1">{curated.role}</p>
                  
                  {/* Play Button Mock */}
                  <div className={`mt-4 w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isSelected ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-500'}`}>
                    ▶
                  </div>
                </div>
               );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";

interface StepSpiritProps {
  personality: string;
  setPersonality: (text: string) => void;
  style: string[];
  setStyle: (styles: string[]) => void;
  isCustom: boolean;
  setIsCustom: (val: boolean) => void;
}

export const StepSpirit: React.FC<StepSpiritProps> = ({
  personality,
  setPersonality,
  style,
  setStyle,
  isCustom,
  setIsCustom,
}) => {
  // Placeholder state for the visual sliders (would map to style prompts in reality)
  const [tone, setTone] = useState(50);
  const [humor, setHumor] = useState(50);
  const [focus, setFocus] = useState(50);

  return (
    <div className="flex flex-col h-full animate-enter max-w-2xl mx-auto w-full">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3 tracking-tight">The Spirit</h1>
        <p className="text-zinc-400 text-lg">
          Define the vibe. How should they behave?
        </p>
      </div>

      {/* Source of Truth Switch */}
      <div className="bg-zinc-900/50 p-1 rounded-xl flex mb-12 self-center border border-zinc-800">
        <button
          onClick={() => setIsCustom(false)}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${
            !isCustom ? "bg-white text-black shadow-lg" : "text-zinc-400 hover:text-white"
          }`}
        >
          ✨ Mirror the Chat
        </button>
        <button
          onClick={() => setIsCustom(true)}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${
            isCustom ? "bg-white text-black shadow-lg" : "text-zinc-400 hover:text-white"
          }`}
        >
          🎛️ Custom Persona
        </button>
      </div>

      {!isCustom ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
             <div className="text-6xl mb-6 opacity-80">🔮</div>
             <h3 className="text-2xl font-bold text-white mb-2">Magic Mode Active</h3>
             <p className="text-zinc-400 max-w-md mx-auto">
               We'll analyze your past streams to automatically match your community's humor, slang, and energy.
             </p>
        </div>
      ) : (
        <div className="space-y-12 animate-enter">
          {/* Vibe Sliders */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <span>Helpful</span>
                <span>Savage</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={tone} 
                onChange={(e) => setTone(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <span>Dry Humor</span>
                <span>Chaotic</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={humor} 
                onChange={(e) => setHumor(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <span>Gaming Focus</span>
                <span>IRL / Life</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={focus} 
                onChange={(e) => setFocus(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>

          {/* Lore Box */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-white">Lore & Backstory</label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="What does the chat care about? (e.g. We hate pineapple on pizza, we love gym streams...)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white focus:outline-none min-h-[120px] resize-none placeholder:text-zinc-600"
            />
          </div>
        </div>
      )}
    </div>
  );
};

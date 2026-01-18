import React from "react";
import type { BehaviorSettings } from "../../types";
import { getPresenceValues, calculatePresenceScore } from "../../types";

interface StepRhythmProps {
  behavior: BehaviorSettings;
  setBehavior: (b: BehaviorSettings) => void;
}

export const StepRhythm: React.FC<StepRhythmProps> = ({ behavior, setBehavior }) => {
  // Derive the visual slider value (0-100) from the actual backend state
  const presenceScore = calculatePresenceScore(behavior);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value);
    // Convert slider 0-100 back to specific backend values
    const newSettings = getPresenceValues(newVal);
    
    setBehavior({
      ...behavior,
      ...newSettings
    });
  };

  const addTriggerWord = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = (e.currentTarget.value).trim();
      if (val && !behavior.trigger_words.includes(val)) {
        setBehavior({
          ...behavior,
          trigger_words: [...behavior.trigger_words, val]
        });
        e.currentTarget.value = '';
      }
    }
  };

  const removeTriggerWord = (word: string) => {
    setBehavior({
      ...behavior,
      trigger_words: behavior.trigger_words.filter(w => w !== word)
    });
  };

  // Dynamic text based on slider position
  const getPresenceText = (score: number) => {
    if (score < 33) return "Speaks only when spoken to directly.";
    if (score < 66) return "Chimes in occasionally during funny moments.";
    return "Reacts constantly to everything happening.";
  };

  return (
    <div className="flex flex-col h-full animate-enter max-w-2xl mx-auto w-full">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3 tracking-tight">The Rhythm</h1>
        <p className="text-zinc-400 text-lg">
          Find the right tempo. How often do they jump in?
        </p>
      </div>

      <div className="space-y-16">
        {/* Presence Slider */}
        <div className="space-y-6">
          <label className="block text-sm font-semibold text-center text-white uppercase tracking-wider">
            Presence Level: {presenceScore}%
          </label>
          
          <div className="relative pt-6 pb-2">
            <div className="flex justify-between text-xs text-zinc-500 font-semibold uppercase absolute -top-1 w-full px-1">
              <span>Quiet Observer</span>
              <span>Main Character</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={presenceScore} 
              onChange={handleSliderChange}
              className="w-full h-3 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white hover:accent-zinc-200 transition-all"
            />
          </div>

          <p className="text-center text-xl font-medium text-white min-h-[3rem] flex items-center justify-center animate-fade-in">
            "{getPresenceText(presenceScore)}"
          </p>
        </div>

        {/* Wake Words */}
        <div className="bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800/50">
          <label className="block text-sm font-semibold mb-4 text-white">Wake Words</label>
          <p className="text-zinc-400 text-sm mb-4">
            When should they <b>always</b> listen? Press Enter to add.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {behavior.trigger_words.map(word => (
              <span key={word} className="bg-white text-black text-sm font-bold px-3 py-1 rounded-full flex items-center gap-2">
                {word}
                <button onClick={() => removeTriggerWord(word)} className="hover:text-red-500">×</button>
              </span>
            ))}
            <input 
              type="text" 
              placeholder="+ Add Keyword"
              onKeyDown={addTriggerWord}
              className="bg-transparent border-none text-white focus:outline-none min-w-[100px] placeholder:text-zinc-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

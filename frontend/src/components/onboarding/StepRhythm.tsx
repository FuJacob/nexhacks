import React from "react";
import type { BehaviorSettings } from "../../types";
import { getPresenceValues, calculatePresenceScore } from "../../types";

interface StepRhythmProps {
  behavior: BehaviorSettings;
  setBehavior: (b: BehaviorSettings) => void;
}

export const StepRhythm: React.FC<StepRhythmProps> = ({
  behavior,
  setBehavior,
}) => {
  // Derive the visual slider value (0-100) from the actual backend state
  const presenceScore = calculatePresenceScore(behavior);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value);
    // Convert slider 0-100 back to specific backend values
    const newSettings = getPresenceValues(newVal);

    setBehavior({
      ...behavior,
      ...newSettings,
    });
  };

  const addTriggerWord = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = e.currentTarget.value.trim();
      if (val && !behavior.trigger_words.includes(val)) {
        setBehavior({
          ...behavior,
          trigger_words: [...behavior.trigger_words, val],
        });
        e.currentTarget.value = "";
      }
    }
  };

  const removeTriggerWord = (word: string) => {
    setBehavior({
      ...behavior,
      trigger_words: behavior.trigger_words.filter((w) => w !== word),
    });
  };

  // Dynamic text based on slider position
  const getPresenceText = (score: number) => {
    if (score < 33) return "Speaks only when spoken to directly.";
    if (score < 66) return "Chimes in occasionally during funny moments.";
    return "Reacts constantly to everything happening.";
  };

  return (
    <div className="flex flex-col w-full h-full animate-enter overflow-y-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent">
          The Rhythm
        </h1>
        <p className="text-zinc-400 text-base md:text-lg">
          Find the right tempo. How often do they jump in?
        </p>
      </div>

      <div className="space-y-10 flex-1 pb-8">
        {/* Presence Slider */}
        <div className="space-y-6 p-6 md:p-8 rounded-3xl bg-gradient-to-b from-zinc-900/50 to-transparent border border-zinc-800/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-zinc-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <label className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Presence Level
              </label>
            </div>
            <span className="text-sm font-mono text-zinc-400 bg-zinc-900/50 px-3 py-1 rounded-lg">
              {presenceScore}%
            </span>
          </div>

          <div className="relative pt-6 pb-4">
            <div className="flex justify-between text-xs text-zinc-600 mb-3">
              <span className="flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4.515 7.521C3.743 7.979 3 8.711 3 9.5 3 10.881 3.656 12.114 4.515 12.479M15.485 7.521C16.257 7.979 17 8.711 17 9.5c0 1.381-.656 2.614-1.515 2.979M8.5 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM14.5 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
                Quiet Observer
              </span>
              <span className="flex items-center gap-1.5">
                Main Character
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={presenceScore}
              onChange={handleSliderChange}
              className="w-full presence-slider"
              style={{ "--value": `${presenceScore}%` } as React.CSSProperties}
            />
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4">
            <p className="text-center text-base md:text-lg font-medium text-white min-h-[2.5rem] flex items-center justify-center animate-fade-in">
              "{getPresenceText(presenceScore)}"
            </p>
          </div>
        </div>

        {/* Wake Words */}
        <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-zinc-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <label className="text-sm font-semibold uppercase tracking-wider text-white">
              Wake Words
            </label>
          </div>
          <p className="text-zinc-500 text-sm mb-5 ml-6">
            When should they{" "}
            <span className="text-zinc-300 font-medium">always</span> listen?
            Press Enter to add.
          </p>

          <div className="flex flex-wrap gap-2.5 min-h-[50px] items-start">
            {behavior.trigger_words.map((word) => (
              <span
                key={word}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs md:text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform flex-shrink-0"
              >
                {word}
                <button
                  onClick={() => removeTriggerWord(word)}
                  className="hover:text-red-300 transition-colors font-bold text-base"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="+ Add Keyword"
              onKeyDown={addTriggerWord}
              className="bg-zinc-800/50 border border-zinc-700/50 rounded-full px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:bg-zinc-800 min-w-[130px] placeholder:text-zinc-600 transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

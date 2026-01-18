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
    <div className="flex flex-col w-full animate-enter">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent">
          The Spirit
        </h1>
        <p className="text-zinc-400 text-lg">
          Define the vibe. How should they behave?
        </p>
      </div>

      {/* Source of Truth Switch */}
      <div className="bg-zinc-900/50 p-1.5 rounded-2xl flex mb-10 self-center border border-zinc-800/50 backdrop-blur-sm">
        <button
          onClick={() => setIsCustom(false)}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 ${!isCustom ? "bg-white text-black shadow-lg shadow-white/10" : "text-zinc-400 hover:text-white"}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          Mirror the Chat
        </button>
        <button
          onClick={() => setIsCustom(true)}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 ${isCustom ? "bg-white text-black shadow-lg shadow-white/10" : "text-zinc-400 hover:text-white"}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          Custom Persona
        </button>
      </div>

      {!isCustom ? (
        <div className="flex flex-col items-center justify-center text-center p-10 border border-zinc-800/50 rounded-3xl bg-gradient-to-b from-zinc-900/50 to-transparent backdrop-blur-sm">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20">
            <svg
              className="w-10 h-10 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            Magic Mode Active
          </h3>
          <p className="text-zinc-400 max-w-sm mx-auto leading-relaxed">
            We'll analyze your past streams to automatically match your
            community's humor, slang, and energy.
          </p>
        </div>
      ) : (
        <div className="space-y-10 animate-enter">
          {/* Vibe Sliders */}
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Tone
                </span>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded">
                  {tone}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-600 mb-2">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                  Helpful
                </span>
                <span className="flex items-center gap-1">
                  Savage
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tone}
                  onChange={(e) => setTone(parseInt(e.target.value))}
                  className="w-full tone-slider"
                  style={{ "--value": `${tone}%` } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Humor
                </span>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded">
                  {humor}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-600 mb-2">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Dry
                </span>
                <span className="flex items-center gap-1">
                  Chaotic
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={humor}
                  onChange={(e) => setHumor(parseInt(e.target.value))}
                  className="w-full humor-slider"
                  style={{ "--value": `${humor}%` } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Focus
                </span>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded">
                  {focus}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-zinc-600 mb-2">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                  </svg>
                  Gaming
                </span>
                <span className="flex items-center gap-1">
                  IRL / Life
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={focus}
                  onChange={(e) => setFocus(parseInt(e.target.value))}
                  className="w-full focus-slider"
                  style={{ "--value": `${focus}%` } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          {/* Lore Box */}
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-4 h-4 text-zinc-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              <label className="text-sm font-semibold text-white uppercase tracking-wider">
                Lore & Backstory
              </label>
            </div>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="What does the chat care about? (e.g. We hate pineapple on pizza, we love gym streams...)"
              className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none min-h-[120px] resize-none placeholder:text-zinc-600 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
};

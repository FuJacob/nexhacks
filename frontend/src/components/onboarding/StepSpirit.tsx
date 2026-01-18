import React, { useState, useEffect } from "react";

interface StepSpiritProps {
  style: string[];
  setStyle: (styles: string[]) => void;
}

export const StepSpirit: React.FC<StepSpiritProps> = ({
  style,
  setStyle,
}) => {
  const [humor, setHumor] = useState(100);

  // Hardcode "Savage" (Tone=100) and "IRL" (Focus=100) behavior
  // Update styles whenever humor changes
  useEffect(() => {
    const newStyles = [
      "Keep responses under 2 sentences", // Base constraint
      "Use casual, conversational language", // Base constraint
      
      // Hardcoded: SAVAGE TONE
      "Be savage and ruthless",
      "Roast the streamer frequently",
      "Don't hold back on criticism",
      
      // Hardcoded: IRL FOCUS
      "Focus on real-life commentary",
      "Ignore gaming jargon, focus on the person",
      
      // Dynamic: HUMOR
      humor < 30 ? "Use dry, deadpan humor" :
      humor > 70 ? "Use chaotic, unhinged humor" :
      "Use balanced, witty humor"
    ];
    
    // Only update if different to avoid loops (simple check)
    setStyle(newStyles);
  }, [humor]); // eslint-disable-line react-hooks/exhaustive-deps

  const getHumorText = (val: number) => {
    if (val < 30) return "Dry, sarcastic, and deadpan.";
    if (val > 70) return "Unhinged, chaotic, and loud.";
    return "Witty, balanced, and playful.";
  };

  return (
    <div className="flex flex-col w-full h-full animate-enter overflow-y-auto">
      <div className="text-center mb-8">
        <h1 className="heading-xl mb-4">The Spirit</h1>
        <p className="text-zinc-400 text-base md:text-lg font-medium">
          Define the vibe. Only humor varies—the rest is set to savage.
        </p>
      </div>

      <div className="space-y-10 flex-1 pb-8">
        {/* Humor Slider - Matches StepRhythm Layout */}
        <div className="card-elevated space-y-6 p-6 md:p-8 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-zinc-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
              <label className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Humor Style
              </label>
            </div>
            <span className="badge badge-ghost font-mono">
              {humor}%
            </span>
          </div>

          <div className="relative pt-6 pb-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-4 font-bold uppercase tracking-wide">
              <span className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4"
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
              <span className="flex items-center gap-1.5">
                Chaotic
                <svg
                  className="w-4 h-4"
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

          <div className="card p-4">
            <p className="text-center text-base md:text-lg font-bold text-white min-h-[2.5rem] flex items-center justify-center animate-fade-in">
              "{getHumorText(humor)}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

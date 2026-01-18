import React, { useEffect, useState } from "react";
import type { PersonaSettings } from "../../types";

interface StepReviewProps {
  name: string;
  persona: PersonaSettings;
  onSave: () => void;
  onRedo: () => void;
  isSaving: boolean;
}

export const StepReview: React.FC<StepReviewProps> = ({
  name,
  persona,
  onSave,
  onRedo,
  isSaving,
}) => {
  const [showMessage, setShowMessage] = useState(false);

  const avatarUrl =
    persona.avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${name || "default"}`;

  // Simple animation for the mock chat
  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col w-full animate-enter items-center justify-center">
      <div className="text-center mb-10">
        <h1 className="heading-xl mb-4">You're All Set!</h1>
        <p className="text-zinc-400 text-lg md:text-xl font-medium">
          <span className="gradient-text font-bold">{name}</span> will give your chat a voice.
        </p>
      </div>

      {/* Live Preview Mock - showing persona as CHAT VOICE */}
      <div className="card-elevated w-full max-w-md overflow-hidden mb-10">
        <div className="bg-zinc-800 px-4 py-3 border-b-2 border-zinc-700 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Live Preview
          </span>
        </div>

        <div className="p-5 space-y-3 font-mono text-sm max-h-[280px] overflow-hidden relative">
          {/* Chat messages from viewers */}
          <div className="opacity-40">
            <span className="font-bold text-purple-400">xXgamer99Xx:</span>{" "}
            <span className="text-zinc-400">whats he doing lol</span>
          </div>
          <div className="opacity-60">
            <span className="font-bold text-blue-400">chatfrog:</span>{" "}
            <span className="text-zinc-300">is that a new mic??</span>
          </div>

          {/* Persona response - voicing CHAT to the streamer */}
          <div
            className={`transition-all duration-700 transform ${showMessage ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            <div className="card flex items-start gap-3 mt-3 p-4 border-purple-500/30 bg-purple-500/5">
              <img
                src={avatarUrl}
                alt={name}
                className="w-10 h-10 rounded-xl flex-shrink-0 object-cover border-2 border-purple-500/30"
              />
              <div>
                <span className="font-bold text-white">{name}</span>
                <p className="text-white mt-1.5 leading-relaxed font-sans font-medium">
                  Hey! Chat wants to know what you're doing and if that's a new mic!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="btn-secondary relative px-12 py-4 text-lg animate-glow"
        >
          <span className="flex items-center gap-3">
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Settings
              </>
            )}
          </span>
        </button>

        <button
          onClick={onRedo}
          className="btn-ghost text-sm text-zinc-500 hover:text-white"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};

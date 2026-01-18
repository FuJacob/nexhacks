import React, { useEffect, useState } from "react";
import type { PersonaSettings } from "../../types";

interface StepReviewProps {
  name: string;
  persona: PersonaSettings;
  onSave: () => void;
  isSaving: boolean;
}

export const StepReview: React.FC<StepReviewProps> = ({
  name,
  persona,
  onSave,
  isSaving,
}) => {
  const [showMessage, setShowMessage] = useState(false);
  
  const avatarUrl = persona.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${name || "default"}`;

  // Simple animation for the mock chat
  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col w-full animate-enter items-center justify-center">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent">
          You're all set.
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 font-semibold">
            {name}
          </span>{" "}
          is ready to join the stream.
        </p>
      </div>

      {/* Live Preview Mock */}
      <div className="w-full max-w-md bg-zinc-950/80 border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 mb-10 backdrop-blur-sm">
        <div className="bg-zinc-900/80 px-4 py-3 border-b border-zinc-800/50 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          <span className="ml-3 text-xs font-mono text-zinc-500">
            Live Preview
          </span>
        </div>

        <div className="p-5 space-y-3 font-mono text-sm max-h-[280px] overflow-hidden relative">
          <div className="opacity-40">
            <span className="font-bold text-purple-400">User1:</span>{" "}
            <span className="text-zinc-400">POGGERS</span>
          </div>
          <div className="opacity-60">
            <span className="font-bold text-blue-400">User2:</span>{" "}
            <span className="text-zinc-300">LMAO look at that dog</span>
          </div>

          <div
            className={`transition-all duration-700 transform ${showMessage ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            <div className="flex items-start gap-3 mt-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-4 rounded-xl border border-purple-500/20">
              <img
                src={avatarUrl}
                alt={name}
                className="w-9 h-9 rounded-full flex-shrink-0 shadow-lg shadow-purple-500/30 object-cover"
              />
              <div>
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  {name}
                </span>
                <p className="text-white mt-1.5 leading-relaxed">
                  Okay, strictly speaking, that dog is actually the main
                  character of this stream now.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className="group relative px-10 py-4 bg-black border-2 border-white/20 hover:border-white/40 text-white font-bold text-lg rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 hover:shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer overflow-hidden"
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <span className="relative z-10 flex items-center gap-2.5">
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Go Live
            </>
          )}
        </span>

        {!isSaving && (
          <>
            <span className="absolute -right-1 -top-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            <span className="absolute -right-1 -top-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </>
        )}
      </button>
    </div>
  );
};

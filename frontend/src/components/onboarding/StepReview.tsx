import React, { useEffect, useState } from "react";
import type { PersonaSettings } from "../../types";

interface StepReviewProps {
  name: string;
  persona: PersonaSettings;
  onSave: () => void;
  isSaving: boolean;
}

export const StepReview: React.FC<StepReviewProps> = ({ name, persona, onSave, isSaving }) => {
  const [showMessage, setShowMessage] = useState(false);

  // Simple animation for the mock chat
  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full animate-enter max-w-2xl mx-auto w-full items-center justify-center">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">You're all set.</h1>
        <p className="text-zinc-400 text-xl">
          <span className="text-white font-semibold">{name}</span> is ready to join the stream.
        </p>
      </div>

      {/* Live Preview Mock */}
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl mb-12">
        <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-xs font-mono text-zinc-500">Live Preview</span>
        </div>
        
        <div className="p-6 space-y-4 font-mono text-sm max-h-[300px] overflow-hidden relative">
           <div className="opacity-50">
             <span className="font-bold text-purple-400">User1:</span> POGGERS
           </div>
           <div className="opacity-70">
             <span className="font-bold text-blue-400">User2:</span> LMAO look at that dog
           </div>
           
           <div className={`transition-all duration-700 transform ${showMessage ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="flex items-start gap-3 mt-4 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                 <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex-shrink-0"></div>
                 <div>
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{name}</span>
                    <p className="text-white mt-1">Okay, strictly speaking, that dog is actually the main character of this stream now.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className="group relative px-8 py-4 bg-white text-black font-bold text-lg rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSaving ? "Saving..." : "Go Live"}
        
        {!isSaving && (
            <span className="absolute -right-1 -top-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
        )}
      </button>
    </div>
  );
};

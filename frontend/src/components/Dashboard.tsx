import React, { useState, useEffect } from "react";
import type { PersonaSettings } from "../types";

interface DashboardProps {
  personaName: string;
  persona: PersonaSettings;
  onBackToSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  personaName,
  persona,
  onBackToSettings,
}) => {
  const [isLive, setIsLive] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const [uptime, setUptime] = useState(0);

  const avatarUrl =
    persona.avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${personaName || "default"}`;

  // Simulate uptime counter
  useEffect(() => {
    const timer = setInterval(() => {
      setUptime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate message count
  useEffect(() => {
    const timer = setInterval(() => {
      if (isLive) {
        setMessageCount((prev) => prev + Math.floor(Math.random() * 3));
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isLive]);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/5 via-black to-blue-900/5 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08)_0%,transparent_50%)] pointer-events-none"></div>

      {/* Drag region - narrower height to avoid blocking header buttons */}
      <div className="title-bar-drag-region h-8 w-full fixed top-0 left-0 z-50"></div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt="Pickle"
            className="h-10 w-10 opacity-90 hover:opacity-100 transition-opacity rounded-xl object-cover border-2 border-zinc-700"
          />
          <div className="flex flex-col">
            <h1 className="text-xl font-black">{personaName}</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              AI Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLive && (
            <div className="live-badge">
              <span className="live-dot"></span>
              <span className="text-sm font-black text-red-400">LIVE</span>
            </div>
          )}

          <button
            onClick={onBackToSettings}
            className="btn-ghost p-2.5 rounded-xl relative z-50"
            title="Settings"
          >
            <svg
              className="w-5 h-5 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center pt-28 pb-20 px-6 md:px-8 w-full max-w-6xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full mb-12">
          {/* Status Card */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 border-2 border-green-500/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                  Status
                </p>
                <p className="text-xl font-black text-white">Active</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 font-medium">
              AI is monitoring chat and ready to respond
            </p>
          </div>

          {/* Messages Card */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border-2 border-purple-500/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                  Messages
                </p>
                <p className="text-xl font-black text-white">{messageCount}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 font-medium">
              Total messages processed
            </p>
          </div>

          {/* Uptime Card */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border-2 border-blue-500/30 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                  Uptime
                </p>
                <p className="text-xl font-black text-white font-mono">
                  {formatUptime(uptime)}
                </p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 font-medium">
              Time since activation
            </p>
          </div>
        </div>

        {/* Persona Info */}
        <div className="w-full card-elevated p-8 md:p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="avatar-ring w-18 h-18">
              <img
                src={avatarUrl}
                className="w-full h-full object-cover rounded-full"
                alt="Avatar"
              />
            </div>
            <div>
              <h2 className="text-2xl font-black gradient-text">
                {personaName}
              </h2>
              <p className="text-zinc-400 font-medium">
                Your AI Chat Assistant
              </p>
            </div>
          </div>

          {persona.personality && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-4 h-4 text-zinc-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                  Personality
                </h3>
              </div>
              <p className="text-zinc-400 leading-relaxed font-medium">
                {persona.personality}
              </p>
            </div>
          )}

          {persona.behavior.trigger_words.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
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
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                  Wake Words
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {persona.behavior.trigger_words.map((word) => (
                  <span key={word} className="badge badge-primary">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full p-6 md:p-8 flex justify-center items-center z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <button
            onClick={() => setIsLive(!isLive)}
            className={isLive ? "btn-danger" : "btn-success"}
          >
            {isLive ? "Stop Monitoring" : "Start Monitoring"}
          </button>
        </div>
      </footer>
    </div>
  );
};

import React from "react";

interface StepWelcomeProps {
  onGetStarted: () => void;
}

export const StepWelcome: React.FC<StepWelcomeProps> = ({ onGetStarted }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full animate-enter text-center">
      {/* Logo/Icon */}
      <div className="mb-8">
        <img
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl"          style={{ boxShadow: "0 8px 32px rgba(139, 92, 246, 0.4)" }}
          src="/logo.png" />

      </div>

      {/* Welcome Text */}
      <h1 className="heading-xl mb-4">
        Welcome Aboard to{" "}
        <span>Pickle</span>
      </h1>
      <p className="text-zinc-400 text-lg md:text-xl max-w-md mx-auto mb-10 leading-relaxed">
        The AI that gives your Twitch chat a voice.
      </p>

      {/* Get Started Button */}
      <button
        onClick={onGetStarted}
        className="btn-primary px-10 py-4 text-lg animate-glow flex items-center gap-3"
      >
        Get Started
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
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </button>
    </div>
  );
};

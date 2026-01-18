import React, { useState } from "react";
import type { Voice } from "../../types";

interface StepIdentityProps {
  name: string;
  setName: (name: string) => void;
  selectedVoice: string;
  setSelectedVoice: (id: string) => void;
  voices: Voice[];
  avatar?: string;
  setAvatar: (avatar: string) => void;
}

// Curated top 4 voices as requested
const DISPLAY_VOICES = [
  {
    id: "e59f481c-0e24-42f4-9457-45dfeb9dd96d",
    label: "Asteria",
    role: "The Bestie",
    icon: "👩",
  },
  {
    id: "ebf39446-513b-4820-8356-d7d8e63bc2e3",
    label: "Orion",
    role: "The Hype Man",
    icon: "👨",
  },
  { id: "1234", label: "Athena", role: "The Moderator", icon: "👩" }, // Fallback IDs if not present, need to handle gracefully
  { id: "5678", label: "Helios", role: "The Narrator", icon: "👨" },
];

export const StepIdentity: React.FC<StepIdentityProps> = ({
  name,
  setName,
  selectedVoice,
  setSelectedVoice,
  voices,
  avatar,
  setAvatar,
}) => {
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Predefined avatar options
  const avatarOptions = [
    "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Bubbles",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Midnight",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Felix",
    "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix",
    "https://api.dicebear.com/7.x/pixel-art/svg?seed=Aneka",
  ];

  const currentAvatar =
    avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${name || "default"}`;

  return (
    <div className="flex flex-col w-full h-full animate-enter overflow-y-auto">
      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAvatarPicker(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Choose Avatar</h2>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {avatarOptions.map((avatarUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAvatar(avatarUrl);
                    setShowAvatarPicker(false);
                  }}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                    currentAvatar === avatarUrl
                      ? "border-purple-500 shadow-lg shadow-purple-500/20"
                      : "border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <img
                    src={avatarUrl}
                    alt={`Avatar ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent">
          The Identity
        </h1>
        <p className="text-zinc-400 text-base md:text-lg">
          Give your chat a face and a voice.
        </p>
      </div>

      <div className="flex flex-col items-center justify-start gap-8 flex-1 pb-8">
        {/* Avatar Ring */}
        <div
          className="relative group cursor-pointer flex-shrink-0"
          onClick={() => setShowAvatarPicker(true)}
        >
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-blue-500 p-[3px] animate-pulse-slow shadow-xl shadow-purple-500/20">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
              <img
                src={currentAvatar}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                alt="Avatar"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Edit
                </span>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity -z-10"></div>
        </div>

        {/* Name Input */}
        <div className="w-full max-w-sm px-4 flex-shrink-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your AI (e.g. Chat, Glitch)"
            className="w-full bg-transparent text-center text-xl md:text-2xl font-bold border-b-2 border-zinc-800 py-2.5 focus:border-purple-500 focus:outline-none transition-all placeholder:text-zinc-700 placeholder:text-base md:placeholder:text-lg"
            autoFocus
          />
        </div>

        {/* Voice Cards */}
        <div className="w-full px-4 md:px-6 flex-shrink-0">
          <p className="text-sm text-zinc-500 text-center mb-5 font-medium">
            Choose a voice
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
            {voices.slice(0, 4).map((voice, idx) => {
              const curated = DISPLAY_VOICES[idx] || {
                label: voice.name,
                role: "Assistant",
                icon: voice.gender === "female" ? "👩" : "👨",
              };
              const isSelected = selectedVoice === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`
                    cursor-pointer relative group transition-all duration-300
                    flex flex-col items-center p-4 md:p-5 rounded-2xl border
                    ${
                      isSelected
                        ? "bg-gradient-to-b from-zinc-800/80 to-zinc-900 border-white/50 scale-[1.02] shadow-xl shadow-purple-500/10"
                        : "bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800/50 backdrop-blur-sm hover:scale-[1.02]"
                    }
                  `}
                >
                  <div
                    className={`text-3xl mb-2.5 transition-all duration-300 ${isSelected ? "" : "grayscale group-hover:grayscale-0"}`}
                  >
                    {curated.icon}
                  </div>
                  <h3 className="font-bold text-sm md:text-base text-center">
                    {voice.name}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mt-1 text-center">
                    {curated.role}
                  </p>

                  {/* Play Button */}
                  <div
                    className={`mt-2.5 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isSelected ? "bg-white text-black border-white shadow-lg shadow-white/20" : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"}`}
                  >
                    <span className="text-[10px] ml-0.5">▶</span>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg border-2 border-black">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

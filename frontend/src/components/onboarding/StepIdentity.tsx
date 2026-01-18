import React, { useState } from "react";
import type { Voice } from "../../types";

interface StepIdentityProps {
  name: string;
  setName: (name: string) => void;
  streamerName: string;
  setStreamerName: (name: string) => void;
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
  streamerName,
  setStreamerName,
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
          className="modal-overlay"
          onClick={() => setShowAvatarPicker(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Choose Avatar</h2>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="modal-close"
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
                  className={`card-interactive aspect-square p-2 ${
                    currentAvatar === avatarUrl ? "selected" : ""
                  }`}
                >
                  <img
                    src={avatarUrl}
                    alt={`Avatar ${idx + 1}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="heading-xl mb-4">The Identity</h1>
        <p className="text-zinc-400 text-base md:text-lg font-medium">
          Tell us about you and your AI co-host.
        </p>
      </div>

      <div className="flex flex-col items-center justify-start gap-8 flex-1 pb-8">
        {/* Streamer Name Input */}
        <div className="w-full max-w-sm px-4 flex-shrink-0">
          <label className="text-sm text-zinc-500 text-center mb-2 font-bold uppercase tracking-wider block">
            Your Name (The Streamer)
          </label>
          <input
            type="text"
            value={streamerName}
            onChange={(e) => setStreamerName(e.target.value)}
            placeholder="What should the AI call you?"
            className="input-underline"
            autoFocus
          />
        </div>

        {/* Avatar Ring */}}
        <div
          className="relative group cursor-pointer flex-shrink-0"
          onClick={() => setShowAvatarPicker(true)}
        >
          <div className="avatar-ring w-24 h-24 md:w-28 md:h-28 animate-pulse-slow">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
              <img
                src={currentAvatar}
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                alt="Avatar"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Edit
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Name Input */}
        <div className="w-full max-w-sm px-4 flex-shrink-0">
          <label className="text-sm text-zinc-500 text-center mb-2 font-bold uppercase tracking-wider block">
            AI Co-Host Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your AI (e.g. Pickle, Glitch)"
            className="input-underline"
          />
        </div>

        {/* Voice Cards */}
        <div className="w-full px-4 md:px-6 flex-shrink-0">
          <p className="text-sm text-zinc-500 text-center mb-5 font-bold uppercase tracking-wider">
            Choose a voice
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
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
                  className={`card-interactive flex flex-col items-center p-5 ${isSelected ? "selected" : ""}`}
                >
                  <div
                    className={`text-4xl mb-3 transition-all duration-300 ${isSelected ? "" : "grayscale group-hover:grayscale-0"}`}
                  >
                    {curated.icon}
                  </div>
                  <h3 className="font-extrabold text-base text-center">
                    {voice.name}
                  </h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mt-1 text-center">
                    {curated.role}
                  </p>

                  {/* Play Button */}
                  <button
                    className={`mt-3 w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all duration-150 ${isSelected ? "bg-white text-black border-zinc-300" : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"}`}
                    style={{
                      boxShadow: isSelected
                        ? "0 3px 0 0 #a1a1aa"
                        : "0 3px 0 0 #3f3f46",
                    }}
                  >
                    <span className="text-xs font-bold">▶</span>
                  </button>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div
                      className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center text-xs font-bold border-2 border-black"
                      style={{ boxShadow: "0 2px 0 0 #16a34a" }}
                    >
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

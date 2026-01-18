import { useState, useEffect } from "react";
import "./index.css";
import type { PickleSettings, Voice, PersonaSettings } from "./types";
import { StepIdentity } from "./components/onboarding/StepIdentity";
import { StepSpirit } from "./components/onboarding/StepSpirit";
import { StepRhythm } from "./components/onboarding/StepRhythm";
import { StepReview } from "./components/onboarding/StepReview";
import { Dashboard } from "./components/Dashboard";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

// Default empty state to prevent null crashes before load
const DEFAULT_PERSONA: PersonaSettings = {
  name: "",
  personality: "",
  style: [],
  emotions: [],
  behavior: {
    spontaneous_rate: 0.1,
    cooldown: 5.0,
    chat_batch_size: 10,
    trigger_words: [],
  },
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=default",
};

function App() {
  // Wizard State
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Data State
  const [, setSettings] = useState<PickleSettings | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [persona, setPersona] = useState<PersonaSettings>(DEFAULT_PERSONA);

  // Spirit Step UI State
  const [isCustomSpirit, setIsCustomSpirit] = useState(false); // Magic/Mirror vs Custom

  // Loading/Saving
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Scroll to top when going live
  useEffect(() => {
    if (isLive) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isLive]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, voicesRes] = await Promise.all([
        fetch(`${API_BASE}/api/settings`),
        fetch(`${API_BASE}/api/voices`),
      ]);

      if (!settingsRes.ok || !voicesRes.ok)
        throw new Error("Failed to load settings");

      const settingsData = await settingsRes.json();
      const voicesData = await voicesRes.json();

      setSettings(settingsData);
      setVoices(voicesData.voices || []);

      // Initialize state from loaded settings
      if (settingsData.voice?.voice_model) {
        setSelectedVoice(settingsData.voice.voice_model);
      }
      if (settingsData.persona) {
        setPersona(settingsData.persona);
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to Pickle backend. Is it running?");
    } finally {
      // Use a timeout to safely remove loading state if needed, or just set it
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGoLive = async () => {
    setSaving(true);
    try {
      // 1. Save Voice
      await fetch(`${API_BASE}/api/settings/voice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice_model: selectedVoice }),
      });

      // 2. Save Persona
      await fetch(`${API_BASE}/api/settings/persona`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(persona),
      });

      // Go to dashboard
      setIsLive(true);
    } catch (err) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackToSettings = () => {
    setIsLive(false);
    setStep(1);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white flex-col relative">
        {/* Drag region for loading state */}
        <div className="title-bar-drag-region h-12 w-full absolute top-0 left-0 z-50"></div>

        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-blue-900/10"></div>

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-zinc-800 border-t-white rounded-full animate-spin"></div>
            <div
              className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-500/50 rounded-full animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
          </div>
          <p className="text-zinc-500 text-sm font-medium animate-pulse">
            Connecting to Pickle...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white flex-col relative overflow-hidden">
        {/* Drag region for error state */}
        <div className="title-bar-drag-region h-12 w-full absolute top-0 left-0 z-50"></div>

        {/* Subtle animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-black to-orange-900/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]"></div>

        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8 max-w-md">
          {/* Animated warning icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <span className="text-4xl">⚠️</span>
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full border border-red-500/30 animate-ping"></div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Connection Failed</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">{error}</p>
          </div>

          <button
            onClick={loadData}
            className="mt-4 px-8 py-3 bg-white text-black rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-white/20 cursor-pointer"
          >
            Try Again
          </button>

          <p className="text-zinc-600 text-xs mt-4">
            Make sure the Pickle backend is running on port 8000
          </p>
        </div>
      </div>
    );
  }

  // Show dashboard if live
  if (isLive) {
    return (
      <Dashboard
        personaName={persona.name || "AI Assistant"}
        persona={persona}
        onBackToSettings={handleBackToSettings}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans selection:bg-white/20 flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/5 via-black to-blue-900/5 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08)_0%,transparent_50%)] pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black to-transparent pointer-events-none z-30"></div>

      {/* Drag region */}
      <div className="title-bar-drag-region h-12 w-full fixed top-0 left-0 z-50"></div>

      {/* Progress Dots / Header */}
      <header className="fixed top-0 left-0 w-full p-6 md:p-8 flex justify-center items-center z-40">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                step === s
                  ? "bg-white scale-125 shadow-lg shadow-white/30"
                  : step > s
                    ? "bg-white/60"
                    : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center pt-28 pb-36 px-6 md:px-8 w-full max-w-4xl mx-auto">
        {step === 1 && (
          <StepIdentity
            name={persona.name}
            setName={(n) => setPersona({ ...persona, name: n })}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            voices={voices}
            avatar={persona.avatar}
            setAvatar={(a) => setPersona({ ...persona, avatar: a })}
          />
        )}

        {step === 2 && (
          <StepSpirit
            personality={persona.personality}
            setPersonality={(p) => setPersona({ ...persona, personality: p })}
            style={persona.style}
            setStyle={(s) => setPersona({ ...persona, style: s })}
            isCustom={isCustomSpirit}
            setIsCustom={setIsCustomSpirit}
          />
        )}

        {step === 3 && (
          <StepRhythm
            behavior={persona.behavior}
            setBehavior={(b) => setPersona({ ...persona, behavior: b })}
          />
        )}

        {step === 4 && (
          <StepReview
            name={persona.name}
            persona={persona}
            onSave={handleGoLive}
            isSaving={saving}
          />
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-40 pointer-events-none">
        <div className="pointer-events-auto">
          {step > 1 && step < 4 && (
            <button
              onClick={handleBack}
              className="group flex items-center gap-2 px-5 py-2.5 text-zinc-400 hover:text-white transition-all text-sm font-medium cursor-pointer rounded-full hover:bg-white/5"
            >
              <span className="group-hover:-translate-x-1 transition-transform">
                ←
              </span>
              Back
            </button>
          )}
        </div>

        <div className="pointer-events-auto">
          {step < 4 && (
            <button
              onClick={handleNext}
              className="group bg-white text-black px-8 py-3 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-white/20 cursor-pointer flex items-center gap-2 animate-glow"
            >
              Continue
              <span className="group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;

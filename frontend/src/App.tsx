import { useState, useEffect } from "react";
import "./index.css";
import type { PickleSettings, Voice, PersonaSettings } from "./types";
import { StepWelcome } from "./components/onboarding/StepWelcome";
import { StepIdentity } from "./components/onboarding/StepIdentity";
import { StepSpirit } from "./components/onboarding/StepSpirit";
import { StepRhythm } from "./components/onboarding/StepRhythm";
import { StepReview } from "./components/onboarding/StepReview";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

// Default persona state - used before backend loads or if user skips onboarding
const DEFAULT_PERSONA: PersonaSettings = {
  name: "John",
  personality: "John is an enthusiastic and supportive AI companion. He loves making witty observations and engaging with chat. He's knowledgeable but never condescending. He has a playful sense of humor and genuine curiosity about the world.",
  style: [
    "Keep responses under 2 sentences",
    "Use casual, conversational language",
    "React with genuine emotion",
    "Be supportive of the streamer"
  ],
  emotions: [],
  behavior: {
    spontaneous_rate: 0.5,
    cooldown: 10.0,
    chat_batch_size: 10,
    trigger_words: [],
  },
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=default",
};

function App() {
  // Wizard State - 0 = welcome, 1-4 = steps
  const [step, setStep] = useState(0);
  const totalSteps = 5; // 0=welcome, 1=identity, 2=spirit, 3=rhythm, 4=review

  // Data State
  const [, setSettings] = useState<PickleSettings | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [persona, setPersona] = useState<PersonaSettings>(DEFAULT_PERSONA);

  // Spirit Step UI State
  const [isCustomSpirit, setIsCustomSpirit] = useState(false);

  // Loading/Saving
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

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
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGetStarted = () => {
    setStep(1);
  };

  const handleRedo = () => {
    setSaved(false);
    setStep(0);
  };

  const handleSave = async () => {
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

      setSaved(true);
    } catch (err) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
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
          {/* Warning icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-full border border-red-500/30 animate-ping"></div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Connection Failed</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">{error}</p>
          </div>

          <button onClick={loadData} className="btn-primary mt-4">
            Try Again
          </button>

          <p className="text-zinc-600 text-xs mt-4">
            Make sure the Pickle backend is running on port 8000
          </p>
        </div>
      </div>
    );
  }

  // Show success screen after saving
  if (saved) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white flex-col relative overflow-hidden">
        <div className="title-bar-drag-region h-12 w-full absolute top-0 left-0 z-50"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-blue-900/10"></div>

        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8 max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/40">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Settings Saved!</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              <span className="gradient-text font-bold">{persona.name}</span> is ready to give your chat a voice.
            </p>
          </div>

          <button onClick={handleRedo} className="btn-ghost mt-4 text-zinc-500 hover:text-white">
            Redo Onboarding
          </button>
        </div>
      </div>
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

      {/* Progress Dots / Header - only show after welcome */}
      {step > 0 && (
        <header className="fixed top-0 left-0 w-full p-6 md:p-8 flex justify-center items-center z-40">
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`progress-dot ${
                  step === s ? "active" : step > s ? "completed" : "pending"
                }`}
              />
            ))}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center pt-28 pb-36 px-6 md:px-8 w-full max-w-4xl mx-auto">
        {step === 0 && (
          <StepWelcome onGetStarted={handleGetStarted} />
        )}

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
            onSave={handleSave}
            onRedo={handleRedo}
            isSaving={saving}
          />
        )}
      </main>

      {/* Navigation Footer - only show for steps 1-3 */}
      {step > 0 && step < 4 && (
        <footer className="fixed bottom-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-40 pointer-events-none">
          <div className="pointer-events-auto">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="btn-ghost btn-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
          </div>

          <div className="pointer-events-auto">
            <button
              onClick={handleNext}
              className="btn-primary flex items-center gap-2 animate-glow"
            >
              Continue
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;

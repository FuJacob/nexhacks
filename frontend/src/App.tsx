import { useState, useEffect } from "react";
import "./index.css";
import type { 
  PickleSettings, 
  Voice, 
  PersonaSettings
} from "./types";
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
  emotions: ["neutral", "happy", "excited", "surprised", "thinking", "laughing"],
  behavior: {
    spontaneous_rate: 0.5,
    cooldown: 10.0,
    chat_batch_size: 10,
    trigger_words: ["john", "hey ai", "bot"]
  }
};

function App() {
  // Wizard State
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  
  // Data State
  const [settings, setSettings] = useState<PickleSettings | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [persona, setPersona] = useState<PersonaSettings>(DEFAULT_PERSONA);
  
  // Spirit Step UI State
  const [isCustomSpirit, setIsCustomSpirit] = useState(false); // Magic/Mirror vs Custom

  // Loading/Saving
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, voicesRes] = await Promise.all([
        fetch(`${API_BASE}/api/settings`),
        fetch(`${API_BASE}/api/voices`),
      ]);

      if (!settingsRes.ok || !voicesRes.ok) throw new Error("Failed to load settings");

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

      // Success visual (maybe redirect or show a "Done" state)
      alert("Settings Saved! You are ready to stream.");
    } catch (err) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white flex-col gap-4">
        <div className="text-red-500 text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold">Connection Failed</h1>
        <p className="text-zinc-400">{error}</p>
        <button 
          onClick={loadData}
          className="px-4 py-2 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 flex flex-col">
      <div className="title-bar-drag-region h-8 w-full absolute top-0 left-0 z-50"></div>
      
      {/* Progress Dots / Header */}
      <header className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-40">
        <img src="/logo.png" alt="Pickle" className="h-8 w-8 grayscale opacity-50" />
        
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`w-2 h-2 rounded-full transition-all duration-500 ${step >= s ? 'bg-white' : 'bg-zinc-800'}`}
            />
          ))}
        </div>
        
        <div className="w-8"></div> {/* Spacer balance */}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-32 px-8">
        
        {step === 1 && (
          <StepIdentity 
            name={persona.name} 
            setName={(n) => setPersona({...persona, name: n})}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            voices={voices}
          />
        )}

        {step === 2 && (
          <StepSpirit 
            personality={persona.personality}
            setPersonality={(p) => setPersona({...persona, personality: p})}
            style={persona.style}
            setStyle={(s) => setPersona({...persona, style: s})}
            isCustom={isCustomSpirit}
            setIsCustom={setIsCustomSpirit}
          />
        )}

        {step === 3 && (
            <StepRhythm 
              behavior={persona.behavior}
              setBehavior={(b) => setPersona({...persona, behavior: b})}
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
      <footer className="fixed bottom-0 left-0 w-full p-8 flex justify-between items-center z-40 bg-gradient-to-t from-black via-black to-transparent h-32 pointer-events-none">
         <div className="pointer-events-auto">
            {step > 1 && step < 4 && (
                <button 
                  onClick={handleBack}
                  className="px-6 py-2 text-zinc-500 hover:text-white transition-colors text-lg font-medium cursor-pointer"
                >
                  Back
                </button>
            )}
         </div>

         <div className="pointer-events-auto">
            {step < 4 && (
                <button 
                  onClick={handleNext}
                  className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-cyan-500/20 cursor-pointer"
                >
                  Continue
                </button>
            )}
         </div>
      </footer>
    
    </div>
  );
}

export default App;

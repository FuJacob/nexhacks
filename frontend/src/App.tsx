import { useState, useEffect } from "react";
import "./index.css";

interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
}

interface VoiceSettings {
  voice_model: string;
  sample_rate: number;
}

interface PickleSettings {
  voice: VoiceSettings;
  persona_name: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function App() {
  const [settings, setSettings] = useState<PickleSettings | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

      if (!settingsRes.ok || !voicesRes.ok) {
        throw new Error("Failed to load settings");
      }

      const settingsData = await settingsRes.json();
      const voicesData = await voicesRes.json();

      setSettings(settingsData);
      setVoices(voicesData.voices);
      setSelectedVoice(settingsData.voice.voice_model);
    } catch (err) {
      setError(
        "Could not connect to Pickle backend. Make sure the server is running on port 8000.",
      );
    } finally {
      setLoading(false);
    }
  };

  const saveVoiceSettings = async () => {
    if (!selectedVoice) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`${API_BASE}/api/settings/voice`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voice_model: selectedVoice,
          sample_rate: settings?.voice.sample_rate || 24000,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      const updatedVoice = await response.json();
      setSettings((prev) => (prev ? { ...prev, voice: updatedVoice } : null));
      setSuccessMessage("Voice settings saved successfully!");

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to save voice settings");
    } finally {
      setSaving(false);
    }
  };

  const getVoiceInfo = (voiceId: string): Voice | undefined => {
    return voices.find((v) => v.id === voiceId);
  };

  if (loading) {
    return (
      <div className="max-w-[1000px] mx-auto p-8 min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-[60vh] text-zinc-400">
          <div className="w-10 h-10 border-4 border-zinc-800 border-t-white rounded-full animate-spin"></div>
          <p className="text-lg">Loading Pickle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto p-8 min-h-screen flex flex-col">
      <div className="title-bar-drag-region"></div>
      <header className="mb-12 pt-4 flex flex-col items-center">
        <div className="flex items-center gap-4 mb-2">
          <img
            src="logo.png"
            alt="Logo"
            className="h-12 w-auto grayscale rounded-xl"
          />
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Pickle
          </h1>
        </div>
        <p className="text-zinc-400 text-base font-normal tracking-wide uppercase">
          AI Persona Settings
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-4 p-4 md:px-6 rounded-xl mb-8 font-medium border border-white bg-zinc-950 text-white border-l-4">
          <span className="text-xl grayscale">⚠️</span>
          {error}
          <button
            onClick={loadData}
            className="ml-auto bg-white text-black border-none py-1.5 px-3 rounded cursor-pointer font-semibold text-sm hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-4 p-4 md:px-6 rounded-xl mb-8 font-medium border border-zinc-500 bg-zinc-950 text-white border-l-4">
          <span className="text-xl grayscale">✓</span>
          {successMessage}
        </div>
      )}

      <main className="flex-1">
        <section className="bg-zinc-950 rounded-xl p-10 border border-zinc-800 shadow-2xl">
          <h2 className="flex items-center gap-3 text-xl font-semibold mb-8 text-white uppercase tracking-wider border-b border-zinc-800 pb-4">
            <span className="text-xl grayscale">🎙️</span>
            Voice Settings
          </h2>

          <div className="mb-10">
            <label
              className="block font-semibold mb-2 text-white"
              htmlFor="voice-select"
            >
              Voice Model
            </label>
            <p className="text-zinc-400 text-sm mb-6">
              Choose the voice for your AI persona
            </p>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  className={`flex items-center gap-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer text-zinc-400 transition-all duration-200 relative text-left hover:border-zinc-500 hover:text-white hover:bg-zinc-950 ${
                    selectedVoice === voice.id
                      ? "bg-black border-white text-white shadow-[0_0_0_1px_white]"
                      : ""
                  }`}
                  onClick={() => setSelectedVoice(voice.id)}
                >
                  <div className="text-2xl grayscale bg-zinc-950 w-10 h-10 flex items-center justify-center rounded-full border border-zinc-800">
                    {voice.gender === "female" ? "👩" : "👨"}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-base">
                      {voice.name}
                    </span>
                    <span className="text-xs opacity-70">
                      {voice.gender} • {voice.accent}
                    </span>
                  </div>
                  {selectedVoice === voice.id && (
                    <span className="absolute top-4 right-4 text-xs text-white">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {settings && (
            <div className="mt-8 p-6 bg-black border border-zinc-800 rounded-xl">
              <h3 className="text-sm uppercase tracking-wider text-zinc-500 mb-4">
                Current Configuration
              </h3>
              <div className="flex justify-between mb-2 text-[0.95rem] border-b border-zinc-900 pb-2 last:border-0 last:pb-0 last:mb-0">
                <span className="text-zinc-400">Active Voice:</span>
                <span className="font-semibold font-mono text-white">
                  {getVoiceInfo(settings.voice.voice_model)?.name ||
                    settings.voice.voice_model}
                </span>
              </div>
              <div className="flex justify-between mb-2 text-[0.95rem] border-b border-zinc-900 pb-2 last:border-0 last:pb-0 last:mb-0">
                <span className="text-zinc-400">Sample Rate:</span>
                <span className="font-semibold font-mono text-white">
                  {settings.voice.sample_rate} Hz
                </span>
              </div>
            </div>
          )}

          <div className="mt-10 flex gap-4 pt-6 border-t border-zinc-800 justify-end flex-col sm:flex-row">
            <button
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold cursor-pointer transition-all duration-200 text-[0.95rem] bg-white text-black border border-white hover:opacity-90 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={saveVoiceSettings}
              disabled={saving || selectedVoice === settings?.voice.voice_model}
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/10 border-t-black rounded-full animate-spin mr-2"></span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold cursor-pointer transition-all duration-200 text-[0.95rem] bg-transparent text-white border border-zinc-800 hover:border-white hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() =>
                setSelectedVoice(settings?.voice.voice_model || "")
              }
              disabled={selectedVoice === settings?.voice.voice_model}
            >
              Reset
            </button>
          </div>
        </section>
      </main>

      <footer className="text-center text-zinc-600 mt-12 text-xs py-8 border-t border-zinc-900">
        <p>Pickle AI • Voice Persona System</p>
      </footer>
    </div>
  );
}

export default App;

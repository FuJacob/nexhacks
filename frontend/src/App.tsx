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

const API_BASE = "http://localhost:8000";

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
      <div className="app-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Pickle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <span className="logo-icon">🥒</span>
          <h1>Pickle</h1>
        </div>
        <p className="tagline">AI Persona Settings</p>
      </header>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
          <button onClick={loadData} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✓</span>
          {successMessage}
        </div>
      )}

      <main className="settings-container">
        <section className="settings-section">
          <h2>
            <span className="section-icon">🎙️</span>
            Voice Settings
          </h2>

          <div className="setting-group">
            <label htmlFor="voice-select">Voice Model</label>
            <p className="setting-description">
              Choose the voice for your AI persona
            </p>

            <div className="voice-grid">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  className={`voice-card ${
                    selectedVoice === voice.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedVoice(voice.id)}
                >
                  <div className="voice-avatar">
                    {voice.gender === "female" ? "👩" : "👨"}
                  </div>
                  <div className="voice-info">
                    <span className="voice-name">{voice.name}</span>
                    <span className="voice-details">
                      {voice.gender} • {voice.accent}
                    </span>
                  </div>
                  {selectedVoice === voice.id && (
                    <span className="check-mark">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {settings && (
            <div className="current-settings">
              <h3>Current Configuration</h3>
              <div className="config-item">
                <span className="config-label">Active Voice:</span>
                <span className="config-value">
                  {getVoiceInfo(settings.voice.voice_model)?.name ||
                    settings.voice.voice_model}
                </span>
              </div>
              <div className="config-item">
                <span className="config-label">Sample Rate:</span>
                <span className="config-value">
                  {settings.voice.sample_rate} Hz
                </span>
              </div>
            </div>
          )}

          <div className="action-bar">
            <button
              className="btn btn-primary"
              onClick={saveVoiceSettings}
              disabled={saving || selectedVoice === settings?.voice.voice_model}
            >
              {saving ? (
                <>
                  <span className="btn-spinner"></span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
            <button
              className="btn btn-secondary"
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

      <footer className="app-footer">
        <p>Pickle AI • Voice Persona System</p>
      </footer>
    </div>
  );
}

export default App;

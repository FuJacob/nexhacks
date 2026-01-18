export interface Voice {
  id: string;
  name: string;
  gender: string;
  accent: string;
  category?: "bestie" | "hype" | "mod" | "assistant"; // For the UI helper
}

export interface BehaviorSettings {
  vision_rate: number;
  speech_rate: number;
  cooldown: number;
  chat_batch_size: number;
  trigger_words: string[];
}

export interface PersonaSettings {
  name: string;
  streamer_name: string;
  personality: string;
  style: string[];
  emotions: string[];
  behavior: BehaviorSettings;
  avatar?: string;
}

export interface VoiceSettings {
  voice_model: string;
}

export interface PickleSettings {
  voice: VoiceSettings;
  persona: PersonaSettings;
}

// Convert "Presence" (0-100) to actual backend values
export const getPresenceValues = (value: number) => {
  // 0-33: Quiet Observer
  // 34-66: Balanced
  // 67-100: Main Character/Chaotic

  const intensity = value / 100;

  return {
    // Vision rate stays low to avoid loops, but bumps slightly for high energy
    vision_rate: 0.1, 
    // Speech rate controls the main "chattiness"
    speech_rate: parseFloat((intensity * 0.9).toFixed(2)), // 0.0 to 0.9
    cooldown: Math.max(2.0, 30 - intensity * 28), // 30s down to 2s
    chat_batch_size: Math.max(1, Math.round(15 - intensity * 14)), // 15 down to 1
  };
};

// Convert backend values back to an approximate Presence score (0-100) for initial state
export const calculatePresenceScore = (behavior: BehaviorSettings): number => {
  // We prioritize speech rate as the main indicator
  // 0.9 -> 100
  // 0.0 -> 0
  return Math.min(100, Math.round((behavior.speech_rate / 0.9) * 100));
};

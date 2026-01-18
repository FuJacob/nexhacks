"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Download,
  Zap,
  Eye,
  MessageSquare,
  Mic,
  Brain,
  Shield,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Github,
  Twitter,
} from "lucide-react";
import {
  Navbar,
  NavBody,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavItems,
  NavbarButton,
} from "@/components/ui/resizable-navbar";

// Intro Animation Overlay
function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => {
        setPhase(4);
        setTimeout(onComplete, 500);
      }, 3000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        phase >= 4 ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Ripple effects */}
      <div className="absolute inset-0 flex items-center justify-center">
        {phase >= 1 && (
          <>
            <div
              className="absolute w-32 h-32 rounded-full border border-[#4a7c59]/30 animate-ripple-out"
              style={{ animationDelay: "0s" }}
            />
            <div
              className="absolute w-32 h-32 rounded-full border border-[#4a7c59]/20 animate-ripple-out"
              style={{ animationDelay: "0.3s" }}
            />
            <div
              className="absolute w-32 h-32 rounded-full border border-[#4a7c59]/10 animate-ripple-out"
              style={{ animationDelay: "0.6s" }}
            />
          </>
        )}
      </div>

      {/* Glow background */}
      <div
        className={`absolute w-[600px] h-[600px] rounded-full transition-all duration-1000 ${
          phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-50"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(74, 124, 89, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Pickle Logo */}
      <div className={`relative z-10 ${phase >= 1 ? "" : "opacity-0"}`}>
        <img
          src="/logo.png"
          alt="Pickle"
          className={`w-32 h-32 md:w-40 md:h-40 rounded-xl ${phase >= 1 ? "animate-pickle-reveal animate-pickle-glow" : ""}`}
        />
      </div>

      {/* Text */}
      <div className="relative z-10 mt-8 text-center">
        <h1
          className={`text-4xl md:text-6xl font-bold text-white transition-all duration-700 ${
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ filter: phase >= 2 ? "blur(0)" : "blur(10px)" }}
        >
          Pickle
        </h1>
        <p
          className={`mt-3 text-zinc-400 text-lg md:text-xl transition-all duration-700 ${
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{
            filter: phase >= 3 ? "blur(0)" : "blur(10px)",
            transitionDelay: "0.2s",
          }}
        >
          Your AI Streaming Companion
        </p>
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <div
      className="feature-card group p-6 md:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-900/80"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 rounded-xl bg-[#4a7c59]/20 border border-[#4a7c59]/30 flex items-center justify-center mb-5 group-hover:bg-[#4a7c59]/30 transition-colors">
        <Icon className="w-6 h-6 text-[#5a9c6d]" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-zinc-800 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium text-white group-hover:text-[#5a9c6d] transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 pb-6" : "max-h-0"
        }`}
      >
        <p className="text-zinc-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const handleIntroComplete = () => {
    setShowIntro(false);
    setTimeout(() => setContentVisible(true), 100);
  };

  const features = [
    {
      icon: MessageSquare,
      title: "Intelligent Chat",
      description:
        "Powered by Google Gemini, Pickle understands context and responds naturally to your Twitch chat in real-time.",
    },
    {
      icon: Eye,
      title: "Real-Time Vision",
      description:
        "See what you see. Pickle uses Overshoot AI to analyze your camera feed and react to what's happening around you.",
    },
    {
      icon: Mic,
      title: "Dynamic TTS",
      description:
        "High-quality text-to-speech brings Pickle to life with natural, expressive voice responses during your streams.",
    },
    {
      icon: Brain,
      title: "Long-Term Memory",
      description:
        "ChromaDB-powered memory means Pickle remembers past conversations, creating deeper, more meaningful interactions.",
    },
    {
      icon: Sparkles,
      title: "Custom Personas",
      description:
        "Define your AI's personality, style, and behavior through simple YAML configuration files.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description:
        "All processing happens locally. Your stream data never leaves your machine without your explicit consent.",
    },
  ];

  const faqs = [
    {
      question: "What is Pickle AI?",
      answer:
        "Pickle is an AI companion designed specifically for IRL Twitch streamers. It integrates with your chat, can see through your camera, and responds with its own voice and personality—making your streams more interactive and engaging.",
    },
    {
      question: "What do I need to run Pickle?",
      answer:
        "You'll need a Mac with macOS 12 or later, Node.js 18+, Python 3.11+, and API keys for Google Gemini and Twitch. Optional: Overshoot API key for vision features.",
    },
    {
      question: "Is Pickle free to use?",
      answer:
        "Pickle itself is free and open source. However, you'll need API keys for third-party services like Google Gemini (for AI responses) which may have their own pricing.",
    },
    {
      question: "Can I customize Pickle's personality?",
      answer:
        "Absolutely! Pickle uses YAML configuration files to define personality traits, speaking style, emotions, and behavior patterns. You have full control over how your AI companion acts.",
    },
    {
      question: "Does Pickle work with OBS?",
      answer:
        "Yes! Pickle includes a built-in overlay system that integrates seamlessly with OBS and other streaming software via browser sources.",
    },
  ];

  return (
    <>
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}

      <div
        ref={mainRef}
        className={`min-h-screen bg-black text-white transition-opacity duration-700 ${
          contentVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Grid pattern background */}
        <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />

        {/* Gradient glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] gradient-pickle-radial pointer-events-none" />

        {/* Navigation */}
        <Navbar className="top-0">
          {/* Desktop Navigation */}
          <NavBody>
            <a href="#" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Pickle"
                className="w-10 h-10 rounded-xl"
              />
              <span className="text-xl font-bold text-white">Pickle</span>
            </a>
            <NavItems
              items={[
                { name: "Features", link: "#features" },
                { name: "FAQ", link: "#faq" },
                {
                  name: "GitHub",
                  link: "https://github.com/yourusername/pickle-ai",
                },
              ]}
            />
            <NavbarButton href="#download" variant="dark">
              Download
            </NavbarButton>
          </NavBody>

          {/* Mobile Navigation */}
          <MobileNav>
            <MobileNavHeader>
              <a href="#" className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Pickle"
                  className="w-8 h-8 rounded-xl"
                />
                <span className="text-lg font-bold text-white">Pickle</span>
              </a>
              <MobileNavToggle
                isOpen={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              />
            </MobileNavHeader>
            <MobileNavMenu
              isOpen={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
            >
              <a
                href="#features"
                className="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#faq"
                className="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </a>
              <a
                href="https://github.com/yourusername/pickle-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                GitHub
              </a>
              <NavbarButton href="#download" variant="dark" className="w-full">
                Download
              </NavbarButton>
            </MobileNavMenu>
          </MobileNav>
        </Navbar>

        {/* Hero Section */}
        <section className="relative pt-32 md:pt-44 pb-20 md:pb-32 px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass-pickle mb-8 ${
                contentVisible ? "animate-fade-in-down" : "opacity-0"
              }`}
              style={{ animationDelay: "0.1s" }}
            >
              <Zap className="w-4 h-4 text-[#5a9c6d]" />
              <span className="text-sm text-[#5a9c6d] font-medium">
                Now available for macOS
              </span>
            </div>

            {/* Headline */}
            <h1
              className={`text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-tight mb-6 ${
                contentVisible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: "0.2s" }}
            >
              Your AI Streaming
              <br />
              <span className="text-gradient-pickle">Companion</span>
            </h1>

            {/* Subheadline */}
            <p
              className={`text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed ${
                contentVisible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: "0.3s" }}
            >
              Intelligent chat interaction, real-time vision, and dynamic
              personality— Pickle brings your IRL Twitch streams to life with
              AI-powered engagement.
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${
                contentVisible ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: "0.4s" }}
            >
              <a
                href="#download"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-semibold text-lg hover:bg-zinc-200 transition-all hover:scale-105 shadow-lg shadow-white/10"
              >
                <Download className="w-5 h-5" />
                Download for Mac
                <span className="text-sm text-zinc-500 font-normal">
                  (.dmg)
                </span>
              </a>
              <a
                href="https://github.com/yourusername/pickle-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-zinc-700 text-zinc-300 font-medium hover:border-zinc-500 hover:text-white transition-all"
              >
                <Github className="w-5 h-5" />
                View Source
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* App Preview */}
          <div
            className={`max-w-5xl mx-auto mt-16 md:mt-24 ${
              contentVisible ? "animate-scale-in" : "opacity-0"
            }`}
            style={{ animationDelay: "0.5s" }}
          >
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/50">
              {/* Window controls */}
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-4 text-sm text-zinc-500">
                  Pickle AI — Settings
                </span>
              </div>
              {/* Preview content */}
              <div className="bg-black p-8 md:p-12">
                <div className="flex items-center gap-4 mb-8">
                  <img
                    src="/logo.png"
                    alt="Pickle"
                    className="w-12 h-12 rounded-xl"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Pickle</h2>
                    <p className="text-zinc-500 text-sm uppercase tracking-wider">
                      AI Persona Settings
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-zinc-400" />
                      Voice Settings
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-black border border-zinc-700">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                          👨
                        </div>
                        <div>
                          <span className="text-white font-medium">Adam</span>
                          <span className="text-xs text-zinc-500 block">
                            male • american
                          </span>
                        </div>
                        <span className="ml-auto text-white text-sm">✓</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-zinc-400" />
                      Persona
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Name:</span>
                        <span className="text-white font-mono">Pickle</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Personality:</span>
                        <span className="text-white font-mono">
                          Witty & Playful
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-32 px-6 relative">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full glass text-sm text-zinc-400 mb-4">
                Features
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Everything you need for
                <br />
                <span className="text-gradient-pickle">engaging streams</span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Pickle combines cutting-edge AI with a streamer-first approach
                to create the ultimate interactive companion.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  {...feature}
                  delay={index * 100}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 md:py-32 px-6 relative border-t border-zinc-900">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full glass text-sm text-zinc-400 mb-4">
                How it works
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Up and running in minutes
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Download & Install",
                  description:
                    "Grab the macOS DMG file and drag Pickle to your Applications folder.",
                },
                {
                  step: "02",
                  title: "Configure APIs",
                  description:
                    "Add your Twitch and Gemini API keys through the simple settings interface.",
                },
                {
                  step: "03",
                  title: "Go Live",
                  description:
                    "Start streaming and watch Pickle engage with your chat automatically.",
                },
              ].map((item, index) => (
                <div key={item.step} className="relative">
                  <div className="text-6xl font-bold text-zinc-400 mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-zinc-400">{item.description}</p>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-zinc-700 to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section
          id="faq"
          className="py-20 md:py-32 px-6 relative border-t border-zinc-900"
        >
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full glass text-sm text-zinc-400 mb-4">
                FAQ
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white">
                Questions? Answers.
              </h2>
            </div>

            <div className="glass rounded-2xl p-6 md:p-8">
              {faqs.map((faq) => (
                <FAQItem key={faq.question} {...faq} />
              ))}
            </div>
          </div>
        </section>

        {/* Download CTA Section */}
        <section id="download" className="py-20 md:py-32 px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Glow effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[500px] rounded-full gradient-pickle-radial opacity-50" />
            </div>

            <div className="relative z-10">
              <img
                src="/logo.png"
                alt="Pickle"
                className="w-24 h-24 rounded-xl mx-auto mb-8 animate-pickle-float animate-pickle-glow"
              />
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Ready to meet your new
                <br />
                streaming companion?
              </h2>
              <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
                Download Pickle for free and transform your IRL streams with
                AI-powered interactivity.
              </p>

              <a
                href="/downloads/Pickle-AI.dmg"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-white text-black font-semibold text-lg hover:bg-zinc-200 transition-all hover:scale-105 shadow-lg shadow-white/10"
              >
                <Download className="w-6 h-6" />
                Download for macOS
              </a>

              <p className="mt-6 text-sm text-zinc-500">
                Requires macOS 12+ • Intel & Apple Silicon
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-900 py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Pickle"
                  className="w-8 h-8 rounded-xl"
                />
                <span className="text-lg font-semibold text-white">Pickle</span>
              </div>

              <div className="flex items-center gap-6 text-zinc-400">
                <a
                  href="#features"
                  className="hover:text-white transition-colors"
                >
                  Features
                </a>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
                <a
                  href="https://github.com/yourusername/pickle-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </div>

              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/yourusername/pickle-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full glass flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com/pickle_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full glass flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-zinc-900 text-center text-sm text-zinc-500">
              <p>© 2026 Pickle AI. Open source under MIT License.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

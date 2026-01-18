import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Pickle AI - Your AI Streaming Companion",
  description:
    "The ultimate AI companion for IRL Twitch streamers. Intelligent chat interaction, real-time vision, and dynamic personality—all in one sleek package.",
  generator: "Next.js",
  keywords: [
    "AI",
    "Twitch",
    "streaming",
    "companion",
    "chatbot",
    "IRL streaming",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        />
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body className="font-sans antialiased bg-black text-white">
        {children}
      </body>
    </html>
  );
}

import "./globals.css";
import React from "react";
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { AuthProvider } from "@/lib/auth";

const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-display",
  display: "swap",
});
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "Zone 2 Coach",
  description: "Personal endurance coaching powered by your Strava data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${serif.variable} ${mono.variable}`}
    >
      <body className="min-h-screen font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

"use client";

import { useCallback, useState } from "react";

// Lightweight, dependency-free sound effects for the Randomizer Cannon, generated
// with the Web Audio API — same approach as highRollerSound.ts / weeklyRaffleSound.ts.
type SoundName = "join" | "powerup" | "shuffle" | "fire" | "winner";

const MUTE_KEY = "vp_sound_muted";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MUTE_KEY) === "1";
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", peakGain = 0.15) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Frequency-swept tone — used for the cannon's charge-up whine and its fire whoosh.
function sweep(c: AudioContext, from: number, to: number, start: number, dur: number, type: OscillatorType = "sawtooth", peakGain = 0.14) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  const t0 = c.currentTime + start;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SEQUENCES: Record<SoundName, (c: AudioContext) => void> = {
  join: (c) => tone(c, 720, 0, 0.08, "sine", 0.1),
  powerup: (c) => sweep(c, 120, 900, 0, 0.9, "sawtooth", 0.12),
  shuffle: (c) => tone(c, 300 + Math.random() * 400, 0, 0.04, "square", 0.06),
  fire: (c) => {
    sweep(c, 1200, 200, 0, 0.25, "sawtooth", 0.2);
    tone(c, 80, 0.05, 0.3, "square", 0.15);
  },
  winner: (c) => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(c, f, i * 0.09, 0.35, "triangle", 0.18));
  },
};

export function playViewerPickerSound(name: SoundName) {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume().catch(() => {});
    SEQUENCES[name](c);
  } catch {
    // Sound is a nice-to-have — never let it break the UI.
  }
}

export function useViewerPickerSound() {
  const [muted, setMuted] = useState<boolean>(() => isMuted());

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      if (!next) getCtx()?.resume().catch(() => {});
      return next;
    });
  }, []);

  return { muted, toggleMute, play: playViewerPickerSound };
}

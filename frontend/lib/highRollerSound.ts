"use client";

import { useCallback, useState } from "react";

// Lightweight, dependency-free sound effects for High Roller, generated with the
// Web Audio API (no audio files needed yet — drop real ones in later without
// touching any call site, since everything routes through playHighRollerSound).
type SoundName = "join" | "lock" | "correct" | "incorrect" | "milestone" | "leader" | "perfect" | "house";

const MUTE_KEY = "hr_sound_muted";

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

const SEQUENCES: Record<SoundName, (c: AudioContext) => void> = {
  join: (c) => tone(c, 660, 0, 0.09, "sine", 0.12),
  lock: (c) => {
    tone(c, 440, 0, 0.08, "square", 0.08);
    tone(c, 330, 0.09, 0.12, "square", 0.08);
  },
  correct: (c) => {
    tone(c, 523.25, 0, 0.09, "triangle", 0.15);
    tone(c, 783.99, 0.09, 0.14, "triangle", 0.15);
  },
  incorrect: (c) => tone(c, 180, 0, 0.22, "sawtooth", 0.12),
  milestone: (c) => {
    tone(c, 523.25, 0, 0.09, "triangle", 0.16);
    tone(c, 659.25, 0.09, 0.09, "triangle", 0.16);
    tone(c, 783.99, 0.18, 0.18, "triangle", 0.18);
  },
  leader: (c) => {
    tone(c, 659.25, 0, 0.1, "sine", 0.14);
    tone(c, 880, 0.1, 0.1, "sine", 0.14);
    tone(c, 1046.5, 0.2, 0.2, "sine", 0.16);
  },
  perfect: (c) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, i * 0.08, 0.14, "triangle", 0.16));
  },
  house: (c) => {
    tone(c, 220, 0, 0.18, "sawtooth", 0.14);
    tone(c, 164.81, 0.15, 0.28, "sawtooth", 0.14);
  },
};

export function playHighRollerSound(name: SoundName) {
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

export function useHighRollerSound() {
  const [muted, setMuted] = useState<boolean>(() => isMuted());

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      if (!next) getCtx()?.resume().catch(() => {});
      return next;
    });
  }, []);

  return { muted, toggleMute, play: playHighRollerSound };
}

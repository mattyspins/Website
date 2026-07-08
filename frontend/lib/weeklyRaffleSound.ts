"use client";

import { useCallback, useState } from "react";

// Lightweight, dependency-free sound effects for the Weekly Raffle elimination
// reveal, generated with the Web Audio API — same approach as highRollerSound.ts.
type SoundName = "start" | "tick" | "final" | "winner";

const MUTE_KEY = "wr_sound_muted";

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

function playStart(c: AudioContext) {
  tone(c, 220, 0, 0.3, "sine", 0.1);
  tone(c, 330, 0.05, 0.35, "sine", 0.08);
}

// Heartbeat-style elimination thump — pitch and gain rise with `intensity` (0
// at the start of the pool, 1 as only a couple participants remain).
function playTick(c: AudioContext, intensity: number) {
  const freq = 140 + intensity * 180;
  const gain = 0.1 + intensity * 0.12;
  tone(c, freq, 0, 0.06, "square", gain);
  tone(c, freq * 0.7, 0.05, 0.09, "square", gain * 0.8);
}

function playFinal(c: AudioContext) {
  tone(c, 392, 0, 0.5, "sawtooth", 0.14);
  tone(c, 523.25, 0.15, 0.5, "sawtooth", 0.14);
}

function playWinner(c: AudioContext) {
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(c, f, i * 0.09, 0.35, "triangle", 0.18));
}

const SEQUENCES: Record<SoundName, (c: AudioContext, intensity?: number) => void> = {
  start: playStart,
  tick: (c, intensity = 0) => playTick(c, intensity),
  final: playFinal,
  winner: playWinner,
};

export function playWeeklyRaffleSound(name: SoundName, intensity?: number) {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume().catch(() => {});
    SEQUENCES[name](c, intensity);
  } catch {
    // Sound is a nice-to-have — never let it break the UI.
  }
}

export function useWeeklyRaffleSound() {
  const [muted, setMuted] = useState<boolean>(() => isMuted());

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      if (!next) getCtx()?.resume().catch(() => {});
      return next;
    });
  }, []);

  return { muted, toggleMute, play: playWeeklyRaffleSound };
}

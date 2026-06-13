let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, peakGain: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** Soft two-note chime for the theme toggle — ascends into light mode, descends into dark mode. */
export function playThemeToggleSound(nextTheme: "light" | "dark") {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const [first, second] = nextTheme === "light" ? [880, 1318.51] : [1046.5, 698.46];
  playTone(ctx, first, now, 0.22, 0.07);
  playTone(ctx, second, now + 0.09, 0.3, 0.06);
}

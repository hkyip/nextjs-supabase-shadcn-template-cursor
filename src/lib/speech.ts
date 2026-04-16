// Browser-only text-to-speech helper for the demo.
//
// Speech synthesis is best-effort: it is unavailable on SSR, in some embedded
// webviews, and when the user has not yet interacted with the page. Callers
// should always treat this as a no-op if nothing happens.

export type SpeakOptions = {
  /** 0.1 – 10, default 1 */
  rate?: number;
  /** 0 – 2, default 1 */
  pitch?: number;
  /** 0 – 1, default 1 */
  volume?: number;
  /** BCP-47 tag, e.g. "en-US" */
  lang?: string;
};

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function speak(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSupported()) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    const synth = window.speechSynthesis;
    // Cancel any queued/in-flight speech so rapid taps feel responsive instead
    // of piling up a backlog the user has to wait through.
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(trimmed);
    utter.rate = options.rate ?? 1;
    utter.pitch = options.pitch ?? 1;
    utter.volume = options.volume ?? 1;
    if (options.lang) utter.lang = options.lang;

    synth.speak(utter);
  } catch {
    // TTS is a nice-to-have; never throw into the UI.
  }
}

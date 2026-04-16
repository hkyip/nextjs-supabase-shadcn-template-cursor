export function formatTimer(totalSeconds: number): string {
  const m = Math.floor(Math.abs(totalSeconds) / 60);
  const s = Math.abs(totalSeconds) % 60;
  const sign = totalSeconds < 0 ? "-" : "";
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
}

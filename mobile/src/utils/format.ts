export function formatEta(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  return `${minutes} min`;
}

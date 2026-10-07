export function StatusBadge({ status }: { status: string }) {
  const cls = status.toLowerCase();
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="error-banner">{message}</div>;
}

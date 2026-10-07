export function BusBrand() {
  return (
    <div className="bus-brand" aria-label="Campus Transit">
      <span className="bus-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="presentation">
          <rect x="9" y="6" width="30" height="35" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M13 13h22v13H13z" fill="#eaf7f5" />
          <path d="M13 30h22" stroke="#83c8bd" strokeWidth="4" strokeLinecap="round" />
          <path d="M24 14v11" stroke="currentColor" strokeWidth="2" />
          <circle cx="16" cy="36" r="2" fill="currentColor" />
          <circle cx="32" cy="36" r="2" fill="currentColor" />
        </svg>
      </span>
      <span className="bus-brand__name">Campus <strong>Transit</strong></span>
    </div>
  );
}

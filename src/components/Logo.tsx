// Brand mark recreated in SVG so it scales crisply at every size.

function ChairGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#9c1218" />
      <g fill="#0a0a0c">
        {/* headrest */}
        <rect x="46" y="16" width="16" height="8" rx="2" />
        {/* backrest */}
        <path d="M40 24h20c3 0 5 2 5 5v22c0 2-1 3-3 4l-2 1v4h-4V54H44v6h-4v-4l-2-1c-2-1-3-2-3-4V29c0-3 2-5 5-5z" />
        {/* tufting lines */}
        <path d="M44 28v22M50 27v24M56 28v22" stroke="#9c1218" strokeWidth="1.4" />
        {/* armrest */}
        <path d="M65 44h13c2 0 3 1 3 3s-1 3-3 3H67" stroke="#0a0a0c" strokeWidth="5" strokeLinecap="round" />
        {/* seat */}
        <path d="M34 60h32c2 0 3 1 3 3s-2 4-4 4H35c-2 0-4-2-4-4s1-3 3-3z" />
        {/* column */}
        <path d="M47 67h6l2 14h-10z" />
        {/* base */}
        <ellipse cx="50" cy="84" rx="17" ry="4.2" />
        <path d="M35 83l-10 4M65 83l10 4M50 83v6M42 84l-6 6M58 84l6 6" stroke="#0a0a0c" strokeWidth="3" strokeLinecap="round" />
        {/* footrest */}
        <path d="M60 79l14 5v3l-16-4z" />
      </g>
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return <ChairGlyph className={className} />;
}

/** Compact horizontal lockup for the navbar / footer */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <ChairGlyph className="h-9 w-9 shrink-0 drop-shadow-[0_0_8px_rgba(156,18,24,0.5)]" />
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-wide text-ivory">
          RED <span className="text-blood">CHAIRS</span>
        </span>
        <span className="text-[9px] uppercase tracking-widest2 text-gold/80">
          Barber
        </span>
      </div>
    </div>
  );
}

/** Full circular emblem, used on the hero / about / footer seal */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="arcTop" d="M 30,120 A 90,90 0 0 1 210,120" />
      </defs>
      <circle cx="120" cy="120" r="118" fill="#0a0a0c" stroke="#c9a961" strokeWidth="1.5" />
      <circle cx="120" cy="120" r="108" fill="none" stroke="#f4f1ea" strokeWidth="1" opacity="0.5" />
      <text fill="#f4f1ea" fontSize="17" letterSpacing="4" fontFamily="'Playfair Display', serif" fontWeight="600">
        <textPath href="#arcTop" startOffset="50%" textAnchor="middle">
          BARBERSHOP
        </textPath>
      </text>
      <text x="34" y="126" fill="#f4f1ea" fontSize="9" letterSpacing="1" fontFamily="Manrope, sans-serif">
        EST.
      </text>
      <text x="188" y="126" fill="#f4f1ea" fontSize="9" letterSpacing="1" fontFamily="Manrope, sans-serif">
        2021
      </text>
      <circle cx="120" cy="122" r="62" fill="#9c1218" />
      <g fill="#0a0a0c" transform="translate(70,72) scale(1.0)">
        <rect x="46" y="16" width="16" height="8" rx="2" />
        <path d="M40 24h20c3 0 5 2 5 5v22c0 2-1 3-3 4l-2 1v4h-4V54H44v6h-4v-4l-2-1c-2-1-3-2-3-4V29c0-3 2-5 5-5z" />
        <path d="M44 28v22M50 27v24M56 28v22" stroke="#9c1218" strokeWidth="1.4" />
        <path d="M65 44h13c2 0 3 1 3 3s-1 3-3 3H67" stroke="#0a0a0c" strokeWidth="5" strokeLinecap="round" />
        <path d="M34 60h32c2 0 3 1 3 3s-2 4-4 4H35c-2 0-4-2-4-4s1-3 3-3z" />
        <path d="M47 67h6l2 14h-10z" />
        <ellipse cx="50" cy="84" rx="17" ry="4.2" />
        <path d="M35 83l-10 4M65 83l10 4M50 83v6M42 84l-6 6M58 84l6 6" stroke="#0a0a0c" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 79l14 5v3l-16-4z" />
      </g>
      <text x="120" y="219" textAnchor="middle" fill="#c9a961" fontSize="10" letterSpacing="2" fontFamily="Manrope, sans-serif">
        RED CHAIRS
      </text>
    </svg>
  );
}

export default LogoWordmark;

// Renders the client-provided brand mark file exactly as designed.
// Do not redraw, recolor, or recompose this asset — only its display size
// may be adapted per placement (navbar, footer, hero, etc).
const LOGO_SRC = "/logo.png";

interface LogoProps {
  className?: string;
}

/** Compact lockup for the navbar / footer */
export function LogoWordmark({ className }: LogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Red Chairs Barber"
      className={`object-contain ${className ?? "h-14 w-auto"}`}
    />
  );
}

/** Larger placement for the hero / about seal */
export function LogoBadge({ className }: LogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Red Chairs Barber"
      className={`object-contain ${className ?? "h-32 w-32"}`}
    />
  );
}

export default LogoWordmark;

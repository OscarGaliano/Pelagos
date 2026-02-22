/**
 * Dibujo de la luna según su fase (0 = nueva, 0.5 = llena, 1 = nueva).
 * SVG: círculo iluminado con sombra que se desplaza.
 */
interface MoonPhaseIconProps {
  phase: number;
  size?: number;
  className?: string;
}

export function MoonPhaseIcon({ phase, size = 80, className = '' }: MoonPhaseIconProps) {
  const r = size * 0.44;
  const cx = size / 2;
  const cy = size / 2;
  const shadowOffset = phase * 2 * r;
  const shadowCx = cx + shadowOffset;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#e2e8f0"
        stroke="rgba(34, 211, 238, 0.4)"
        strokeWidth={1}
      />
      <circle
        cx={shadowCx}
        cy={cy}
        r={r}
        fill="#0c1f3a"
      />
    </svg>
  );
}

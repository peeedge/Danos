const PIECES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const distance = 90 + (i % 3) * 40;
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance),
    delay: (i % 4) * 40,
    shape: i % 3,
  };
});

/** A brief burst of gold sparks. Hidden entirely when the user prefers reduced motion. */
export function Celebration() {
  return (
    <div className="celebration" aria-hidden="true">
      {PIECES.map((piece, i) => (
        <span
          key={i}
          className={`celebration__piece celebration__piece--${piece.shape}`}
          style={{
            ['--x' as string]: `${piece.x}px`,
            ['--y' as string]: `${piece.y}px`,
            animationDelay: `${piece.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

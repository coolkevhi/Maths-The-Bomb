import React, { useEffect, useState } from 'react';
import '../styles/ExplosionVFX.css';

/**
 * ExplosionVFX — a brief particle burst rendered absolutely at (x, y).
 * Unmounts itself after the animation completes.
 */
export default function ExplosionVFX({ x, y, onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 900);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    distance: 40 + Math.random() * 40,
    size: 6 + Math.random() * 8,
    color: ['#ff4400', '#ff9900', '#ffcc00', '#ff3300'][Math.floor(Math.random() * 4)],
    dur: 0.5 + Math.random() * 0.4,
    delay: Math.random() * 0.15,
  }));

  return (
    <div
      className="explosion-root"
      style={{ left: x, top: y }}
      aria-hidden="true"
    >
      {/* Flash ring */}
      <div className="explosion-ring" />
      {/* Core flash */}
      <div className="explosion-core">💥</div>
      {/* Particles */}
      {particles.map((p) => {
        const rad = p.angle * (Math.PI / 180);
        const tx  = Math.cos(rad) * p.distance;
        const ty  = Math.sin(rad) * p.distance;
        return (
          <div
            key={p.id}
            className="explosion-particle"
            style={{
              width:  p.size,
              height: p.size,
              background: p.color,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

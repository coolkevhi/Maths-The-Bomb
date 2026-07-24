import React from 'react';

/**
 * AnalogClock — renders a clock face for clock-topic questions.
 * Props: hourAngle, minuteAngle (both in degrees, 0 = 12 o'clock)
 */
export default function AnalogClock({ hourAngle = 0, minuteAngle = 0, size = 140 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 4;

  // Generate hour tick marks
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const inner = r * 0.82;
    const outer = r * 0.96;
    return {
      x1: cx + Math.cos(angle) * inner,
      y1: cy + Math.sin(angle) * inner,
      x2: cx + Math.cos(angle) * outer,
      y2: cy + Math.sin(angle) * outer,
    };
  });

  // Hand endpoints
  function handEnd(angleDeg, length) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + Math.cos(rad) * length, y: cy + Math.sin(rad) * length };
  }

  const hour   = handEnd(hourAngle, r * 0.55);
  const minute = handEnd(minuteAngle, r * 0.78);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Face */}
      <circle cx={cx} cy={cy} r={r} fill="#0f1730" stroke="#00ff88" strokeWidth={2} />

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={i === 0 ? '#00ff88' : 'rgba(255,255,255,0.4)'} strokeWidth={i === 0 ? 2.5 : 1.5} strokeLinecap="round" />
      ))}

      {/* Hour hand */}
      <line x1={cx} y1={cy} x2={hour.x} y2={hour.y}
        stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />

      {/* Minute hand */}
      <line x1={cx} y1={cy} x2={minute.x} y2={minute.y}
        stroke="#00ff88" strokeWidth={2.5} strokeLinecap="round" />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={4} fill="#00ff88" />
    </svg>
  );
}

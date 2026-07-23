import React, { useMemo } from 'react';

export default function Stars({ count = 60 }) {
  const stars = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top:  `${Math.random() * 100}%`,
      dur:  `${2 + Math.random() * 4}s`,
      delay:`${Math.random() * 5}s`,
    }));
  }, [count]);

  return (
    <div className="stars-bg" aria-hidden="true">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{ left: s.left, top: s.top, '--dur': s.dur, '--delay': s.delay }}
        />
      ))}
    </div>
  );
}

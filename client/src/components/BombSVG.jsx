import React from 'react';

// Maps equipped bomb skin ID to visual config
const BOMB_SKINS = {
  bomb_default:  { body: '#1a1a1a', bodyAlt: '#2a2a2a', shine: '#333',    fuse: '#8b6914', fuseGlow: '#ff9900', accent: null,     label: null  },
  bomb_red:      { body: '#9b1111', bodyAlt: '#cc2222', shine: '#dd3333', fuse: '#8b6914', fuseGlow: '#ff4400', accent: null,     label: null  },
  bomb_dynamite: { body: '#8b4c11', bodyAlt: '#aa6622', shine: '#cc7733', fuse: '#cc4400', fuseGlow: '#ff6600', accent: '#cc2200',label: 'TNT' },
  bomb_neon:     { body: '#002200', bodyAlt: '#004400', shine: '#00ff44', fuse: '#00cc44', fuseGlow: '#00ff88', accent: '#00ff44',label: null  },
  bomb_ice:      { body: '#0a2a4a', bodyAlt: '#1144aa', shine: '#88ccff', fuse: '#4488cc', fuseGlow: '#aaddff', accent: '#88ddff',label: null  },
  bomb_gold:     { body: '#7a5c00', bodyAlt: '#c49000', shine: '#ffe066', fuse: '#cc9900', fuseGlow: '#ffdd00', accent: '#ffd700',label: null  },
  bomb_skull:    { body: '#dddddd', bodyAlt: '#ffffff', shine: '#ffffff', fuse: '#555555', fuseGlow: '#aaaaaa', accent: '#222222',label: '💀'  },
  bomb_lava:     { body: '#550000', bodyAlt: '#991100', shine: '#ff6600', fuse: '#cc2200', fuseGlow: '#ff4400', accent: '#ff8800',label: null  },
  bomb_cosmic:   { body: '#0d0022', bodyAlt: '#2a0055', shine: '#9933ff', fuse: '#6600cc', fuseGlow: '#cc66ff', accent: '#aa44ff',label: null  },
  bomb_toxic:    { body: '#0a2200', bodyAlt: '#1a4400', shine: '#88ff00', fuse: '#44aa00', fuseGlow: '#aaff00', accent: '#66ff00',label: '☣'  },
  bomb_candy:    { body: '#550033', bodyAlt: '#cc0066', shine: '#ff66cc', fuse: '#ff44aa', fuseGlow: '#ff88dd', accent: '#ff44aa',label: null  },
  bomb_crystal:  { body: '#003344', bodyAlt: '#005577', shine: '#00eeff', fuse: '#0099bb', fuseGlow: '#00ddff', accent: '#00ccee',label: null  },
  bomb_shadow:   { body: '#050508', bodyAlt: '#0f0f18', shine: '#332244', fuse: '#220033', fuseGlow: '#8800ff', accent: '#440088',label: null  },
  bomb_thunder:  { body: '#221100', bodyAlt: '#443300', shine: '#ffee00', fuse: '#cc9900', fuseGlow: '#ffff00', accent: '#ffcc00',label: '⚡'  },
  bomb_rainbow:  { body: '#220022', bodyAlt: '#440044', shine: '#ff00ff', fuse: '#ff0088', fuseGlow: '#ff88ff', accent: null,     label: null, rainbow: true },
};

/**
 * BombSVG — renders an animated bomb.
 * Props:
 *   skinId     — bomb skin ID from CATALOG
 *   timerSecs  — seconds remaining shown on the bomb face
 *   isCritical — bool, triggers extra animation
 *   size       — diameter in px (default 80)
 */
export default function BombSVG({ skinId = 'bomb_default', timerSecs = null, isCritical = false, size = 80 }) {
  const skin = BOMB_SKINS[skinId] || BOMB_SKINS.bomb_default;
  const r = size / 2;
  const bodyY = r + size * 0.2;
  const bodyR = r * 0.88;

  // Rainbow cycling gradient IDs need to be unique per render
  const gradId = `bg-${skinId}-${size}`;
  const glowId = `glow-${skinId}-${size}`;

  return (
    <svg
      width={size}
      height={size + size * 0.35}
      viewBox={`0 0 ${size} ${size + size * 0.35}`}
      aria-label="Bomb"
      style={{
        overflow: 'visible',
        filter: isCritical
          ? `drop-shadow(0 0 ${size * 0.18}px #ff4400)`
          : skin.accent
            ? `drop-shadow(0 0 ${size * 0.1}px ${skin.accent}88)`
            : `drop-shadow(0 0 ${size * 0.08}px rgba(0,0,0,0.8))`,
      }}
    >
      <defs>
        <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={skin.bodyAlt} />
          <stop offset="100%" stopColor={skin.body} />
        </radialGradient>
        {skin.accent && (
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor={skin.accent + '44'} />
          </radialGradient>
        )}
        {/* Ice: snowflake pattern */}
        {skinId === 'bomb_ice' && (
          <pattern id="icePattern" x="0" y="0" width={size * 0.25} height={size * 0.25} patternUnits="userSpaceOnUse">
            <line x1={size*0.125} y1="0" x2={size*0.125} y2={size*0.25} stroke="#88ccff" strokeWidth="0.5" opacity="0.4"/>
            <line x1="0" y1={size*0.125} x2={size*0.25} y2={size*0.125} stroke="#88ccff" strokeWidth="0.5" opacity="0.4"/>
          </pattern>
        )}
        {/* Lava: crackle lines */}
        {skinId === 'bomb_lava' && (
          <pattern id="lavaPattern" x="0" y="0" width={size * 0.3} height={size * 0.3} patternUnits="userSpaceOnUse">
            <polyline points={`0,${size*0.15} ${size*0.1},${size*0.05} ${size*0.2},${size*0.2} ${size*0.3},${size*0.1}`} stroke="#ff6600" strokeWidth="0.8" fill="none" opacity="0.5"/>
          </pattern>
        )}
        {/* Cosmic: star dots */}
        {skinId === 'bomb_cosmic' && (
          <pattern id="cosmicPattern" x="0" y="0" width={size * 0.2} height={size * 0.2} patternUnits="userSpaceOnUse">
            <circle cx={size*0.05} cy={size*0.05} r="0.7" fill="#ffffff" opacity="0.6"/>
            <circle cx={size*0.15} cy={size*0.14} r="0.5" fill="#cc99ff" opacity="0.5"/>
          </pattern>
        )}
        {/* Crystal: facet lines */}
        {skinId === 'bomb_crystal' && (
          <pattern id="crystalPattern" x="0" y="0" width={size * 0.3} height={size * 0.3} patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2={size*0.3} y2={size*0.3} stroke="#00eeff" strokeWidth="0.7" opacity="0.35"/>
            <line x1={size*0.3} y1="0" x2="0" y2={size*0.3} stroke="#00eeff" strokeWidth="0.7" opacity="0.35"/>
          </pattern>
        )}
        {/* Candy: swirl stripe */}
        {skinId === 'bomb_candy' && (
          <pattern id="candyPattern" x="0" y="0" width={size * 0.2} height={size * 0.2} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={size*0.1} height={size*0.2} fill="#ff88cc" opacity="0.3"/>
          </pattern>
        )}
        {/* Rainbow: animating gradient */}
        {skinId === 'bomb_rainbow' && (
          <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#ff0000"><animate attributeName="stop-color" values="#ff0000;#ff7700;#ffff00;#00ff00;#0000ff;#8800ff;#ff0000" dur="2s" repeatCount="indefinite"/></stop>
            <stop offset="50%"  stopColor="#ff7700"><animate attributeName="stop-color" values="#ff7700;#ffff00;#00ff00;#0000ff;#8800ff;#ff0000;#ff7700" dur="2s" repeatCount="indefinite"/></stop>
            <stop offset="100%" stopColor="#ffff00"><animate attributeName="stop-color" values="#ffff00;#00ff00;#0000ff;#8800ff;#ff0000;#ff7700;#ffff00" dur="2s" repeatCount="indefinite"/></stop>
          </linearGradient>
        )}
        {/* Neon: pulsing glow filter */}
        {skinId === 'bomb_neon' && (
          <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        )}
      </defs>

      {/* Fuse rope */}
      <path
        d={`M ${r} ${size * 0.15} Q ${r + size * 0.18} ${-size * 0.05} ${r + size * 0.08} ${-size * 0.28}`}
        stroke={skin.fuse}
        strokeWidth={size * 0.04}
        fill="none"
        strokeLinecap="round"
      />
      {/* Fuse glow / spark */}
      <circle
        cx={r + size * 0.08}
        cy={-size * 0.28}
        r={size * 0.05}
        fill={skin.fuseGlow}
        opacity={isCritical ? 1 : 0.85}
        filter={skinId === 'bomb_neon' ? 'url(#neonGlow)' : undefined}
      >
        {isCritical && <animate attributeName="opacity" values="0.4;1;0.4" dur="0.3s" repeatCount="indefinite" />}
        {isCritical && <animate attributeName="r" values={`${size*0.04};${size*0.09};${size*0.04}`} dur="0.3s" repeatCount="indefinite" />}
        {!isCritical && skinId === 'bomb_neon' && <animate attributeName="r" values={`${size*0.04};${size*0.07};${size*0.04}`} dur="0.8s" repeatCount="indefinite" />}
        {!isCritical && skinId === 'bomb_thunder' && <animate attributeName="opacity" values="1;0.3;1" dur="0.4s" repeatCount="indefinite" />}
      </circle>

      {/* Thunder bolt on fuse tip */}
      {skinId === 'bomb_thunder' && (
        <text x={r + size * 0.08} y={-size * 0.26} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.15} fill="#ffff00" opacity="0.9">⚡</text>
      )}

      {/* Bomb body */}
      <circle
        cx={r}
        cy={bodyY}
        r={bodyR}
        fill={skinId === 'bomb_rainbow' ? 'url(#rainbowGrad)' : `url(#${gradId})`}
      />

      {/* Overlay pattern fills */}
      {skinId === 'bomb_ice' && (
        <circle cx={r} cy={bodyY} r={bodyR} fill="url(#icePattern)" />
      )}
      {skinId === 'bomb_lava' && (
        <circle cx={r} cy={bodyY} r={bodyR} fill="url(#lavaPattern)" />
      )}
      {skinId === 'bomb_cosmic' && (
        <circle cx={r} cy={bodyY} r={bodyR} fill="url(#cosmicPattern)" />
      )}
      {skinId === 'bomb_crystal' && (
        <circle cx={r} cy={bodyY} r={bodyR} fill="url(#crystalPattern)" />
      )}
      {skinId === 'bomb_candy' && (
        <circle cx={r} cy={bodyY} r={bodyR} fill="url(#candyPattern)" />
      )}

      {/* Accent glow ring */}
      {skin.accent && (
        <circle cx={r} cy={bodyY} r={bodyR} fill="none" stroke={skin.accent} strokeWidth={size * 0.025} opacity="0.5">
          {(skinId === 'bomb_neon' || skinId === 'bomb_shadow' || skinId === 'bomb_toxic') && (
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.2s" repeatCount="indefinite" />
          )}
        </circle>
      )}

      {/* Shine highlight */}
      <ellipse
        cx={r * 0.78}
        cy={r * 0.72 + size * 0.2}
        rx={r * 0.22}
        ry={r * 0.14}
        fill={skin.shine}
        opacity={skinId === 'bomb_crystal' ? 0.8 : 0.45}
      />

      {/* Special interior decorations */}
      {skinId === 'bomb_skull' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.38} fill="#222222">💀</text>
      )}
      {skinId === 'bomb_toxic' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.32} fill="#66ff00" opacity="0.85">☣</text>
      )}
      {skinId === 'bomb_thunder' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.36} fill="#ffee00">⚡</text>
      )}
      {skinId === 'bomb_dynamite' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.06} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.22} fontWeight="900" fontFamily="monospace" fill="#ffdd00" letterSpacing="-1">TNT</text>
      )}
      {skinId === 'bomb_cosmic' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3} fill="#cc66ff" opacity="0.9">✦</text>
      )}
      {skinId === 'bomb_crystal' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3} fill="#00eeff" opacity="0.95">💎</text>
      )}
      {skinId === 'bomb_candy' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3} fill="#ff88cc" opacity="0.9">🍭</text>
      )}
      {skinId === 'bomb_rainbow' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3}>🌈</text>
      )}
      {skinId === 'bomb_ice' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3} fill="#88ccff">❄</text>
      )}
      {skinId === 'bomb_shadow' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3} fill="#8800ff" opacity="0.9">👁</text>
      )}
      {skinId === 'bomb_lava' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3}>🌋</text>
      )}
      {skinId === 'bomb_gold' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.3}>★</text>
      )}
      {/* Gold star spin */}
      {skinId === 'bomb_gold' && !timerSecs && (
        <text x={r} y={bodyY + size * 0.04} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.28} fill="#ffe066" opacity="0.9">
          ★
          <animateTransform attributeName="transform" type="rotate" from={`0 ${r} ${bodyY}`} to={`360 ${r} ${bodyY}`} dur="3s" repeatCount="indefinite"/>
        </text>
      )}

      {/* Timer text on bomb */}
      {timerSecs !== null && (
        <text
          x={r}
          y={bodyY + size * 0.02}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isCritical ? '#ff4400' : '#00ff88'}
          fontSize={size * 0.34}
          fontWeight="900"
          fontFamily="monospace"
          style={{ userSelect: 'none' }}
        >
          {timerSecs}
        </text>
      )}
    </svg>
  );
}

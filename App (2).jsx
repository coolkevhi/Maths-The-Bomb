import React from 'react';

// Visual style per hand skin ID
const HAND_STYLES = {
  hand_blue:       { bg: '#3377ee',                                          icon: '🖐',  border: null         },
  hand_red:        { bg: '#ee3333',                                          icon: '🖐',  border: null         },
  hand_green:      { bg: '#22bb66',                                          icon: '🖐',  border: null         },
  hand_purple:     { bg: '#9933ee',                                          icon: '🖐',  border: null         },
  hand_gold_glove: { bg: 'linear-gradient(135deg,#c49000,#ffe066)',          icon: '🧤',  border: '#ffd700'    },
  hand_robot:      { bg: 'linear-gradient(135deg,#445566,#8899bb)',          icon: '🤖',  border: '#8899bb'    },
  hand_fire:       { bg: 'linear-gradient(135deg,#ff2200,#ff9900)',          icon: '🔥',  border: '#ff6600'    },
  hand_ice:        { bg: 'linear-gradient(135deg,#1144aa,#88ccff)',          icon: '❄️',  border: '#88ddff'    },
  hand_neon:       { bg: 'linear-gradient(135deg,#cc00ff,#ff00aa)',          icon: '✨',  border: '#ff00ff',   glow: '#ff00ff' },
  hand_shadow:     { bg: 'linear-gradient(135deg,#050508,#220033)',          icon: '👻',  border: '#660099',   glow: '#8800ff' },
  hand_cosmic:     { bg: 'linear-gradient(135deg,#0d0022,#440099)',          icon: '🌌',  border: '#9933ff',   glow: '#aa44ff' },
  hand_toxic:      { bg: 'linear-gradient(135deg,#003300,#44ff00)',          icon: '☢️',  border: '#66ff00',   glow: '#44ff00' },
  hand_lava:       { bg: 'linear-gradient(135deg,#550000,#ff5500)',          icon: '🌋',  border: '#ff4400',   glow: '#ff4400' },
  hand_crystal:    { bg: 'linear-gradient(135deg,#003344,#00eeff)',          icon: '💎',  border: '#00eeff',   glow: '#00ccee' },
  hand_rainbow:    { bg: 'linear-gradient(135deg,#ff0000,#ff7700,#ffff00,#00ff00,#0000ff,#8800ff)', icon: '🌈', border: '#ff88ff', glow: '#ff88ff' },
};

// Pass animations — only play during the isPassing window
const PASS_ANIM_CSS = {
  anim_default:    'handBounce 0.8s ease-in-out infinite',
  anim_spin:       'handSpin 0.5s linear infinite',
  anim_slam:       'handSlam 0.4s ease-in-out infinite alternate',
  anim_pulse:      'handPulse 0.6s ease-in-out infinite',
  anim_shake:      'handShake 0.15s ease-in-out infinite',
  anim_float:      'handFloat 1.2s ease-in-out infinite',
  anim_wobble:     'handWobble 0.55s ease-in-out infinite',
  anim_bounce_big: 'handBounceBig 0.65s ease-in-out infinite',
  anim_flash:      'handFlash 0.45s ease-in-out infinite',
  anim_orbit:      'handOrbit 1s linear infinite',
  anim_glitch:     'handGlitch 0.25s steps(3) infinite',
  anim_twist:      'handTwist 0.7s ease-in-out infinite',
  anim_heartbeat:  'handHeartbeat 0.75s ease-in-out infinite',
  anim_rubber:     'handRubber 0.55s ease-in-out infinite',
  anim_jitter:     'handJitter 0.08s linear infinite',
};

// Idle animations — play when holding the bomb (isActive but not isPassing)
const IDLE_ANIM_CSS = {
  idle_still:     'none',
  idle_sway:      'idleSway 2s ease-in-out infinite',
  idle_breathe:   'idleBreathe 2.5s ease-in-out infinite',
  idle_nod:       'idleNod 1.5s ease-in-out infinite',
  idle_tap:       'idleTap 0.8s ease-in-out infinite',
  idle_nervous:   'idleNervous 0.5s ease-in-out infinite',
  idle_swing:     'idleSwing 2s ease-in-out infinite',
  idle_bob:       'idleBob 1.2s ease-in-out infinite',
  idle_fidget:    'idleFidget 1.5s ease-in-out infinite',
  idle_spin_slow: 'idleSpinSlow 3s linear infinite',
  idle_rock:      'idleRock 1.8s ease-in-out infinite',
  idle_bounce:    'idleBounce 1s ease-in-out infinite',
  idle_hover:     'idleHover 2s ease-in-out infinite',
  idle_dance:     'idleDance 1.2s ease-in-out infinite',
  idle_pace:      'idlePace 2s ease-in-out infinite',
};

/**
 * PlayerHand — renders a stylised hand + nametag.
 * Props:
 *   skinId        — hand skin ID
 *   name          — player display name
 *   isActive      — this player currently holds the bomb
 *   isEliminated  — grey this player out
 *   isMe          — highlight as the local player
 *   animId        — pass animation ID (plays only while isPassing)
 *   idleAnimId    — idle animation ID (plays while isActive and not isPassing)
 *   isPassing     — true during the brief pass window when bomb arrives
 *   size          — hand diameter in px (default 56)
 */
export default function PlayerHand({
  skinId = 'hand_blue',
  name = '',
  isActive = false,
  isEliminated = false,
  isMe = false,
  animId = 'anim_default',
  idleAnimId = 'idle_still',
  isPassing = false,
  size = 56,
}) {
  const style = HAND_STYLES[skinId] || HAND_STYLES.hand_blue;

  // Animation logic:
  // - Eliminated: none
  // - isPassing + isActive: play pass animation (throwing the bomb)
  // - !isActive (waiting for bomb): play idle animation
  // - isActive and not passing (holding bomb, thinking): no animation
  const animation = (() => {
    if (isEliminated) return 'none';
    if (isPassing && isActive) return PASS_ANIM_CSS[animId] || PASS_ANIM_CSS.anim_default;
    if (!isActive) return IDLE_ANIM_CSS[idleAnimId] || 'none';
    return 'none';
  })();

  const extraGlow = style.glow && isActive
    ? `, 0 0 18px ${style.glow}88, 0 0 36px ${style.glow}44`
    : '';

  const handStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: isEliminated ? '#333' : style.bg,
    border: isActive
      ? '3px solid #00ff88'
      : style.border && !isEliminated
        ? `2px solid ${style.border}`
        : isMe
          ? '2px solid rgba(0,255,136,0.5)'
          : '2px solid rgba(255,255,255,0.15)',
    boxShadow: isActive
      ? `0 0 20px rgba(0,255,136,0.7), 0 0 40px rgba(0,255,136,0.3)${extraGlow}`
      : style.glow && !isEliminated
        ? `0 0 10px ${style.glow}55`
        : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.48,
    opacity: isEliminated ? 0.35 : 1,
    transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
    position: 'relative',
    flexShrink: 0,
    animation,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={handStyle}>
        {isEliminated ? '💀' : style.icon}
      </div>
      {name !== '' && (
        <div style={{
          fontSize: Math.max(10, size * 0.22),
          fontWeight: isActive ? 700 : 500,
          color: isEliminated
            ? 'rgba(255,255,255,0.3)'
            : isActive
              ? '#00ff88'
              : isMe
                ? 'rgba(0,255,136,0.7)'
                : 'rgba(255,255,255,0.75)',
          textAlign: 'center',
          maxWidth: size * 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'color 0.3s',
        }}>
          {name}{isMe ? ' (you)' : ''}
        </div>
      )}
    </div>
  );
}

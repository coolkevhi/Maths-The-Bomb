/**
 * economy.js — ESM client-side adaptation of /engine/economy.js
 * Kept in sync with the server-side version. Used for the Customize/Locker screen.
 * Wallet state is persisted to localStorage (key: "mtb_wallet").
 */

export const CATALOG = {
  bombs: [
    { id: 'bomb_default',  name: 'Black Bomb',      cost: 0,   ownedByDefault: true },
    { id: 'bomb_red',      name: 'Red Bomb',         cost: 150  },
    { id: 'bomb_dynamite', name: 'Dynamite',         cost: 300  },
    { id: 'bomb_neon',     name: 'Neon Bomb',        cost: 200  },
    { id: 'bomb_ice',      name: 'Frost Bomb',       cost: 250  },
    { id: 'bomb_gold',     name: 'Golden Bomb',      cost: 400  },
    { id: 'bomb_skull',    name: 'Skull Bomb',       cost: 350  },
    { id: 'bomb_lava',     name: 'Lava Bomb',        cost: 450  },
    { id: 'bomb_cosmic',   name: 'Cosmic Bomb',      cost: 550  },
    { id: 'bomb_toxic',    name: 'Toxic Bomb',       cost: 400  },
    { id: 'bomb_candy',    name: 'Candy Bomb',       cost: 250  },
    { id: 'bomb_crystal',  name: 'Crystal Bomb',     cost: 500  },
    { id: 'bomb_shadow',   name: 'Shadow Bomb',      cost: 350  },
    { id: 'bomb_thunder',  name: 'Thunder Bomb',     cost: 600  },
    { id: 'bomb_rainbow',  name: 'Rainbow Bomb',     cost: 700  },
  ],
  hands: [
    { id: 'hand_blue',       name: 'Blue',         cost: 0,   ownedByDefault: true },
    { id: 'hand_red',        name: 'Red',          cost: 0,   ownedByDefault: true },
    { id: 'hand_green',      name: 'Green',        cost: 0,   ownedByDefault: true },
    { id: 'hand_purple',     name: 'Purple',       cost: 0,   ownedByDefault: true },
    { id: 'hand_gold_glove', name: 'Gold Glove',   cost: 200  },
    { id: 'hand_robot',      name: 'Robot',        cost: 350  },
    { id: 'hand_fire',       name: 'Inferno',      cost: 300  },
    { id: 'hand_ice',        name: 'Frostbite',    cost: 300  },
    { id: 'hand_neon',       name: 'Neon',         cost: 250  },
    { id: 'hand_shadow',     name: 'Shadow',       cost: 400  },
    { id: 'hand_cosmic',     name: 'Cosmic',       cost: 500  },
    { id: 'hand_toxic',      name: 'Toxic',        cost: 350  },
    { id: 'hand_lava',       name: 'Magma',        cost: 450  },
    { id: 'hand_crystal',    name: 'Crystal',      cost: 500  },
    { id: 'hand_rainbow',    name: 'Rainbow',      cost: 600  },
  ],
  handAnimations: [
    { id: 'anim_default',     name: 'Default Toss',    cost: 0,   ownedByDefault: true },
    { id: 'anim_spin',        name: 'Spin Pass',       cost: 250  },
    { id: 'anim_slam',        name: 'Slam Pass',       cost: 400  },
    { id: 'anim_pulse',       name: 'Pulse',           cost: 200  },
    { id: 'anim_shake',       name: 'Earthquake',      cost: 300  },
    { id: 'anim_float',       name: 'Levitate',        cost: 350  },
    { id: 'anim_wobble',      name: 'Wobble',          cost: 300  },
    { id: 'anim_bounce_big',  name: 'Hyper Bounce',    cost: 400  },
    { id: 'anim_flash',       name: 'Strobe',          cost: 450  },
    { id: 'anim_orbit',       name: 'Orbit',           cost: 500  },
    { id: 'anim_glitch',      name: 'Glitch',          cost: 550  },
    { id: 'anim_twist',       name: 'Twist',           cost: 400  },
    { id: 'anim_heartbeat',   name: 'Heartbeat',       cost: 350  },
    { id: 'anim_rubber',      name: 'Rubber Band',     cost: 300  },
    { id: 'anim_jitter',      name: 'Jitter',          cost: 250  },
  ],
  handIdleAnimations: [
    { id: 'idle_still',      name: 'Still',         cost: 0,   ownedByDefault: true },
    { id: 'idle_sway',       name: 'Gentle Sway',   cost: 100  },
    { id: 'idle_breathe',    name: 'Breathe',       cost: 100  },
    { id: 'idle_nod',        name: 'Nod',           cost: 150  },
    { id: 'idle_tap',        name: 'Tap',           cost: 150  },
    { id: 'idle_nervous',    name: 'Nervous',       cost: 200  },
    { id: 'idle_swing',      name: 'Swing',         cost: 200  },
    { id: 'idle_bob',        name: 'Bob',           cost: 150  },
    { id: 'idle_fidget',     name: 'Fidget',        cost: 250  },
    { id: 'idle_spin_slow',  name: 'Slow Spin',     cost: 300  },
    { id: 'idle_rock',       name: 'Rock',          cost: 200  },
    { id: 'idle_bounce',     name: 'Bounce',        cost: 150  },
    { id: 'idle_hover',      name: 'Hover',         cost: 250  },
    { id: 'idle_dance',      name: 'Dance',         cost: 300  },
    { id: 'idle_pace',       name: 'Pace',          cost: 250  },
  ],
};

export function calculateMatchReward({ won, correctAnswers, survivedRounds }) {
  let reward = 0;
  reward += correctAnswers * 5;
  reward += survivedRounds * 3;
  if (won) reward += 50;
  return reward;
}

const STORAGE_KEY = 'mtb_wallet';

function defaultOwnedItems() {
  return new Set(
    Object.values(CATALOG)
      .flat()
      .filter((item) => item.ownedByDefault)
      .map((item) => item.id)
  );
}

export class PlayerWallet {
  constructor({ balance = 0, unlocked = [], equipped = {} } = {}) {
    this.balance = balance;
    this.unlocked = new Set([...defaultOwnedItems(), ...unlocked]);
    this.equipped = {
      bomb:              equipped.bomb              || 'bomb_default',
      hand:              equipped.hand              || 'hand_blue',
      handAnimation:     equipped.handAnimation     || 'anim_default',
      handIdleAnimation: equipped.handIdleAnimation || 'idle_still',
    };
  }

  addReward(matchResult) {
    const earned = calculateMatchReward(matchResult);
    this.balance += earned;
    this.save();
    return earned;
  }

  ownsItem(itemId) {
    return this.unlocked.has(itemId);
  }

  purchase(itemId) {
    const item = Object.values(CATALOG).flat().find((i) => i.id === itemId);
    if (!item) return { success: false, reason: 'unknown-item' };
    if (this.ownsItem(itemId)) return { success: false, reason: 'already-owned' };
    if (this.balance < item.cost) return { success: false, reason: 'insufficient-funds' };
    this.balance -= item.cost;
    this.unlocked.add(itemId);
    this.save();
    return { success: true, item };
  }

  equip(slot, itemId) {
    if (!['bomb', 'hand', 'handAnimation', 'handIdleAnimation'].includes(slot)) return { success: false, reason: 'invalid-slot' };
    if (!this.ownsItem(itemId)) return { success: false, reason: 'not-owned' };
    this.equipped[slot] = itemId;
    this.save();
    return { success: true };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        balance:  this.balance,
        unlocked: [...this.unlocked],
        equipped: this.equipped,
      }));
    } catch (_) {}
  }

  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return new PlayerWallet(JSON.parse(raw));
    } catch (_) {}
    return new PlayerWallet();
  }
}

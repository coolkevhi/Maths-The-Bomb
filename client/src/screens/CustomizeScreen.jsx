import React, { useState } from 'react';
import { PlayerWallet, CATALOG } from '../engine/economy.js';
import BombSVG from '../components/BombSVG.jsx';
import PlayerHand from '../components/PlayerHand.jsx';
import { playClick, playHover } from '../audio/audio.js';
import '../styles/CustomizeScreen.css';

/** Live bomb preview */
function BombPreview({ itemId }) {
  return (
    <div style={{ transform: 'scale(0.72)', transformOrigin: 'center center', marginTop: -6 }}>
      <BombSVG skinId={itemId} size={72} />
    </div>
  );
}

/** Live hand skin preview — no animation */
function HandPreview({ itemId }) {
  return <PlayerHand skinId={itemId} size={48} name="" />;
}

/** Pass animation preview — always showing the animation */
function PassAnimPreview({ itemId }) {
  return (
    <PlayerHand
      skinId="hand_blue"
      size={48}
      name=""
      animId={itemId}
      idleAnimId="idle_still"
      isActive
      isPassing
    />
  );
}

/** Idle animation preview — always showing the idle animation */
function IdleAnimPreview({ itemId }) {
  return (
    <PlayerHand
      skinId="hand_blue"
      size={48}
      name=""
      idleAnimId={itemId}
      isActive={false}
      isPassing={false}
    />
  );
}

function CatalogSection({ title, items, wallet, slot, onPurchase, onEquip, PreviewComponent }) {
  return (
    <div className="catalog-section">
      <h3 className="catalog-section-title">{title}</h3>
      <div className="catalog-grid">
        {items.map((item) => {
          const owned    = wallet.ownsItem(item.id);
          const equipped = wallet.equipped[slot] === item.id;
          const canBuy   = !owned && wallet.balance >= item.cost;

          return (
            <div
              key={item.id}
              className={`catalog-item ${equipped ? 'catalog-item--equipped' : ''} ${!owned ? 'catalog-item--locked' : ''}`}
            >
              <div className="catalog-item-preview">
                <PreviewComponent itemId={item.id} />
                {!owned && <div className="catalog-item-lock">🔒</div>}
              </div>

              <div className="catalog-item-info">
                <span className="catalog-item-name">{item.name}</span>
                {item.cost > 0 && (
                  <span className="catalog-item-cost">
                    {owned ? '✅ Owned' : `💰 ${item.cost}`}
                  </span>
                )}
                {item.cost === 0 && (
                  <span className="catalog-item-cost" style={{ color: 'var(--green)' }}>Free</span>
                )}
              </div>

              <div className="catalog-item-actions">
                {equipped && <span className="badge-equipped">Equipped</span>}
                {owned && !equipped && (
                  <button
                    className="btn btn-sm"
                    onClick={() => { playClick(); onEquip(slot, item.id); }}
                    onMouseEnter={playHover}
                  >
                    Equip
                  </button>
                )}
                {!owned && (
                  <button
                    className="btn btn-sm btn-gold"
                    disabled={!canBuy}
                    onClick={() => { playClick(); onPurchase(item.id); }}
                    onMouseEnter={playHover}
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CustomizeScreen({ nav }) {
  const [wallet, setWallet]         = useState(() => PlayerWallet.load());
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('mtb_name') || '');
  const [toast, setToast]           = useState(null);

  function refresh() { setWallet(PlayerWallet.load()); }

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 2500);
  }

  function handlePurchase(itemId) {
    const result = wallet.purchase(itemId);
    if (result.success) {
      showToast(`Purchased ${result.item.name}!`);
      refresh();
    } else {
      showToast(result.reason === 'insufficient-funds' ? 'Not enough Math Bits!' : result.reason, true);
    }
  }

  function handleEquip(slot, itemId) {
    wallet.equip(slot, itemId);
    showToast('Equipped!');
    refresh();
  }

  function saveName() {
    localStorage.setItem('mtb_name', playerName.trim());
    showToast('Name saved!');
  }

  return (
    <div className="screen customize-screen" style={{ overflowY: 'auto', justifyContent: 'flex-start', padding: '32px 16px' }}>
      {toast && <div className={`toast ${toast.isError ? 'error' : ''}`}>{toast.msg}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div className="logo" style={{ fontSize: '1.8rem' }}>Customize</div>
        <div className="balance-badge">💰 {wallet.balance} Math Bits</div>
      </div>

      {/* Name editor */}
      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, maxWidth: 420, width: '100%' }}>
        <label style={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>Display Name</label>
        <input
          className="input"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
          placeholder="Enter your name…"
          style={{ flex: 1 }}
        />
        <button className="btn btn-sm" onClick={() => { playClick(); saveName(); }} onMouseEnter={playHover}>Save</button>
      </div>

      <CatalogSection title="💣 Bomb Skins"         items={CATALOG.bombs}              wallet={wallet} slot="bomb"              onPurchase={handlePurchase} onEquip={handleEquip} PreviewComponent={BombPreview}     />
      <CatalogSection title="🖐 Hand Skins"          items={CATALOG.hands}              wallet={wallet} slot="hand"              onPurchase={handlePurchase} onEquip={handleEquip} PreviewComponent={HandPreview}     />
      <CatalogSection title="🎯 Pass Animations"     items={CATALOG.handAnimations}     wallet={wallet} slot="handAnimation"     onPurchase={handlePurchase} onEquip={handleEquip} PreviewComponent={PassAnimPreview} />
      <CatalogSection title="😴 Idle Animations"     items={CATALOG.handIdleAnimations} wallet={wallet} slot="handIdleAnimation" onPurchase={handlePurchase} onEquip={handleEquip} PreviewComponent={IdleAnimPreview} />

      <button className="btn btn-lg" style={{ marginTop: 24 }} onClick={() => { playClick(); nav('main-menu'); }} onMouseEnter={playHover}>
        ← Back
      </button>
    </div>
  );
}

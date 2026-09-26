import React, { useState } from 'react';
import { ZONES } from '../data/zoneData.js';
import { SLIME_TIERS } from '../data/slimeData.js';

// Playtest controls. Everything here is derived from the data files through
// `tools` (built in SlimeQueen), so adding a material, mutagen, zone or skill
// needs no change here.

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, marginBottom: 6 }}>{title}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{children}</div>
  </div>
);

const B = ({ onClick, children, color = '#374151', dark = false }) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 9px', background: color, border: 'none', borderRadius: 5, cursor: 'pointer',
      fontSize: 11, color: dark ? '#111' : '#fff', fontWeight: 600,
    }}
  >
    {children}
  </button>
);

export default function DevPanel({ tools, speed, setSpeed, onClose }) {
  const [qty, setQty] = useState(10);

  return (
    <div style={{
      position: 'fixed', top: 56, right: 8, left: 8, maxWidth: 380, marginLeft: 'auto',
      maxHeight: 'calc(100vh - 140px)', overflowY: 'auto',
      background: 'rgba(10,10,20,0.97)', borderRadius: 10, padding: 14, zIndex: 200,
      border: '1px solid rgba(255,255,255,0.2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 'bold' }}>🛠️ Dev tools</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>×</button>
      </div>

      <Section title={`Game speed: ${speed}x`}>
        <input type="range" min="1" max="50" value={speed} onChange={e => setSpeed(+e.target.value)} style={{ width: '100%' }} />
      </Section>

      <Section title="Currencies">
        <B color="#16a34a" onClick={() => tools.addBio(1000)}>+1k 🧬</B>
        <B color="#16a34a" onClick={() => tools.addBio(100000)}>+100k 🧬</B>
        <B color="#db2777" onClick={() => tools.addLevels(1)}>+1 Queen Lv</B>
        <B color="#db2777" onClick={() => tools.addLevels(10)}>+10 Queen Lv</B>
        <B color="#7c3aed" onClick={() => tools.addPrisms(100)}>+100 💎</B>
        <B color="#059669" onClick={() => tools.addMana(100)}>+100 mana</B>
      </Section>

      <Section title="Items">
        <div style={{ width: '100%', display: 'flex', gap: 5, alignItems: 'center', fontSize: 11 }}>
          Amount:
          {[1, 10, 100].map(n => (
            <B key={n} color={qty === n ? '#f59e0b' : '#374151'} dark={qty === n} onClick={() => setQty(n)}>×{n}</B>
          ))}
        </div>
        <B color="#d97706" onClick={() => tools.addAllMaterials(qty)}>Every material</B>
        <B color="#9333ea" onClick={() => tools.addAllMutagens(qty)}>Every mutagen</B>
        <B color="#b45309" onClick={() => tools.addSealsAndHearts(qty)}>Every Seal &amp; Core</B>
        {Object.entries(ZONES).map(([id, z]) => (
          <B key={id} onClick={() => tools.addZoneMaterials(id, qty)}>{z.icon} {z.name} mats</B>
        ))}
      </Section>

      <Section title="Progression">
        <B color="#0891b2" onClick={tools.learnAllSkills}>Learn every skill</B>
        <B color="#0891b2" onClick={tools.buildEverything}>Build everything + research + pools</B>
        <B color="#65a30d" onClick={() => tools.setTendrils(1)}>Reach every zone</B>
        <B color="#65a30d" onClick={() => tools.setTendrils(2)}>Provoke every Warden</B>
        <B color="#65a30d" onClick={() => tools.setTendrils(3)}>Root every Tendril</B>
        <B color="#b91c1c" onClick={tools.fellAllWardens}>Fell every Warden</B>
      </Section>

      <Section title="Slimes">
        {Object.entries(SLIME_TIERS).map(([id, t]) => (
          <B key={id} color={t.color} dark onClick={() => tools.spawnFree(id)}>+ {t.name} (free)</B>
        ))}
        <B color="#16a34a" onClick={tools.healAll}>Heal all</B>
        <B color="#dc2626" onClick={tools.woundFirst}>Wound first</B>
        <B color="#a855f7" onClick={tools.giveTraits}>+1 random trait each</B>
      </Section>

      <Section title="Time and visitors">
        <B color="#475569" onClick={() => tools.simulateOffline(1)}>Close for 1h</B>
        <B color="#475569" onClick={() => tools.simulateOffline(8)}>Close for 8h</B>
        <B color="#475569" onClick={() => tools.simulateOffline(24)}>Close for 24h</B>
        <B color="#84cc16" dark onClick={tools.summonMerchant}>🐌 Summon Mossback</B>
        <B color="#0e7490" onClick={tools.resetCaravan}>Reset caravan</B>
      </Section>

      <Section title="Tutorials">
        <B onClick={tools.replayTutorials}>Replay all</B>
        <B onClick={tools.skipTutorials}>Skip all</B>
      </Section>

      <div style={{ fontSize: 10, opacity: 0.45 }}>
        "Close for" saves as if the app had been shut that long ago, then restarts it, so the real offline catch-up runs.
      </div>
    </div>
  );
}

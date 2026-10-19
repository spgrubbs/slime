import React, { useState } from 'react';
import { UPGRADES } from '../engine/content/upgrades.js';
import { SPECIES } from '../engine/content/species.js';
import { ESSENCES } from '../engine/content/essences.js';
import { saltDesc } from '../engine/content/salt.js';
import { buyUpgrade, nextCost, rankOf, unlockedSpecies } from '../engine/meta.js';
import { fmt } from '../engine/battle.js';
import Slime from './Slime.jsx';
import { TagChips } from './EssenceCard.jsx';

export default function Hub({ profile, setProfile, onStart }) {
  const species = unlockedSpecies(profile);
  const [pick, setPick] = useState(species[0]);
  const maxSalt = profile.saltUnlocked[pick] || 0;
  const [salt, setSalt] = useState(0);
  const [seed, setSeed] = useState('');
  const sp = SPECIES[pick];

  const buy = (id) => {
    try { setProfile(buyUpgrade(profile, id)); } catch { /* button is disabled when unaffordable */ }
  };

  return (
    <div className="hub">
      <section className="panel center">
        <h1>The Brood Pool</h1>
        <p className="muted">The Queen buds a champion. It will probably die. What it learns stays.</p>
        <Slime species={pick} mass={sp.base.mass + rankOf(profile, 'thickMembrane') * 8} />
        <div className="species-row">
          {species.map(id => (
            <button key={id} className={id === pick ? 'chip on' : 'chip'} onClick={() => { setPick(id); setSalt(0); }}>
              {SPECIES[id].icon} {SPECIES[id].name}
            </button>
          ))}
        </div>
        <p><b>{sp.name}, {sp.title}.</b> {sp.innate}. Starts with {ESSENCES[sp.starter].icon} {ESSENCES[sp.starter].name}.</p>
        <TagChips tags={sp.tags || []} />
        <div className="row">
          <label>🧂 Salt
            <select value={salt} onChange={e => setSalt(Number(e.target.value))}>
              {Array.from({ length: maxSalt + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <input placeholder="Seed (optional)" value={seed} onChange={e => setSeed(e.target.value.toUpperCase())} />
        </div>
        {salt > 0 && <ul className="small-list">{saltDesc(salt).map(d => <li key={d}>{d}</li>)}</ul>}
        <button className="primary big" onClick={() => onStart({ species: pick, salt, seed: seed.trim() })}>Bud a champion</button>
      </section>

      <section className="panel">
        <h2>Gene Tree <span className="muted">🧬 {profile.genes}</span></h2>
        <div className="upgrades">
          {Object.entries(UPGRADES).map(([id, u]) => {
            const rank = rankOf(profile, id);
            const cost = nextCost(profile, id);
            return (
              <div key={id} className="upgrade">
                <div><b>{u.icon} {u.name}</b> <span className="muted">{rank}/{u.max}</span></div>
                <div className="muted small">{rank ? u.desc(rank) : u.desc(1)}{rank && cost !== null ? ` → ${u.desc(rank + 1)}` : ''}</div>
                <button disabled={cost === null || profile.genes < cost} onClick={() => buy(id)}>
                  {cost === null ? 'Max' : `🧬 ${cost}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Hall of Slimes</h2>
        <p className="muted small">
          Runs {profile.runs} · Wins {profile.wins} · Biggest hit {fmt(profile.records.biggestHit)} · Peak Mass {fmt(profile.records.peakMass)}
          {profile.heirloom && profile.upgrades.heirloom && <> · Heirloom: {ESSENCES[profile.heirloom]?.icon} {ESSENCES[profile.heirloom]?.name}</>}
        </p>
        {profile.hall.length === 0 && <p className="muted">No champions yet.</p>}
        <div className="hall">
          {profile.hall.slice(0, 8).map(h => (
            <div key={h.n} className={`hall-card ${h.won ? 'won' : ''}`}>
              <Slime species={h.species} mass={h.stats.mass} slotted={h.slotted} relics={h.relics} size={56} />
              <div className="small">
                #{h.n} {SPECIES[h.species].name}{h.salt ? ` · 🧂${h.salt}` : ''}<br />
                {h.won ? '👑 Devoured the Hollow One' : `Fell in Act ${h.act + 1}, floor ${h.floors}`}<br />
                +{h.genes} 🧬
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

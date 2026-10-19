import React from 'react';
import { reorderSlot, maxMass } from '../engine/run.js';
import { slimeProfile, BLOAT_PER } from '../engine/combatant.js';
import { ESSENCES } from '../engine/content/essences.js';
import { FAMILIES, RESONANCE, THRESHOLDS } from '../engine/content/families.js';
import { SPECIES } from '../engine/content/species.js';
import { TAGS } from '../engine/content/tags.js';
import EssenceCard from './EssenceCard.jsx';
import { RelicCard } from './Screens.jsx';
import Slime from './Slime.jsx';

/** Compact always-visible summary: stats, capacity/Bloat and the button to open the full build. */
export function StatStrip({ run, onOpen }) {
  const prof = slimeProfile(run.slime, run);
  const n = run.slime.slotted.length;
  return (
    <div className="stat-strip">
      <span>🫧 {run.slime.hp}/{maxMass(run)}</span>
      <span>💪 {prof.stats.firm}</span>
      <span>💨 {prof.stats.slip}</span>
      <span>🌀 {prof.stats.visc}</span>
      <span className={prof.bloat ? 'bloated' : ''}>🧫 {n}/{prof.capacity}{prof.bloat ? ` · Bloat −${Math.round((1 - prof.bloatMult) * 100)}%` : ''}</span>
      {onOpen && <button className="small" onClick={onOpen}>🫧 My Slime</button>}
    </div>
  );
}

export default function SlimePanel({ run, act, onClose }) {
  const prof = slimeProfile(run.slime, run);
  const sp = SPECIES[run.slime.species];
  const cf = sp.rules?.copiesFor || [1, 3, 6];
  const tagList = Object.entries(prof.tags).filter(([t]) => TAGS[t]).sort((a, b) => b[1] - a[1]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel slime-panel" onClick={e => e.stopPropagation()}>
        <div className="row spread"><h2>{sp.icon} {sp.name}</h2><button onClick={onClose}>Close</button></div>
        <div className="row">
          <Slime species={run.slime.species} element={prof.element} mass={prof.stats.mass} slotted={run.slime.slotted} levels={prof.levels} relics={run.relics} />
          <div className="stats">
            <div>🫧 Mass {run.slime.hp}/{maxMass(run)}</div>
            <div>💪 FIRM {prof.stats.firm} <span className="muted small">damage, Membrane</span></div>
            <div>💨 SLIP {prof.stats.slip} <span className="muted small">speed, extra actions, dodge</span></div>
            <div>🌀 VISC {prof.stats.visc} <span className="muted small">status strength</span></div>
            <div className="muted small">Element: {prof.element || 'none'} ({Object.entries(prof.affinity).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ') || 'no affinity'})</div>
            <div className={prof.bloat ? 'warn small' : 'muted small'}>
              Capacity {run.slime.slotted.length}/{prof.capacity}.{' '}
              {prof.bloat
                ? `Bloat ${prof.bloat}: all stats −${Math.round((1 - prof.bloatMult) * 100)}%.`
                : `Each essence past capacity costs ${Math.round(BLOAT_PER * 100)}% of all stats.`}
            </div>
          </div>
        </div>

        <h3>Tags</h3>
        <div className="tags">
          {tagList.map(([t, n]) => <span key={t} className="tag have">{TAGS[t].icon} {TAGS[t].name} {n}</span>)}
        </div>
        <p className="muted small">Species tags: {(sp.tags || []).map(t => `${TAGS[t].icon} ${TAGS[t].name}`).join(', ')}</p>

        <h3>Essences <span className="muted small">— Actions fire top to bottom; use the arrows to reorder</span></h3>
        {run.slime.slotted.map((e, i) => (
          <div key={e.id} className="slot-row">
            <div className="slot-move">
              <button className="small" disabled={i === 0} onClick={() => act(reorderSlot, i, -1)}>▲</button>
              <button className="small" disabled={i === run.slime.slotted.length - 1} onClick={() => act(reorderSlot, i, 1)}>▼</button>
            </div>
            <EssenceCard id={e.id} owned={e} copiesFor={cf} myTags={prof.tags} />
          </div>
        ))}

        {run.slime.stats.length > 0 && (
          <>
            <h3>Absorbed stats</h3>
            <p className="small">{run.slime.stats.map(e => `${ESSENCES[e.id].icon} ${ESSENCES[e.id].name} ×${e.copies}`).join(' · ')}</p>
          </>
        )}

        <h3>Resonance</h3>
        {Object.keys(prof.counts).length === 0 && <p className="muted small">Slot 2 essences of one family for a bonus.</p>}
        {Object.entries(prof.counts).map(([fam, n]) => (
          <div key={fam} className="small">
            <b>{FAMILIES[fam].icon} {FAMILIES[fam].name} {n}</b>{' '}
            {THRESHOLDS.map((t, tier) => (
              <span key={t} className={n >= t ? 'res on' : 'res'}>[{t}] {RESONANCE[fam][tier].desc} </span>
            ))}
          </div>
        ))}

        <h3>Swallowed relics</h3>
        {run.relics.length ? <div className="cards">{run.relics.map(id => <RelicCard key={id} id={id} />)}</div> : <p className="muted small">None yet.</p>}
      </div>
    </div>
  );
}

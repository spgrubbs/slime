import React from 'react';
import { reorderSlot, slotCount, maxMass } from '../engine/run.js';
import { slimeProfile } from '../engine/combatant.js';
import { ESSENCES } from '../engine/content/essences.js';
import { FAMILIES, RESONANCE, THRESHOLDS } from '../engine/content/families.js';
import { SPECIES } from '../engine/content/species.js';
import EssenceCard from './EssenceCard.jsx';
import { RelicCard } from './Screens.jsx';
import Slime from './Slime.jsx';

export default function SlimePanel({ run, act, onClose }) {
  const prof = slimeProfile(run.slime, run);
  const sp = SPECIES[run.slime.species];
  const cf = sp.rules?.copiesFor || [1, 3, 6];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel slime-panel" onClick={e => e.stopPropagation()}>
        <div className="row spread"><h2>{sp.icon} {sp.name}</h2><button onClick={onClose}>Close</button></div>
        <div className="row">
          <Slime species={run.slime.species} element={prof.element} mass={prof.stats.mass} slotted={run.slime.slotted} levels={prof.levels} relics={run.relics} />
          <div className="stats">
            <div>🫧 Mass {run.slime.hp}/{maxMass(run)}</div>
            <div>💪 FIRM {prof.stats.firm}</div>
            <div>💨 SLIP {prof.stats.slip}</div>
            <div>🌀 VISC {prof.stats.visc}</div>
            <div className="muted small">Element: {prof.element || 'none'} ({Object.entries(prof.affinity).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ') || 'no affinity'})</div>
            <div className="muted small">Base values shown before relics and keystones apply in battle.</div>
          </div>
        </div>

        <h3>Slots {run.slime.slotted.length}/{slotCount(run)} <span className="muted small">— top to bottom is the order Actions fire in</span></h3>
        {run.slime.slotted.map((e, i) => (
          <div key={e.id} className="slot-row">
            <div className="slot-move">
              <button className="small" disabled={i === 0} onClick={() => act(reorderSlot, i, -1)}>▲</button>
              <button className="small" disabled={i === run.slime.slotted.length - 1} onClick={() => act(reorderSlot, i, 1)}>▼</button>
            </div>
            <EssenceCard id={e.id} owned={e} copiesFor={cf} />
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

        {run.relics.length > 0 && (
          <>
            <h3>Swallowed relics</h3>
            <div className="cards">{run.relics.map(id => <RelicCard key={id} id={id} />)}</div>
          </>
        )}
      </div>
    </div>
  );
}

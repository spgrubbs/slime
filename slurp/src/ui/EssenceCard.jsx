import React from 'react';
import { ESSENCES, essenceDesc, displayName, LEVEL_NAMES, isSlotted } from '../engine/content/essences.js';
import { FAMILIES } from '../engine/content/families.js';

const TYPE_LABEL = { stat: 'Stat', element: 'Element', action: 'Action', reflex: 'Reflex', trait: 'Trait', keystone: 'Keystone' };

/**
 * One essence. `owned` is the slime's copy (if any), `adds` how many copies
 * picking this would add, `copiesFor` the species' fusion thresholds.
 */
export default function EssenceCard({ id, owned = null, adds = 0, copiesFor = [1, 3, 6], onClick, selected, badge, compact }) {
  const d = ESSENCES[id];
  if (!d) return null;
  const copies = owned?.copies || 0;
  const level = (c) => (owned?.apex ? 3 : c >= copiesFor[2] ? 2 : c >= copiesFor[1] ? 1 : 0);
  const now = copies ? level(copies) : null;
  const after = isSlotted(id) && adds ? level(copies + adds) : now;
  const L = after ?? 0;
  const fuses = isSlotted(id) && copies > 0 && after > now;
  const fam = FAMILIES[d.family];

  return (
    <div className={`ess-card ${d.rarity} ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''} ${compact ? 'compact' : ''}`} onClick={onClick}>
      <div className="ess-top">
        <span className="ess-icon">{d.icon}</span>
        <span className="ess-name">{displayName(id, L)}{isSlotted(id) ? ` ${LEVEL_NAMES[L]}` : ''}</span>
        {badge && <span className="badge">{badge}</span>}
      </div>
      <div className="ess-tags small">
        {TYPE_LABEL[d.type]}{fam ? ` · ${fam.icon} ${fam.name}` : ''}{d.element ? ` · ${d.element}` : ''}{d.cd ? ` · CD ${d.cd}` : ''} · {d.rarity}
      </div>
      {!compact && <div className="ess-desc">{essenceDesc(id, L)}</div>}
      {isSlotted(id) && (
        <div className="pips small">
          {copiesFor[2] && Array.from({ length: copiesFor[2] }, (_, k) => (
            <span key={k} className={k < copies ? 'pip on' : k < copies + adds ? 'pip add' : 'pip'} />
          ))}
          <span className="muted"> {copies + adds}/{copiesFor[2]}{fuses ? ' → FUSION!' : copies ? ' owned' : ' new'}</span>
        </div>
      )}
      {!isSlotted(id) && copies > 0 && <div className="muted small">owned ×{copies}</div>}
    </div>
  );
}

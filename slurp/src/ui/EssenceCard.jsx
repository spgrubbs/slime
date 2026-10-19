import React from 'react';
import { ESSENCES, essenceDesc, displayName, LEVEL_NAMES, isSlotted } from '../engine/content/essences.js';
import { FAMILIES } from '../engine/content/families.js';
import { TAGS } from '../engine/content/tags.js';
import { mutationDef } from '../engine/content/mutations.js';
import { tagsOf } from '../engine/combatant.js';

const TYPE_LABEL = { stat: 'Stat', element: 'Element', action: 'Action', reflex: 'Reflex', trait: 'Trait', keystone: 'Keystone' };

export function TagChips({ tags, owned = {} }) {
  return (
    <div className="tags">
      {tags.map(t => TAGS[t] && (
        <span key={t} className={`tag ${owned[t] ? 'have' : ''}`} title={owned[t] ? `You have ${owned[t]} ${TAGS[t].name}` : TAGS[t].name}>
          {TAGS[t].icon} {TAGS[t].name}{owned[t] ? ` ${owned[t]}` : ''}
        </span>
      ))}
    </div>
  );
}

/**
 * One essence. `owned` is the slime's copy (if any), `adds` how many copies
 * picking this would add, `copiesFor` the species' fusion thresholds,
 * `myTags` the slime's tag counts (highlights shared tags).
 */
export default function EssenceCard({ id, owned = null, adds = 0, copiesFor = [1, 3, 6], onClick, selected, badge, compact, myTags = {}, warn }) {
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
        {TYPE_LABEL[d.type]}{fam ? ` · ${fam.name}` : ''}{d.cd ? ` · CD ${d.cd}` : ''} · {d.rarity}
      </div>
      <TagChips tags={tagsOf(id)} owned={myTags} />
      {!compact && <div className="ess-desc">{essenceDesc(id, L)}</div>}
      {(owned?.mods || []).length > 0 && (
        <div className="mods">
          {owned.mods.map(k => { const m = mutationDef(k); return m && <div key={k} className="mod small">🧬 <b>{m.name}</b>: {m.desc}</div>; })}
        </div>
      )}
      {isSlotted(id) && (
        <div className="pips small">
          {Array.from({ length: copiesFor[2] }, (_, k) => (
            <span key={k} className={`pip ${k < copies ? 'on' : k < copies + adds ? 'add' : ''} ${k + 1 === copiesFor[1] || k + 1 === copiesFor[2] ? 'milestone' : ''}`} />
          ))}
          <span className="muted"> {copies + adds}/{copiesFor[2]}{fuses ? ' → MUTATION!' : copies ? ' owned' : ' new'}</span>
        </div>
      )}
      {!isSlotted(id) && copies > 0 && <div className="muted small">owned ×{copies}</div>}
      {warn && <div className="warn small">{warn}</div>}
    </div>
  );
}

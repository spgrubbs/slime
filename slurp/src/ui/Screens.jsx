import React, { useState } from 'react';
import {
  absorb, digest, chooseBoon, shopBuy, leaveShop, usePool, poolHealPct, takeTreasure, chooseEvent, leaveEvent,
  nextAct, needsReplace, slotCount, maxMass, huskValue, eventChoiceAllowed, levelOfOwned,
} from '../engine/run.js';
import { heirloomChoices } from '../engine/meta.js';
import { genesFor } from '../engine/content/upgrades.js';
import { ESSENCES, displayName, LEVEL_NAMES } from '../engine/content/essences.js';
import { RELICS } from '../engine/content/relics.js';
import { ENEMIES, ACTS } from '../engine/content/enemies.js';
import { EVENTS } from '../engine/content/events.js';
import { SPECIES } from '../engine/content/species.js';
import { fmt } from '../engine/battle.js';
import EssenceCard from './EssenceCard.jsx';

const copiesFor = (run) => SPECIES[run.slime.species].rules?.copiesFor || [1, 3, 6];
const owned = (run, id) => run.slime.slotted.find(e => e.id === id) || run.slime.stats.find(e => e.id === id) || null;

/** Pick one of the slime's slotted essences. */
function SlotPicker({ run, title, onPick, onCancel, disabled = () => false, note }) {
  return (
    <div className="overlay">
      <div className="panel">
        <h3>{title}</h3>
        <div className="cards">
          {run.slime.slotted.map((e, i) => (
            <EssenceCard key={e.id} id={e.id} owned={e} copiesFor={copiesFor(run)} compact
              badge={note ? note(e) : null} onClick={disabled(e) ? undefined : () => onPick(i)} />
          ))}
        </div>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Absorb ───────────────────────────────────────────────────────────────────

export function AbsorbScreen({ run, act }) {
  const p = run.pending;
  const [replaceFor, setReplaceFor] = useState(null);
  const enemy = ENEMIES[p.enemyId];
  const choose = (i) => {
    if (needsReplace(run, p.options[i].id)) setReplaceFor(i);
    else act(absorb, i);
  };
  return (
    <div className="panel">
      <h2>{p.kind === 'boss' ? '👑 Boss Essence' : `Absorb ${enemy.icon} ${enemy.name}`}</h2>
      <p className="muted">
        Pick {p.picks > 1 ? `${p.picks} essences` : 'one essence'} to make part of you. Eating heals 5%.
        Slots {run.slime.slotted.length}/{slotCount(run)}.
      </p>
      <div className="cards">
        {p.options.map((o, i) => (
          <EssenceCard key={o.id} id={o.id} owned={owned(run, o.id)} adds={o.copies} copiesFor={copiesFor(run)}
            badge={o.copies > 1 ? `Concentrated ×${o.copies}` : o.signature ? 'Signature' : o.rare ? 'Rare!' : null}
            onClick={() => choose(i)} />
        ))}
      </div>
      {p.kind !== 'boss' && (
        <div className="row">
          <button onClick={() => act(digest, 'gel')}>Digest instead: +15 Gel</button>
          <button onClick={() => act(digest, 'heal')}>Digest instead: heal 15%</button>
        </div>
      )}
      {p.kind === 'boss' && p.options.length === 0 && <button onClick={() => act(digest, 'gel')}>Continue</button>}
      {replaceFor !== null && (
        <SlotPicker run={run} title={`Slots full: expel one to make room for ${ESSENCES[p.options[replaceFor].id].name}`}
          note={(e) => `Husk ${huskValue(e)} Gel`}
          onPick={(slot) => { act(absorb, replaceFor, slot); setReplaceFor(null); }} onCancel={() => setReplaceFor(null)} />
      )}
    </div>
  );
}

// ── Fusion Burst ─────────────────────────────────────────────────────────────

export function FusionScreen({ run, act }) {
  const { burst, boons } = run.fusion;
  return (
    <div className="panel center fusion">
      <div className="fusion-flash">{ESSENCES[burst.id].icon}</div>
      <h2>FUSION! {displayName(burst.id, burst.level)} {LEVEL_NAMES[burst.level]}</h2>
      <p className="muted">Pick a Fusion Burst boon.</p>
      <div className="row wrap">
        {boons.map((b, i) => <button key={i} className="primary" onClick={() => act(chooseBoon, i)}>{b.label}</button>)}
      </div>
    </div>
  );
}

// ── Shop ─────────────────────────────────────────────────────────────────────

export function ShopScreen({ run, act }) {
  const s = run.pending;
  const [picker, setPicker] = useState(null); // { kind, index? }
  const buyEssence = (i) => {
    if (needsReplace(run, s.essences[i].id)) setPicker({ kind: 'essence', index: i });
    else act(shopBuy, 'essence', i);
  };
  return (
    <div className="panel">
      <h2>🛒 The Gelatinous Bazaar</h2>
      <p className="muted">Shelly the hermit crab peers out of her jam jar. You have 💧 {run.gel} Gel.</p>
      <h3>Essence vials</h3>
      <div className="cards">
        {s.essences.map((e, i) => (
          <div key={e.id} className="shop-item">
            <EssenceCard id={e.id} owned={owned(run, e.id)} adds={1} copiesFor={copiesFor(run)} />
            <button disabled={e.sold || run.gel < e.price} onClick={() => buyEssence(i)}>{e.sold ? 'Sold' : `💧 ${e.price}`}</button>
          </div>
        ))}
      </div>
      <h3>Relics</h3>
      <div className="cards">
        {s.relics.map((r, i) => (
          <div key={r.id} className="shop-item">
            <RelicCard id={r.id} />
            <button disabled={r.sold || run.gel < r.price} onClick={() => act(shopBuy, 'relic', i)}>{r.sold ? 'Sold' : `💧 ${r.price}`}</button>
          </div>
        ))}
      </div>
      <h3>Services</h3>
      <div className="row wrap">
        <button disabled={s.services.heal.used || run.gel < s.services.heal.price} onClick={() => act(shopBuy, 'heal')}>Heal 30% · 💧{s.services.heal.price}</button>
        <button disabled={run.gel < s.services.infuse.price || !run.slime.slotted.length} onClick={() => setPicker({ kind: 'infuse' })}>Infuse +1 copy · 💧{s.services.infuse.price}</button>
        <button disabled={run.gel < s.services.remove.price || run.slime.slotted.length <= 1} onClick={() => setPicker({ kind: 'remove' })}>Remove an essence · 💧{s.services.remove.price}</button>
      </div>
      <button className="primary" onClick={() => act(leaveShop)}>Leave</button>
      {picker && (
        <SlotPicker run={run}
          title={picker.kind === 'essence' ? 'Slots full: expel one' : picker.kind === 'infuse' ? 'Infuse which essence?' : 'Remove which essence?'}
          onPick={(slot) => {
            if (picker.kind === 'essence') act(shopBuy, 'essence', picker.index, slot);
            else act(shopBuy, picker.kind, null, slot);
            setPicker(null);
          }}
          onCancel={() => setPicker(null)} />
      )}
    </div>
  );
}

export function RelicCard({ id }) {
  const r = RELICS[id];
  if (!r) return null;
  return (
    <div className={`ess-card relic ${r.rarity}`}>
      <div className="ess-top"><span className="ess-icon">{r.icon}</span><span className="ess-name">{r.name}</span></div>
      <div className="ess-tags small">Relic · {r.rarity}</div>
      <div className="ess-desc">{r.desc}</div>
    </div>
  );
}

// ── Pool ─────────────────────────────────────────────────────────────────────

export function PoolScreen({ run, act }) {
  const [picker, setPicker] = useState(null);
  const pct = Math.round(poolHealPct(run) * 100);
  return (
    <div className="panel center">
      <h2>💧 A Quiet Pool</h2>
      <p className="muted">Mass {run.slime.hp}/{maxMass(run)}. Choose one.</p>
      <div className="row wrap">
        <button className="primary" onClick={() => act(usePool, 'soak')}>Soak: heal {pct}%</button>
        <button disabled={!run.slime.slotted.some(e => levelOfOwned(run, e) < 2)} onClick={() => setPicker('ferment')}>Ferment: +1 copy</button>
        <button disabled={run.slime.slotted.length <= 1} onClick={() => setPicker('molt')}>Molt: remove an essence</button>
      </div>
      {picker && (
        <SlotPicker run={run} title={picker === 'ferment' ? 'Ferment which essence?' : 'Molt which essence?'}
          disabled={(e) => picker === 'ferment' && levelOfOwned(run, e) >= 2}
          note={picker === 'molt' ? (e) => `+${huskValue(e)} Gel` : null}
          onPick={(i) => { act(usePool, picker, i); setPicker(null); }} onCancel={() => setPicker(null)} />
      )}
    </div>
  );
}

// ── Treasure ─────────────────────────────────────────────────────────────────

export function TreasureScreen({ run, act }) {
  const p = run.pending;
  return (
    <div className="panel center">
      <h2>{p.source === 'elite' ? '💀 The elite dropped something shiny' : '🎁 A cache!'}</h2>
      {p.relic ? <RelicCard id={p.relic} /> : <p className="muted">Nothing new inside.</p>}
      {p.gel > 0 && <p>+{p.gel} Gel</p>}
      <button className="primary big" onClick={() => act(takeTreasure)}>{p.relic ? 'Swallow it' : 'Continue'}</button>
    </div>
  );
}

// ── Event ────────────────────────────────────────────────────────────────────

export function EventScreen({ run, act }) {
  const ev = EVENTS[run.pending.eventId];
  return (
    <div className="panel event">
      <h2>{ev.icon} {ev.title}</h2>
      <p>{ev.text}</p>
      {!run.pending.result ? (
        <div className="choices">
          {ev.choices.map((c, i) => (
            <button key={i} disabled={!eventChoiceAllowed(run, c)} onClick={() => act(chooseEvent, i)}>{c.label}</button>
          ))}
        </div>
      ) : (
        <>
          <p className="result-text">{run.pending.result}</p>
          <button className="primary" onClick={() => act(leaveEvent)}>Continue</button>
        </>
      )}
    </div>
  );
}

// ── Act complete ─────────────────────────────────────────────────────────────

export function ActCompleteScreen({ run, act }) {
  const p = run.pending;
  const next = p.act + 1 < ACTS.length ? ACTS[p.act + 1] : null;
  return (
    <div className="panel center">
      <h2>Act {p.act + 1} cleared!</h2>
      <p>Healed {p.healed} Mass.{p.slot ? ' Your membrane stretches: +1 essence slot.' : ''}</p>
      <p className="muted">{next ? `Next: ${next.icon} ${next.name}, ${next.biome}` : 'Next: the Hollow. Something waits at the bottom.'}</p>
      <button className="primary big" onClick={() => act(nextAct)}>Descend</button>
    </div>
  );
}

// ── Run end ──────────────────────────────────────────────────────────────────

export function RunEndScreen({ run, onBank }) {
  const choices = heirloomChoices(run);
  const [heir, setHeir] = useState(null);
  const won = run.phase === 'victory';
  const s = run.stats;
  return (
    <div className="panel center">
      <h1>{won ? '👑 The Hollow One is devoured!' : '💧 Your champion melts back into the Pool'}</h1>
      <p className="muted">
        Act {Math.min(run.act + 1, 4)} · {s.floors} floors · {s.kills} kills · {s.elites} elites · {s.bosses} bosses ·
        {' '}{s.fusions} fusions · biggest hit {fmt(s.biggestHit)} · peak Mass {fmt(s.peakMass)}
      </p>
      <h2>+{genesFor(s, run.salt)} 🧬 Genes</h2>
      {choices.length > 0 && (
        <>
          <p>Bank one essence as your Heirloom (used by the Ancestral Memory upgrade):</p>
          <div className="row wrap">
            {choices.map(id => (
              <button key={id} className={heir === id ? 'chip on' : 'chip'} onClick={() => setHeir(heir === id ? null : id)}>
                {ESSENCES[id].icon} {ESSENCES[id].name}
              </button>
            ))}
          </div>
        </>
      )}
      <button className="primary big" onClick={() => onBank(heir)}>Return to the Brood Pool</button>
    </div>
  );
}

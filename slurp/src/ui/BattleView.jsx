import React, { useEffect, useMemo, useRef, useState } from 'react';
import { finishBattle, maxMass } from '../engine/run.js';
import { slimeProfile } from '../engine/combatant.js';
import { ENEMIES } from '../engine/content/enemies.js';
import { SPECIES } from '../engine/content/species.js';
import { STATUS_ICON, fmt } from '../engine/battle.js';
import Slime, { EnemyBody } from './Slime.jsx';

// The battle has already been resolved — this only replays its records.
// There is no input during a fight: it always plays out, and the build
// decides the result. Speed only changes how fast you watch it.

const BEAT_MS = { round: 220, hit: 480, damage: 380, dodge: 380, action: 320, status: 220, heal: 260, membrane: 240, death: 900, stunned: 420, start: 500, log: 320 };
const SPEEDS = [1, 2, 4, 8];

function readSpeed() {
  try { return Number(localStorage.getItem('slurp_speed')) || 1; } catch { return 1; }
}

export default function BattleView({ run, act }) {
  const b = run.battle;
  const records = b.records || [];
  const [i, setI] = useState(0);
  const [speed, setSpeed] = useState(readSpeed);
  const logRef = useRef(null);
  const done = i >= records.length;

  useEffect(() => {
    if (done) return undefined;
    const kind = records[i]?.kind;
    const t = setTimeout(() => setI(n => n + 1), (BEAT_MS[kind] || 300) / speed);
    return () => clearTimeout(t);
  }, [i, speed, done, records]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [i]);

  const changeSpeed = (s) => {
    setSpeed(s);
    try { localStorage.setItem('slurp_speed', String(s)); } catch { /* ignore */ }
  };

  const enemy = ENEMIES[b.enemyId];
  const prof = useMemo(() => slimeProfile(run.slime, run), [run]);
  const cur = records[Math.min(i, records.length - 1)];
  const snap = cur?.snap;
  const p = snap?.player || { hp: run.slime.hp, maxHp: maxMass(run), membrane: 0, status: {} };
  const e = snap?.enemy || { hp: 0, maxHp: enemy.stats.mass, membrane: 0, status: {} };
  const hitOnPlayer = cur && !done && ['hit', 'damage'].includes(cur.kind) && cur.target === 'player';
  const hitOnEnemy = cur && !done && ['hit', 'damage'].includes(cur.kind) && cur.target === 'enemy';
  const win = b.winner === 'player';

  return (
    <div className="panel battle">
      <div className="battle-head">
        <span>{b.kind === 'boss' ? '👑 Boss' : b.kind === 'elite' ? '💀 Elite' : '⚔️ Fight'} · Round {cur?.round || 0}</span>
        <span className="speeds">{SPEEDS.map(s => <button key={s} className={s === speed ? 'chip on' : 'chip'} onClick={() => changeSpeed(s)}>{s}×</button>)}</span>
      </div>

      <div className="arena">
        <Fighter name={SPECIES[run.slime.species].name} s={p} hurt={hitOnPlayer} pop={hitOnPlayer ? cur : null}>
          <Slime species={run.slime.species} element={prof.element} mass={p.maxHp} slotted={run.slime.slotted} levels={prof.levels} relics={run.relics} hurt={hitOnPlayer} />
        </Fighter>
        <div className="vs">vs</div>
        <Fighter name={enemy.name} s={e} hurt={hitOnEnemy} pop={hitOnEnemy ? cur : null}>
          <EnemyBody icon={enemy.icon} size={b.kind === 'boss' ? 140 : b.kind === 'elite' ? 120 : 100} hurt={hitOnEnemy} />
        </Fighter>
      </div>

      <div className="log" ref={logRef}>
        {records.slice(Math.max(0, i - 40), i + 1).map((r, k) => (
          <div key={k} className={`log-line ${r.kind} ${r.tone || ''} ${r.crit ? 'crit' : ''}`}>{r.text}</div>
        ))}
      </div>

      {done && (
        <div className={`result ${win ? 'good' : 'bad'}`}>
          <h2>{win ? `${enemy.name} melts into a puddle…` : 'Your champion dissolves.'}</h2>
          {win && run.pending?.gel > 0 && <p>+{run.pending.gel} Gel{run.pending.massGained ? ` · +${run.pending.massGained} max Mass` : ''}{b.flawless ? ' · ✨ Flawless (+1 option)' : ''}{b.devoured ? ' · 😋 Devoured (absorb 2)' : ''}</p>}
          <p className="muted small">{b.rounds} rounds · biggest hit {fmt(b.stats.biggestHit)} · most actions in a round {b.stats.mostActions}</p>
          <button className="primary big" onClick={() => act(finishBattle)}>{win ? 'Absorb' : 'Continue'}</button>
        </div>
      )}
    </div>
  );
}

function Fighter({ name, s, hurt, pop, children }) {
  const pct = Math.max(0, Math.min(100, (s.hp / s.maxHp) * 100));
  const statuses = Object.entries(s.status || {}).filter(([k, v]) => v > 0 && STATUS_ICON[k]);
  return (
    <div className="fighter">
      <div className="fighter-name">{name}</div>
      <div className="bar"><div className="fill" style={{ width: `${pct}%` }} />{s.membrane > 0 && <div className="membrane">🛡️{fmt(s.membrane)}</div>}</div>
      <div className="muted small">{fmt(s.hp)} / {fmt(s.maxHp)}</div>
      <div className={`body-wrap ${hurt ? 'shake' : ''}`}>
        {children}
        {pop && pop.amount > 0 && <div key={pop.text} className={`pop ${pop.crit ? 'crit' : ''}`}>-{fmt(pop.amount)}</div>}
      </div>
      <div className="statuses">{statuses.map(([k, v]) => <span key={k} title={k}>{STATUS_ICON[k]}{v}</span>)}</div>
    </div>
  );
}

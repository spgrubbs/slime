import React, { useState } from 'react';
import {
  CARAVAN_UNITS, rollCaravan, caravanManifest, caravanValue,
  getCaravanScaling, caravanDay, ESCAPE_ROUNDS, catapultDamage,
} from '../data/caravanData.js';
import { STAT_INFO } from '../data/slimeData.js';
import SlimeSprite from './SlimeSprite.jsx';
import CombatView from './CombatView.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Caravan ambush
//
// One decision: who goes. Everything else is a damage race you can walk away
// from — which is what keeps individual slimes worth caring about.
// ─────────────────────────────────────────────────────────────────────────────

const panel = {
  background: 'rgba(0,0,0,0.3)',
  borderRadius: 10,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.08)',
};
const label = { fontSize: 11, opacity: 0.7, marginBottom: 6 };

// ── Setup ────────────────────────────────────────────────────────────────────

function ScoutReport({ tier, day, scouted }) {
  const caravan = rollCaravan(tier, day);
  const scaling = getCaravanScaling(tier);

  if (!scouted) {
    return (
      <div style={{ ...panel, marginBottom: 12, borderLeft: '3px solid #6b7280' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, fontWeight: 'bold' }}>🌫️ Unknown column</span>
          <span style={{ fontSize: 10, opacity: 0.6 }}>Tier {tier}</span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 6 }}>
          <strong>{caravan.units.length}</strong> in the column. Nothing else visible.
        </div>
        <div style={{ fontSize: 10, opacity: 0.55, marginTop: 8 }}>
          🔭 Scout Camp reveals the manifest
        </div>
      </div>
    );
  }

  const manifest = caravanManifest(caravan);
  const value = caravanValue(caravan);

  return (
    <div style={{ ...panel, marginBottom: 12, borderLeft: '3px solid #22d3ee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 'bold' }}>🔭 Scout report</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>Tier {tier} · {caravan.units.length} units</span>
      </div>

      {manifest.map(m => (
        <div key={m.id} style={{ display: 'flex', gap: 8, padding: '5px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 15, width: 22 }}>{m.def.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11 }}>
              <strong>{m.count}×</strong> {m.def.name}
              <span style={{ opacity: 0.55 }}> · {Math.floor(m.def.hp * getCaravanScaling(tier).hpMultiplier)} HP</span>
              {m.def.critImmune && <span style={{ color: '#f59e0b' }}> · crit-immune</span>}
              {m.def.statusImmune && <span style={{ color: '#f59e0b' }}> · status-immune</span>}
            </div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{m.def.desc}</div>
          </div>
        </div>
      ))}

      <div style={{ fontSize: 10, opacity: 0.75, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        Full haul if you take the whole column: <strong style={{ color: '#4ade80' }}>{value.biomass}🧬</strong>
        {' '}+ {Object.entries(value.mats).map(([m, c]) => `${c}× ${m}`).join(', ')}
        {' '}+ <strong style={{ color: '#f59e0b' }}>1💎</strong>
      </div>
      <div style={{ fontSize: 9, opacity: 0.55, marginTop: 4 }}>
        Unit HP ×{scaling.hpMultiplier.toFixed(2)} · damage ×{scaling.damageMultiplier.toFixed(2)} · loot ×{scaling.lootMultiplier.toFixed(2)}
      </div>
    </div>
  );
}

function Setup({ slimes, getSlimeStats, tier, scouted, squadSize, catapults, cooldownLeft, onStart }) {
  const [squad, setSquad] = useState([]);
  const toggle = (id) => setSquad(s =>
    s.includes(id) ? s.filter(x => x !== id) : s.length < squadSize ? [...s, id] : s);

  const ready = squad.length > 0 && !cooldownLeft;

  return (
    <div>
      <ScoutReport tier={tier} day={caravanDay()} scouted={scouted} />

      <div style={{ ...panel, marginBottom: 12 }}>
        <div style={label}>Ambush squad ({squad.length}/{squadSize})</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 10, opacity: 0.7, marginBottom: 10, flexWrap: 'wrap' }}>
          <span>⏳ {ESCAPE_ROUNDS} rounds</span>
          <span>💰 paid per kill</span>
          <span>🏃 leave any time</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 210, overflowY: 'auto' }}>
          {slimes.map(s => {
            const stats = getSlimeStats(s);
            const picked = squad.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  padding: 6, borderRadius: 8, cursor: 'pointer', fontSize: 9, color: '#fff',
                  background: picked ? 'rgba(74,222,128,0.18)' : 'rgba(0,0,0,0.35)',
                  border: picked ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.1)',
                }}
              >
                <SlimeSprite tier={s.tier} size={26} mutations={s.mutations} primaryElement={s.primaryElement} />
                <span>{s.name.split(' ')[0]}</span>
                <span style={{ display: 'flex', gap: 3, fontSize: 8 }}>
                  <span style={{ color: STAT_INFO.firmness.color }}>💪{stats.firmness}</span>
                  <span style={{ color: STAT_INFO.slipperiness.color }}>💨{stats.slipperiness}</span>
                  <span style={{ color: STAT_INFO.viscosity.color }}>🌀{stats.viscosity}</span>
                </span>
              </button>
            );
          })}
          {!slimes.length && <span style={{ fontSize: 11, opacity: 0.5 }}>No slimes free</span>}
        </div>
      </div>

      {catapults > 0 && (
        <div style={{ ...panel, marginBottom: 12, borderLeft: '3px solid #4ade80' }}>
          <div style={{ fontSize: 11, color: '#4ade80' }}>
            🪃 {catapults} Slime Catapult{catapults === 1 ? '' : 's'} on the road
          </div>
          <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4 }}>
            {catapultDamage(catapults, tier)} damage to the lead unit, every round.
          </div>
        </div>
      )}

      <button
        onClick={() => onStart(squad)}
        disabled={!ready}
        style={{
          width: '100%', padding: 14, borderRadius: 8, border: 'none', fontWeight: 'bold',
          color: '#fff', cursor: ready ? 'pointer' : 'not-allowed',
          background: ready ? 'linear-gradient(135deg, #ef4444, #f59e0b)' : 'rgba(100,100,100,0.5)',
        }}
      >
        {cooldownLeft
          ? `⏳ Next caravan in ${cooldownLeft}`
          : squad.length === 0
            ? 'Pick at least one slime'
            : `🎯 Spring the ambush (${squad.length})`}
      </button>
    </div>
  );
}

// ── Battle ───────────────────────────────────────────────────────────────────

function EscapeClock({ round, escapeRounds }) {
  const left = Math.max(0, escapeRounds - round);
  const pct = Math.max(0, Math.min(1, left / escapeRounds));
  const urgent = left <= 6;
  const color = urgent ? '#ef4444' : left <= 12 ? '#f59e0b' : '#22d3ee';

  return (
    <div style={{ ...panel, marginBottom: 10, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 'bold' }}>
          {urgent ? '⚠️ They are almost clear' : '⏳ Time to work'}
        </span>
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 15, fontWeight: 'bold', color }}>
          {left} <span style={{ fontSize: 10, opacity: 0.7 }}>rounds left</span>
        </span>
      </div>
      <div style={{ height: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%', background: color,
          transition: 'width 0.3s linear',
        }} />
      </div>
      <div style={{ fontSize: 9, opacity: 0.55, marginTop: 4 }}>
        Round {round} of {escapeRounds}
      </div>
    </div>
  );
}

function Battle({ ambush, verboseLogs, setVerboseLogs, onRetreat }) {
  const remaining = ambush.units.filter(u => !u.dead).length;
  const roundsLeft = Math.max(0, ambush.escapeRounds - ambush.round);
  const matLine = Object.entries(ambush.banked.mats)
    .map(([m, c]) => `${c}× ${m}`).join(', ');

  const view = {
    zone: 'road',
    slimes: ambush.slimes,
    enemies: ambush.units.filter(u => !u.dead).slice(0, 6),
    focusId: ambush.units.find(u => !u.dead)?.id,
    marching: true,
    marchProgress: ambush.round / ambush.escapeRounds,
  };

  return (
    <div>
      <EscapeClock round={ambush.round} escapeRounds={ambush.escapeRounds} />
      <CombatView
        view={view}
        anim={ambush.anim}
        logs={ambush.logs}
        verboseLogs={verboseLogs}
        setVerboseLogs={setVerboseLogs}
        hud={[
          { text: `🎯 ${ambush.killed.length} down · ${remaining} left`, color: '#f59e0b' },
          ...(ambush.catapults > 0 ? [{ text: `🪃 ×${ambush.catapults}`, color: '#4ade80' }] : []),
          { text: `⏳ ${roundsLeft}`, color: roundsLeft <= 6 ? '#ef4444' : '#22d3ee' },
        ]}
      />

      <div style={{ ...panel, marginTop: 10, borderLeft: '3px solid #4ade80' }}>
        <div style={label}>Banked — yours either way</div>
        <div style={{ fontSize: 12, color: '#4ade80' }}>🧬 {ambush.banked.biomass} biomass</div>
        {matLine && <div style={{ fontSize: 11, opacity: 0.85 }}>📦 {matLine}</div>}
      </div>

      <button
        onClick={onRetreat}
        style={{
          width: '100%', marginTop: 10, padding: 12, borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.4)',
          color: '#e0e0e0', fontWeight: 'bold', cursor: 'pointer',
        }}
      >
        🏃 Break off — keep the haul
      </button>
    </div>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────

function Result({ summary, onClose }) {
  const { routed, reason, banked, killed, remaining, survivors, lost, rounds, nextTier, tier } = summary;
  const good = routed || banked.biomass > 0;

  const title = {
    rout: '💎 Caravan routed',
    escaped: '🌫️ They broke through',
    retreated: '🏃 Withdrew with the haul',
    wiped: '💀 Squad lost',
  }[reason];

  return (
    <div style={{
      ...panel,
      background: routed ? 'rgba(34,211,238,0.12)' : good ? 'rgba(74,222,128,0.10)' : 'rgba(239,68,68,0.12)',
      border: `1px solid ${routed ? 'rgba(34,211,238,0.4)' : good ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.4)'}`,
    }}>
      <div style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, textAlign: 'center', opacity: 0.75, marginBottom: 12 }}>
        {killed.length} killed · {remaining} escaped · {rounds} rounds
      </div>

      <div style={{ ...panel, marginBottom: 8 }}>
        <div style={label}>Haul</div>
        <div style={{ fontSize: 12 }}>🧬 +{banked.biomass} biomass</div>
        {banked.prisms > 0 && <div style={{ fontSize: 12, color: '#f59e0b' }}>💎 +{banked.prisms} Prism</div>}
        {Object.entries(banked.mats).map(([m, c]) => (
          <div key={m} style={{ fontSize: 11, opacity: 0.85 }}>📦 {c}× {m}</div>
        ))}
        {!banked.biomass && !Object.keys(banked.mats).length && (
          <div style={{ fontSize: 11, opacity: 0.6 }}>Nothing — the column got clear before anything fell.</div>
        )}
      </div>

      {routed && (
        <div style={{ ...panel, marginBottom: 8, borderLeft: '3px solid #22d3ee' }}>
          <div style={{ fontSize: 11, color: '#22d3ee' }}>
            The road gets more dangerous. Caravans rise to <strong>tier {nextTier}</strong> —
            bigger columns, tougher escorts, better cargo.
          </div>
        </div>
      )}

      {lost.length > 0 && (
        <div style={{ ...panel, marginBottom: 8, borderLeft: '3px solid #ef4444' }}>
          <div style={label}>Lost in the ambush</div>
          {lost.map(s => <div key={s.id} style={{ fontSize: 11, color: '#f87171' }}>💔 {s.name}</div>)}
        </div>
      )}

      {survivors.length > 0 && (
        <div style={{ ...panel, marginBottom: 8 }}>
          <div style={label}>Home safe</div>
          <div style={{ fontSize: 11, color: '#4ade80' }}>
            {survivors.map(s => s.name.split(' ')[0]).join(', ')}
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        style={{
          width: '100%', padding: 12, borderRadius: 8, border: 'none', fontWeight: 'bold',
          color: '#fff', cursor: 'pointer', background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
        }}
      >
        Close
      </button>
    </div>
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────

export default function Caravan({
  ambush, slimes, getSlimeStats, tier, scouted, squadSize, catapults = 0, cooldownLeft,
  onStart, onRetreat, onClose, verboseLogs, setVerboseLogs,
}) {
  if (!ambush) {
    return (
      <Setup
        slimes={slimes}
        getSlimeStats={getSlimeStats}
        tier={tier}
        scouted={scouted}
        squadSize={squadSize}
        catapults={catapults}
        cooldownLeft={cooldownLeft}
        onStart={onStart}
      />
    );
  }
  if (ambush.summary) return <Result summary={ambush.summary} onClose={onClose} />;
  return (
    <Battle
      ambush={ambush}
      verboseLogs={verboseLogs}
      setVerboseLogs={setVerboseLogs}
      onRetreat={onRetreat}
    />
  );
}

import React, { useState, useEffect } from 'react';
import {
  CARAVAN_UNITS, rollCaravan, caravanManifest, caravanValue,
  getCaravanScaling, caravanDay, ESCAPE_ROUNDS, catapultDamage,
} from '../data/caravanData.js';
import { STAT_INFO } from '../data/slimeData.js';
import SlimeSprite from './SlimeSprite.jsx';
import CombatView from './CombatView.jsx';
import { ROUND_MS } from '../data/gameConstants.js';
import { cue } from '../audio/index.js';

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
          <strong>{caravan.units.length}</strong> in the column. We can't see more from here.
        </div>
        <div style={{ fontSize: 10, opacity: 0.55, marginTop: 8 }}>
          🔭 A Scout Camp would tell us what they're carrying
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
          <span>🏃 about {Math.round(ESCAPE_ROUNDS * ROUND_MS / 1000)}s before they're gone</span>
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
          {!slimes.length && <span style={{ fontSize: 11, opacity: 0.5 }}>Nobody's free</span>}
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

function Battle({ ambush, verboseLogs, setVerboseLogs, onRetreat, onClose }) {
  const remaining = ambush.units.filter(u => !u.dead).length;
  const matLine = Object.entries(ambush.banked.mats)
    .map(([m, c]) => `${c}× ${m}`).join(', ');
  const over = !!ambush.summary;

  // The result waits a beat after the fight ends so the last blow is seen
  // landing, then comes up over the battle instead of replacing the screen.
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    if (!over) { setShowResult(false); return undefined; }
    const t = setTimeout(() => {
      setShowResult(true);
      const reason = ambush.summary.reason;
      cue(reason === 'rout' ? 'fanfare' : reason === 'wiped' ? 'fall'
        : ambush.summary.banked.biomass > 0 ? 'victory' : 'recall');
    }, 1300);
    return () => clearTimeout(t);
  }, [over]);

  // How far down the road the column has walked, smoothly between rounds.
  // The walk is the clock: when the head of the column reaches the far edge,
  // it is clear of the ambush.
  const progress = Math.min(1,
    (ambush.round + Math.min(1, (ambush.roundTimer || 0) / ROUND_MS)) / ambush.escapeRounds);

  const view = {
    zone: 'road',
    slimes: ambush.slimes,
    enemies: ambush.units.filter(u => !u.dead).slice(0, 6),
    focusId: ambush.units.find(u => !u.dead)?.id,
    marching: true,
    marchProgress: over ? (ambush.summary.reason === 'escaped' ? 1 : progress) : progress,
  };

  return (
    <div style={{ position: 'relative' }}>
      <CombatView
        view={view}
        anim={ambush.anim}
        logs={ambush.logs}
        verboseLogs={verboseLogs}
        setVerboseLogs={setVerboseLogs}
        hud={[
          { text: `🎯 ${ambush.killed.length} down · ${remaining} left`, color: '#f59e0b' },
          ...(ambush.catapults > 0 ? [{ text: `🪃 ×${ambush.catapults}`, color: '#4ade80' }] : []),
        ]}
      />

      <div style={{ ...panel, marginTop: 10, borderLeft: '3px solid #4ade80' }}>
        <div style={label}>Already ours, whatever happens</div>
        <div style={{ fontSize: 12, color: '#4ade80' }}>🧬 {ambush.banked.biomass} biomass</div>
        {matLine && <div style={{ fontSize: 11, opacity: 0.85 }}>📦 {matLine}</div>}
      </div>

      {!over && (
        <button
          onClick={onRetreat}
          style={{
            width: '100%', marginTop: 10, padding: 12, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(0,0,0,0.4)',
            color: '#e0e0e0', fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          🏃 Break off and keep the haul
        </button>
      )}

      {over && showResult && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center', paddingTop: 8, background: 'rgba(5,7,10,0.82)', borderRadius: 8,
          animation: 'sqResultIn 0.35s ease-out',
        }}>
          <style>{'@keyframes sqResultIn { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }'}</style>
          <div style={{ width: '100%', maxWidth: 420, background: '#151b28', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
            <Result summary={ambush.summary} onClose={onClose} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────

function Result({ summary, onClose }) {
  const { routed, reason, banked, killed, remaining, survivors, lost, rounds, nextTier, tier } = summary;
  const good = routed || banked.biomass > 0;

  const title = {
    rout: '💎 Caravan routed',
    escaped: '🌫️ They got away',
    retreated: '🏃 We slipped away with the haul',
    wiped: '💀 Squad down',
  }[reason];

  return (
    <div style={{
      ...panel,
      background: routed ? 'rgba(34,211,238,0.12)' : good ? 'rgba(74,222,128,0.10)' : 'rgba(239,68,68,0.12)',
      border: `1px solid ${routed ? 'rgba(34,211,238,0.4)' : good ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.4)'}`,
    }}>
      <div style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, textAlign: 'center', opacity: 0.75, marginBottom: 12 }}>
        {killed.length} caught · {remaining} got away
      </div>

      <div style={{ ...panel, marginBottom: 8 }}>
        <div style={label}>Haul</div>
        <div style={{ fontSize: 12 }}>🧬 +{banked.biomass} biomass</div>
        {banked.prisms > 0 && <div style={{ fontSize: 12, color: '#f59e0b' }}>💎 +{banked.prisms} Prism</div>}
        {Object.entries(banked.mats).map(([m, c]) => (
          <div key={m} style={{ fontSize: 11, opacity: 0.85 }}>📦 {c}× {m}</div>
        ))}
        {!banked.biomass && !Object.keys(banked.mats).length && (
          <div style={{ fontSize: 11, opacity: 0.6 }}>Nothing. The column got past before we caught any of them.</div>
        )}
      </div>

      {routed && (
        <div style={{ ...panel, marginBottom: 8, borderLeft: '3px solid #22d3ee' }}>
          <div style={{ fontSize: 11, color: '#22d3ee' }}>
            Word gets around. Caravans rise to <strong>tier {nextTier}</strong>: bigger
            columns, tougher guards, better cargo.
          </div>
        </div>
      )}

      {lost.length > 0 && (
        <div style={{ ...panel, marginBottom: 8, borderLeft: '3px solid #ef4444' }}>
          <div style={label}>Hurt, need to mend</div>
          {lost.map(s => <div key={s.id} style={{ fontSize: 11, color: '#f87171' }}>🩹 {s.name}</div>)}
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
        Back to the road
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
  return (
    <Battle
      ambush={ambush}
      verboseLogs={verboseLogs}
      setVerboseLogs={setVerboseLogs}
      onRetreat={onRetreat}
      onClose={onClose}
    />
  );
}

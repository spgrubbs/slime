import React, { useState } from 'react';
import {
  TD_LANES, LANE_ORDER, TD_POSITIONS, POSITION_ORDER,
  HUMAN_TYPES, TD_WAVES, getWaveManifest,
} from '../data/towerDefenseData.js';
import { STAT_INFO } from '../data/slimeData.js';
import SlimeSprite from './SlimeSprite.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Tower Defense
//
// Setup is the game: read the manifest, choose which slime holds which
// position in which lane, commit. The battle is the consequence.
// ─────────────────────────────────────────────────────────────────────────────

const panel = {
  background: 'rgba(0,0,0,0.3)',
  borderRadius: 10,
  padding: 12,
  border: '1px solid rgba(255,255,255,0.08)',
};

const label = { fontSize: 11, opacity: 0.7, marginBottom: 6 };

// ── Setup ────────────────────────────────────────────────────────────────────

function WaveManifest({ queenLevel }) {
  const [open, setOpen] = useState(0);
  const manifest = getWaveManifest(open, queenLevel);

  return (
    <div style={{ ...panel, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 'bold' }}>📜 Wave Manifest</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TD_WAVES.map((w, i) => (
            <button
              key={w.wave}
              onClick={() => setOpen(i)}
              style={{
                fontSize: 10, padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
                background: open === i ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)',
                border: open === i ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
                color: open === i ? '#fbbf24' : '#999',
              }}
            >
              {w.wave}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#fbbf24', marginBottom: 8 }}>{manifest.name}</div>

      {manifest.lanes.map(l => (
        <div key={l.laneId} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 14, width: 22 }}>{l.lane.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: l.lane.color }}>{l.lane.name}</div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>
              {l.composition.length
                ? l.composition.map(c => `${c.count}× ${c.def.icon} ${c.def.name}`).join(' · ')
                : 'clear'}
            </div>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 9, opacity: 0.55, marginTop: 8 }}>
        Invader HP ×{manifest.scaling.hpMultiplier.toFixed(2)} · damage ×{manifest.scaling.damageMultiplier.toFixed(2)} · rewards ×{manifest.scaling.rewardMultiplier.toFixed(2)} at Queen {queenLevel}
      </div>
    </div>
  );
}

function InvaderKey() {
  const notable = ['shieldbearer', 'zealot', 'sapper', 'champion'];
  return (
    <div style={{ ...panel, marginBottom: 12 }}>
      <div style={label}>Know your enemy</div>
      {notable.map(id => {
        const h = HUMAN_TYPES[id];
        return (
          <div key={id} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 10 }}>
            <span style={{ fontSize: 13 }}>{h.icon}</span>
            <div>
              <span style={{ color: '#f87171' }}>{h.name}</span>
              <span style={{ opacity: 0.7 }}> — {h.desc}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PositionSlot({ laneId, posId, slime, onClear, onSelect, selecting }) {
  const pos = TD_POSITIONS[posId];
  const isTarget = selecting?.laneId === laneId && selecting?.posId === posId;

  return (
    <button
      onClick={() => (slime ? onClear(laneId, posId) : onSelect(laneId, posId))}
      title={pos.desc}
      style={{
        flex: 1,
        minHeight: 78,
        background: isTarget ? 'rgba(34,211,238,0.18)' : 'rgba(0,0,0,0.35)',
        border: isTarget ? '2px solid #22d3ee'
              : slime ? '2px solid rgba(74,222,128,0.5)'
              : '2px dashed rgba(255,255,255,0.18)',
        borderRadius: 8,
        color: '#fff',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <span style={{ fontSize: 13 }}>{pos.icon}</span>
      <span style={{ fontSize: 9, opacity: 0.75 }}>{pos.name}</span>
      {slime ? (
        <>
          <SlimeSprite tier={slime.tier} size={22} mutations={slime.mutations} primaryElement={slime.primaryElement} />
          <span style={{ fontSize: 8 }}>{slime.name.split(' ')[0]}</span>
        </>
      ) : (
        <span style={{ fontSize: 8, opacity: 0.4 }}>empty</span>
      )}
    </button>
  );
}

function Setup({ slimes, getSlimeStats, queenLevel, cooldownLeft, onStart }) {
  const [placements, setPlacements] = useState({});
  const [selecting, setSelecting] = useState(null);

  const placedIds = new Set(
    Object.values(placements).flatMap(lane => Object.values(lane || {})).filter(Boolean),
  );
  const available = slimes.filter(s => !placedIds.has(s.id));
  const placedCount = placedIds.size;

  const clear = (laneId, posId) => {
    setPlacements(p => ({ ...p, [laneId]: { ...p[laneId], [posId]: null } }));
    setSelecting(null);
  };
  const assign = (slimeId) => {
    if (!selecting) return;
    const { laneId, posId } = selecting;
    setPlacements(p => ({ ...p, [laneId]: { ...p[laneId], [posId]: slimeId } }));
    setSelecting(null);
  };

  return (
    <div>
      <WaveManifest queenLevel={queenLevel} />
      <InvaderKey />

      <div style={{ ...panel, marginBottom: 12 }}>
        <div style={label}>
          Positions — each rewards a different stat
        </div>
        {POSITION_ORDER.map(id => {
          const pos = TD_POSITIONS[id];
          const stat = STAT_INFO[pos.wants];
          return (
            <div key={id} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 10 }}>
              <span style={{ fontSize: 13 }}>{pos.icon}</span>
              <div>
                <span style={{ color: '#22d3ee' }}>{pos.name}</span>
                <span style={{ color: stat.color, opacity: 0.9 }}> ({stat.icon} {stat.name})</span>
                <span style={{ opacity: 0.7 }}> — {pos.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {LANE_ORDER.map(laneId => {
        const lane = TD_LANES[laneId];
        return (
          <div key={laneId} style={{ ...panel, marginBottom: 10, borderLeft: `3px solid ${lane.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 'bold' }}>{lane.icon} {lane.name}</span>
              <span style={{ fontSize: 9, opacity: 0.6 }}>{lane.march} rounds to cross</span>
            </div>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 8 }}>{lane.desc}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {POSITION_ORDER.map(posId => (
                <PositionSlot
                  key={posId}
                  laneId={laneId}
                  posId={posId}
                  slime={slimes.find(s => s.id === placements[laneId]?.[posId])}
                  onClear={clear}
                  onSelect={(l, p) => setSelecting({ laneId: l, posId: p })}
                  selecting={selecting}
                />
              ))}
            </div>
          </div>
        );
      })}

      {selecting && (
        <div style={{ ...panel, marginBottom: 10, border: '1px solid #22d3ee' }}>
          <div style={label}>
            Choose a slime for {TD_LANES[selecting.laneId].name} · {TD_POSITIONS[selecting.posId].name}
            <span style={{ opacity: 0.7 }}> — wants {STAT_INFO[TD_POSITIONS[selecting.posId].wants].name}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 170, overflowY: 'auto' }}>
            {available.map(s => {
              const stats = getSlimeStats(s);
              const wanted = TD_POSITIONS[selecting.posId].wants;
              return (
                <button
                  key={s.id}
                  onClick={() => assign(s.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: 6, background: 'rgba(0,0,0,0.35)', borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 9,
                  }}
                >
                  <SlimeSprite tier={s.tier} size={24} mutations={s.mutations} primaryElement={s.primaryElement} />
                  <span>{s.name.split(' ')[0]}</span>
                  <span style={{ color: STAT_INFO[wanted].color }}>
                    {STAT_INFO[wanted].icon}{stats[wanted]}
                  </span>
                </button>
              );
            })}
            {!available.length && <span style={{ fontSize: 11, opacity: 0.5 }}>No slimes free</span>}
          </div>
          <button
            onClick={() => setSelecting(null)}
            style={{ marginTop: 8, fontSize: 10, padding: '4px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#aaa', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}

      <div style={{ ...panel, marginBottom: 10, fontSize: 10, opacity: 0.8 }}>
        <strong style={{ color: '#f59e0b' }}>Stakes.</strong> Slimes in a lane that falls are lost for good.
        Everything else comes home. Clearing wave 3 pays a 💎 Prism; a defense with no
        lane lost also pays a 🏅 Champion Badge.
      </div>

      <button
        onClick={() => onStart(placements)}
        disabled={placedCount === 0 || cooldownLeft > 0}
        style={{
          width: '100%', padding: 14, borderRadius: 8, border: 'none', fontWeight: 'bold',
          color: '#fff', cursor: placedCount && !cooldownLeft ? 'pointer' : 'not-allowed',
          background: placedCount && !cooldownLeft
            ? 'linear-gradient(135deg, #ef4444, #f59e0b)'
            : 'rgba(100,100,100,0.5)',
        }}
      >
        {cooldownLeft > 0
          ? `⏳ Next assault in ${cooldownLeft}`
          : placedCount === 0
            ? 'Place at least one slime'
            : `🎯 Hold the Line (${placedCount} deployed)`}
      </button>
    </div>
  );
}

// ── Battle ───────────────────────────────────────────────────────────────────

function HpBar({ hp, maxHp, color = '#4ade80' }) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  return (
    <div style={{ height: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 2, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${pct * 100}%`, height: '100%', background: pct > 0.5 ? color : pct > 0.25 ? '#f59e0b' : '#ef4444' }} />
    </div>
  );
}

function LaneView({ lane, laneId }) {
  const def = TD_LANES[laneId];
  const marching = lane.invaders.filter(i => !i.dead);

  return (
    <div style={{
      ...panel,
      marginBottom: 8,
      borderLeft: `3px solid ${lane.breached ? '#ef4444' : def.color}`,
      opacity: lane.breached ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 'bold' }}>{def.icon} {def.name}</span>
        <span style={{ fontSize: 10, color: lane.breached ? '#ef4444' : lane.engaged ? '#f59e0b' : '#4ade80' }}>
          {lane.breached ? '💥 BREACHED' : lane.engaged ? '⚔️ engaged' : `${marching.length} inbound`}
        </span>
      </div>

      {/* The approach: distance from the line, left to right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 8, minHeight: 26, flexWrap: 'wrap' }}>
        {marching.length === 0 && <span style={{ fontSize: 10, opacity: 0.4 }}>lane clear</span>}
        {marching
          .slice()
          .sort((a, b) => a.march - b.march)
          .map(inv => (
            <div key={inv.id} title={`${inv.name} — ${inv.march <= 0 ? 'at the line' : `${inv.march} rounds out`}`}
                 style={{ textAlign: 'center', minWidth: 30 }}>
              <div style={{ fontSize: 14, filter: inv.march <= 0 ? 'none' : `grayscale(${Math.min(0.8, inv.march * 0.18)})` }}>
                {HUMAN_TYPES[inv.type]?.icon}
              </div>
              <HpBar hp={inv.hp} maxHp={inv.maxHp} color="#ef4444" />
              <div style={{ fontSize: 8, opacity: 0.6 }}>{inv.march <= 0 ? '⚔️' : inv.march}</div>
            </div>
          ))}
      </div>

      {/* The line */}
      <div style={{ display: 'flex', gap: 5 }}>
        {POSITION_ORDER.map(posId => {
          const c = lane.slots[posId];
          const pos = TD_POSITIONS[posId];
          return (
            <div key={posId} style={{
              flex: 1, padding: 4, borderRadius: 6, textAlign: 'center',
              background: 'rgba(0,0,0,0.35)',
              border: c && !c.dead ? '1px solid rgba(74,222,128,0.35)' : '1px dashed rgba(255,255,255,0.12)',
              opacity: c && c.dead ? 0.35 : 1,
            }}>
              <div style={{ fontSize: 11 }}>{pos.icon}</div>
              {c ? (
                <>
                  <div style={{ fontSize: 8, marginBottom: 2 }}>
                    {c.dead ? '💀' : c.name.split(' ')[0]}
                  </div>
                  <HpBar hp={c.hp} maxHp={c.maxHp} />
                  <div style={{ fontSize: 8, opacity: 0.65 }}>{Math.max(0, Math.ceil(c.hp))}</div>
                  {!!c.status?.length && (
                    <div style={{ fontSize: 8 }}>{c.status.map(s => s.type[0]).join('')}</div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 8, opacity: 0.3 }}>empty</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Battle({ td, verboseLogs, setVerboseLogs }) {
  return (
    <div>
      <div style={{ ...panel, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 'bold', color: '#f59e0b' }}>
          Wave {td.wave + 1} / {TD_WAVES.length} — {TD_WAVES[td.wave]?.name}
        </span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>Round {td.round}</span>
      </div>

      {LANE_ORDER.map(laneId => (
        <LaneView key={laneId} lane={td.lanes[laneId]} laneId={laneId} />
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(0,0,0,0.6)', borderRadius: 6, marginTop: 8 }}>
        <span style={{ fontSize: 10, opacity: 0.6 }}>Defense Log</span>
        <button
          onClick={() => setVerboseLogs(!verboseLogs)}
          title="Show the full damage derivation for every action"
          style={{
            fontSize: 9, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
            background: verboseLogs ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)',
            border: verboseLogs ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.2)',
            color: verboseLogs ? '#c084fc' : '#888',
          }}
        >
          📊 {verboseLogs ? 'Verbose ON' : 'Verbose'}
        </button>
      </div>
      <div style={{
        background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '6px 8px', marginTop: 4,
        maxHeight: verboseLogs ? 240 : 120, overflowY: 'auto', fontSize: 10,
      }}>
        {(td.logs || []).slice(verboseLogs ? -50 : -25).map((l, i) => (
          <div key={i} style={{ lineHeight: 1.45, padding: '1px 0' }}>
            <span style={{ color: l.c || '#e0e0e0' }}>{l.m}</span>
            {verboseLogs && l.v && (
              <div style={{
                fontSize: 9, opacity: 0.75, marginLeft: 10, color: '#a78bfa',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-word',
              }}>{l.v}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────

function Result({ summary, onClose }) {
  const { victory, flawless, rewards, survivors, lost, breaches, wavesCleared, rounds } = summary;

  return (
    <div style={{
      ...panel,
      background: victory ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
      border: `1px solid ${victory ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`,
    }}>
      <div style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
        {flawless ? '🏆 Flawless Defense' : victory ? '🎉 Line Held' : '💀 Hive Overrun'}
      </div>
      <div style={{ fontSize: 11, textAlign: 'center', opacity: 0.75, marginBottom: 12 }}>
        {wavesCleared}/{TD_WAVES.length} waves · {rounds} rounds · {breaches.length} lane{breaches.length === 1 ? '' : 's'} lost
      </div>

      <div style={{ ...panel, marginBottom: 8 }}>
        <div style={label}>Salvage</div>
        <div style={{ fontSize: 12 }}>🧬 +{rewards.biomass} biomass</div>
        {rewards.prisms > 0 && <div style={{ fontSize: 12, color: '#f59e0b' }}>💎 +{rewards.prisms} Prism</div>}
        {Object.entries(rewards.materials).map(([m, c]) => (
          <div key={m} style={{ fontSize: 11, opacity: 0.85 }}>
            📦 {c}× {m}{m === 'Champion Badge' ? ' 🏅' : ''}
          </div>
        ))}
        {!victory && (
          <div style={{ fontSize: 10, opacity: 0.65, marginTop: 6 }}>
            Partial salvage from the waves you did clear. Your stores were not touched.
          </div>
        )}
      </div>

      {lost.length > 0 && (
        <div style={{ ...panel, marginBottom: 8, borderLeft: '3px solid #ef4444' }}>
          <div style={label}>Lost holding the line</div>
          {lost.map(s => (
            <div key={s.id} style={{ fontSize: 11, color: '#f87171' }}>
              💔 {s.name} — {TD_LANES[s.lane].name}, {TD_POSITIONS[s.position].name}
            </div>
          ))}
        </div>
      )}

      {survivors.length > 0 && (
        <div style={{ ...panel, marginBottom: 8 }}>
          <div style={label}>Returned home</div>
          <div style={{ fontSize: 11, color: '#4ade80' }}>
            {survivors.map(s => s.name.split(' ')[0]).join(', ')}
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', fontWeight: 'bold', color: '#fff', cursor: 'pointer', background: 'linear-gradient(135deg, #4ade80, #22d3ee)' }}
      >
        Close
      </button>
    </div>
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────

export default function TowerDefense({
  towerDefense, slimes, getSlimeStats, queenLevel, cooldownLeft,
  onStart, onClose, verboseLogs, setVerboseLogs,
}) {
  if (!towerDefense) {
    return (
      <Setup
        slimes={slimes}
        getSlimeStats={getSlimeStats}
        queenLevel={queenLevel}
        cooldownLeft={cooldownLeft}
        onStart={onStart}
      />
    );
  }

  if (towerDefense.summary) {
    return <Result summary={towerDefense.summary} onClose={onClose} />;
  }

  return <Battle td={towerDefense} verboseLogs={verboseLogs} setVerboseLogs={setVerboseLogs} />;
}

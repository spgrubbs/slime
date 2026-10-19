import React, { useEffect, useRef } from 'react';
import { enterNode, actDef, maxMass } from '../engine/run.js';
import { NODE_TYPES, reachable, COLS } from '../engine/map.js';
import { ENEMIES } from '../engine/content/enemies.js';
import { FAMILIES } from '../engine/content/families.js';

const ROW_H = 58;

export default function MapView({ run, act }) {
  const map = run.map;
  const nodes = Object.values(map.nodes);
  const maxRow = Math.max(...nodes.map(n => n.row));
  const height = (maxRow + 1) * ROW_H + 40;
  const width = 340;
  const x = (c) => 24 + (c / (COLS - 1)) * (width - 48);
  const y = (r) => height - 30 - r * ROW_H;
  const next = new Set(reachable(map, run.current));
  const visited = new Set(run.visited);
  const a = actDef(run);
  const boss = ENEMIES[a.boss];
  const scrollRef = useRef(null);
  const curRow = run.current ? map.nodes[run.current].row : -1;

  // Keep the player's position in view (the map grows upward from row 1).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = Math.max(0, y(curRow + 1) - el.clientHeight * 0.6);
  }, [curRow, run.act]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="panel">
      <h2>{a.icon} {a.name} <span className="muted">— {a.biome}</span></h2>
      <p className="muted small">
        Mass {run.slime.hp}/{maxMass(run)} · Boss: {boss.icon} {boss.name}
      </p>
      <div className="map-scroll" ref={scrollRef}>
        <svg width={width} height={height} className="map">
          {nodes.flatMap(n => n.next.map(m => {
            const t = map.nodes[m];
            const lit = visited.has(n.id) && (visited.has(m) || next.has(m));
            return <line key={`${n.id}>${m}`} x1={x(n.col)} y1={y(n.row)} x2={x(t.col)} y2={y(t.row)}
              stroke={lit ? '#a3e635' : 'rgba(255,255,255,0.18)'} strokeWidth={lit ? 3 : 2} strokeDasharray={lit ? '' : '4 4'} />;
          }))}
          {nodes.map(n => {
            const can = next.has(n.id);
            const done = visited.has(n.id);
            const t = NODE_TYPES[n.type];
            return (
              <g key={n.id} className={can ? 'node can' : 'node'} onClick={() => can && act(enterNode, n.id)}>
                <circle cx={x(n.col)} cy={y(n.row)} r={n.type === 'boss' ? 22 : 16}
                  fill={done ? '#365314' : can ? '#1e293b' : '#0f172a'} stroke={can ? '#a3e635' : n.id === run.current ? '#fde047' : '#475569'} strokeWidth={can ? 3 : 1.5} />
                <text x={x(n.col)} y={y(n.row) + 1} textAnchor="middle" dominantBaseline="middle" fontSize={n.type === 'boss' ? 20 : 15}>
                  {n.type === 'boss' ? boss.icon : t.icon}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="muted small legend">
        {['fight', 'elite', 'event', 'mystery', 'shop', 'pool', 'treasure'].map(t => `${NODE_TYPES[t].icon} ${NODE_TYPES[t].name}`).join('  ·  ')}
      </p>
      <p className="muted small">Fights in this act draw from: {[...new Set(a.normals?.map(id => ENEMIES[id].family) || [])].map(f => `${FAMILIES[f].icon} ${FAMILIES[f].name}`).join(', ')}</p>
    </div>
  );
}

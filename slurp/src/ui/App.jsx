import React, { useEffect, useState } from 'react';
import { newRun, serializeRun, RUN_VERSION, abandonRun } from '../engine/run.js';
import { newProfile, applyRunEnd, metaForRun, PROFILE_VERSION } from '../engine/meta.js';
import { newSeed } from '../engine/rng.js';
import Hub from './Hub.jsx';
import MapView from './MapView.jsx';
import BattleView from './BattleView.jsx';
import { AbsorbScreen, FusionScreen, ShopScreen, PoolScreen, TreasureScreen, EventScreen, ActCompleteScreen, RunEndScreen } from './Screens.jsx';
import SlimePanel from './SlimePanel.jsx';

const PROFILE_KEY = 'slurp_profile_v1';
const RUN_KEY = 'slurp_run_v1';

function load(key, version) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v?.version === version ? v : null;
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the game still runs.
  }
}

export default function App() {
  const [profile, setProfile] = useState(() => load(PROFILE_KEY, PROFILE_VERSION) || newProfile());
  const [run, setRun] = useState(() => {
    const r = load(RUN_KEY, RUN_VERSION);
    // A battle's replay isn't saved; resuming mid-replay jumps to its outcome.
    if (r?.phase === 'battle' && !r.battle?.records) r.battle = { ...r.battle, records: [] };
    return r;
  });
  const [error, setError] = useState(null);
  const [showSlime, setShowSlime] = useState(false);

  useEffect(() => save(PROFILE_KEY, profile), [profile]);
  useEffect(() => save(RUN_KEY, run ? serializeRun(run) : null), [run]);

  /** Apply an engine action; engine errors surface as a toast instead of crashing. */
  const act = (fn, ...args) => {
    try {
      setRun(fn(run, ...args));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const startRun = ({ species, salt, seed }) => {
    setRun(newRun({ seed: seed || newSeed(), species, salt, meta: metaForRun(profile) }));
  };

  const bankRun = (heirloomId) => {
    const { profile: p } = applyRunEnd(profile, run, heirloomId);
    setProfile(p);
    setRun(null);
  };

  let screen;
  if (!run) {
    screen = <Hub profile={profile} setProfile={setProfile} onStart={startRun} />;
  } else {
    const props = { run, act };
    screen = {
      map: <MapView {...props} />,
      battle: <BattleView {...props} />,
      absorb: <AbsorbScreen {...props} />,
      fusion: <FusionScreen {...props} />,
      shop: <ShopScreen {...props} />,
      pool: <PoolScreen {...props} />,
      treasure: <TreasureScreen {...props} />,
      event: <EventScreen {...props} />,
      actComplete: <ActCompleteScreen {...props} />,
      victory: <RunEndScreen run={run} onBank={bankRun} />,
      defeat: <RunEndScreen run={run} onBank={bankRun} />,
    }[run.phase] || <div className="panel">Unknown phase: {run.phase}</div>;
  }

  const inRun = run && !['victory', 'defeat'].includes(run.phase);
  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">🟢 SLURP</span>
        {inRun ? <RunHud run={run} onSlime={() => setShowSlime(s => !s)} onAbandon={() => act(abandonRun)} />
          : <span className="hud-item">🧬 {profile.genes} Genes</span>}
      </header>
      {error && <div className="toast" onClick={() => setError(null)}>{error}</div>}
      <main>{screen}</main>
      {inRun && showSlime && <SlimePanel run={run} act={act} onClose={() => setShowSlime(false)} />}
    </div>
  );
}

function RunHud({ run, onSlime, onAbandon }) {
  // In-page confirm: browser dialogs are unavailable in some hosts (and clunky on phones).
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return undefined;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);
  return (
    <div className="hud">
      <span className="hud-item">Act {Math.min(run.act + 1, 4)}</span>
      <span className="hud-item">💧 {run.gel}</span>
      {run.salt > 0 && <span className="hud-item">🧂 {run.salt}</span>}
      <button className="small" onClick={onSlime}>Slime</button>
      <button className={confirming ? 'small danger' : 'small ghost'} onClick={() => (confirming ? onAbandon() : setConfirming(true))}>
        {confirming ? 'Tap again to abandon' : '✕'}
      </button>
    </div>
  );
}

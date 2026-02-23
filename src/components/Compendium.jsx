import React, { useState } from 'react';
import { ZONES } from '../data/zoneData.js';
import { MONSTER_TYPES, MONSTER_ABILITIES } from '../data/monsterData.js';
import { MUTATION_LIBRARY } from '../data/traitData.js';
import { ELEMENTS } from '../data/gameConstants.js';

const Compendium = ({ queen, monsterKills, unlockedMutations }) => {
  const [tab, setTab] = useState('zones'); // 'zones' | 'mechanics'
  const [zone, setZone] = useState('forest');
  const z = ZONES[zone];

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 15 }}>
        <button onClick={() => setTab('zones')} style={{ padding: '10px 16px', background: tab === 'zones' ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${tab === 'zones' ? '#22d3ee' : 'transparent'}`, borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
          🗺️ Zones & Monsters
        </button>
        <button onClick={() => setTab('mechanics')} style={{ padding: '10px 16px', background: tab === 'mechanics' ? 'rgba(236,72,153,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${tab === 'mechanics' ? '#ec4899' : 'transparent'}`, borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
          📖 Game Mechanics
        </button>
      </div>

      {tab === 'zones' ? (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 15, flexWrap: 'wrap' }}>
            {Object.entries(ZONES).map(([k,zn]) => {
              const ok = zn.unlocked || (queen?.level || 1) >= (zn.unlock || 0);
              return <button key={k} onClick={() => ok && setZone(k)} style={{ padding: '8px 12px', background: zone===k ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${zone===k?'#22d3ee':'transparent'}`, borderRadius: 6, color: '#fff', cursor: ok?'pointer':'not-allowed', opacity: ok?1:0.4, fontSize: 12 }}>{zn.icon} {zn.name}</button>;
            })}
          </div>
          <div style={{ background: `linear-gradient(135deg, ${z.bg}, ${z.bg}cc)`, padding: 15, borderRadius: 10, marginBottom: 15 }}>
            <div style={{ fontSize: 24, marginBottom: 5 }}>{z.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>{z.name}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{z.desc}</div>
            {z.unlock && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 5 }}>Unlocks at Queen Lv.{z.unlock}</div>}
            {z.element && (
              <div style={{ fontSize: 11, color: ELEMENTS[z.element]?.color, marginTop: 5 }}>
                {ELEMENTS[z.element]?.icon} {ELEMENTS[z.element]?.name} Zone (+{z.elementGainRate}/kill)
              </div>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Monsters</div>
          {z.monsters.map(mid => {
            const m = MONSTER_TYPES[mid];
            if (!m) return null;
            const mutation = m.mutation ? MUTATION_LIBRARY[m.mutation] : null;
            const kills = monsterKills?.[mid] || 0;
            const isUnlocked = mutation && unlockedMutations?.includes(m.mutation);
            const progress = mutation ? Math.min(100, (kills / mutation.requiredKills) * 100) : 0;
            const discovered = kills > 0;
            const monAbility = m.ability ? MONSTER_ABILITIES[m.ability] : null;

            if (!discovered) {
              return (
                <div key={mid} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 10, textAlign: 'center', opacity: 0.5 }}>
                  <div style={{ fontSize: 40 }}>❓</div>
                  <div style={{ fontSize: 14, fontStyle: 'italic', marginTop: 8 }}>Defeat this monster to unlock its entry</div>
                </div>
              );
            }

            return (
              <div key={mid} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 8 }}>
                  <span style={{ fontSize: 40 }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 'bold' }}>{m.name}</span>
                      {m.rare && <span style={{ fontSize: 9, color: '#f59e0b', background: 'rgba(245,158,11,0.2)', padding: '2px 6px', borderRadius: 4 }}>RARE</span>}
                      {m.element && (
                        <span style={{ fontSize: 12, color: ELEMENTS[m.element]?.color }}>
                          {ELEMENTS[m.element]?.icon}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{'⭐'.repeat(m.tier || 1)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#4ade80' }}>{kills}</div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>kills</div>
                  </div>
                </div>
                {m.desc && <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10, fontStyle: 'italic' }}>{m.desc}</div>}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, flexWrap: 'wrap' }}>
                  <span>❤️ {m.hp} HP</span><span>⚔️ {m.dmg} ATK</span><span>🧬 +{m.biomass} biomass</span>
                </div>
                {monAbility && (
                  <div style={{ marginBottom: 10, background: 'rgba(168,85,247,0.1)', borderRadius: 6, padding: 8 }}>
                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Special Ability</div>
                    <div style={{ fontSize: 11 }}>
                      <span>{monAbility.icon} <strong>{monAbility.name}</strong></span>
                      <span style={{ opacity: 0.7 }}> - {monAbility.desc}</span>
                      <span style={{ opacity: 0.5, fontSize: 10 }}> ({Math.round(monAbility.chance * 100)}% chance)</span>
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Material Drops</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.mats.map((mat,i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(245,158,11,0.2)', borderRadius: 4 }}>📦 {mat} <span style={{ opacity: 0.6 }}>(50%)</span></span>)}
                  </div>
                </div>

                {/* Mutation Progress Section - only show if monster has a mutation */}
                {mutation && (
                  <div style={{
                    background: isUnlocked ? 'rgba(168,85,247,0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: 8,
                    padding: 10,
                    border: isUnlocked ? '2px solid #a855f7' : '2px solid transparent'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>{mutation.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 'bold' }}>{mutation.name}</span>
                        {isUnlocked && <span style={{ fontSize: 10, color: '#4ade80', background: 'rgba(74,222,128,0.2)', padding: '2px 6px', borderRadius: 4 }}>UNLOCKED</span>}
                      </div>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>{kills}/{mutation.requiredKills}</span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: isUnlocked
                          ? 'linear-gradient(90deg, #a855f7, #c084fc)'
                          : 'linear-gradient(90deg, #4ade80, #22c55e)',
                        transition: 'width 0.3s',
                        boxShadow: isUnlocked ? '0 0 8px #a855f7' : 'none'
                      }} />
                    </div>

                    {/* Mutation Details */}
                    <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 4 }}>
                      {mutation.stat && mutation.bonus && `+${mutation.bonus} ${mutation.stat} (on spawn) • `}
                      {typeof mutation.passiveDesc === 'function' ? mutation.passiveDesc(10) : mutation.passiveDesc}
                    </div>
                    {mutation.elementBonus && (
                      <div style={{ fontSize: 10 }}>
                        {Object.entries(mutation.elementBonus).map(([elem, bonus]) => (
                          <span key={elem} style={{ color: ELEMENTS[elem]?.color, marginRight: 8 }}>
                            {ELEMENTS[elem]?.icon}+{bonus}% starting affinity
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <div style={{ display: 'grid', gap: 15 }}>
          {/* Core Resources */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#4ade80' }}>🧬 Core Resources</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Biomass 🧬</strong> - The primary currency. Gained from defeating monsters on expeditions. Used for spawning slimes, constructing buildings, and research. Slimes accumulate biomass during expeditions which increases their stats.</div>
              <div><strong>Royal Jelly 🍯</strong> - The Queen's essence that sustains slimes. Base capacity is 30, +5 per Queen level, +5 from Jelly Production skill, +10 per Slime Pit building (max 5). Slime costs: Basic 5, Enhanced 20, Elite 50, Royal 100. Mutations cost 3 jelly each.</div>
              <div><strong>Prisms 💎</strong> - Rare premium currency. 0.1% drop chance per monster kill. Used for special ranch buildings like the Nullifier Chamber and Luxury Lounge.</div>
              <div><strong>Materials 📦</strong> - Dropped by monsters (50% base chance per kill). Each monster drops specific materials used for buildings and ranch construction.</div>
            </div>
          </div>

          {/* Queen System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#ec4899' }}>👑 Queen System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Queen Level</strong> - Max level 50. Increases by reabsorbing slimes. Each level grants 1 skill point and +5 Royal Jelly capacity.</div>
              <div><strong>Reabsorption</strong> - Dissolve a slime to gain XP. Slimes accumulate XP from expedition kills. XP required scales exponentially (100 x 1.25^level).</div>
              <div><strong>Skill Trees</strong> - 3 trees: Ooze Outreach (exploration/zones), Hive Growth (economy/buildings), Slime Combat (stats/abilities). Spend skill points to unlock zones, buildings, abilities, and passive bonuses.</div>
              <div><strong>Zone Unlocks</strong> - Murky Swamp (Lv.5), Crystal Grotto (Lv.10), Cinderspire (Lv.18), Stormspire Summit (Lv.28), Void Abyss (Lv.40). Also requires corresponding skill tree node.</div>
            </div>
          </div>

          {/* Slime Tiers */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#22d3ee' }}>🧫 Slime Tiers</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Basic</strong> - 5 jelly, 1x stats, 30 HP, 1 mutation slot, 80% max biomass bonus. Comfortable in Zone 1.</div>
              <div><strong>Enhanced</strong> - 20 jelly, 2x stats, 75 HP, 2 mutation slots, 100% max biomass bonus. Requires Spawning Vat building. Comfortable in Zones 2-3.</div>
              <div><strong>Elite</strong> - 50 jelly, 3.5x stats, 150 HP, 3 mutation slots, 120% max biomass bonus. Requires Royal Hatchery building. Comfortable in Zones 3-4.</div>
              <div><strong>Royal</strong> - 100 jelly, 5x stats, 300 HP, 4 mutation slots, 150% max biomass bonus. Requires Primordial Chamber building. Comfortable in Zones 5-6.</div>
              <div><strong>Biomass Scaling</strong> - Accumulated biomass increases all stats. Each tier has a "biomass per %" value (Basic: 3, Enhanced: 8, Elite: 20, Royal: 40) determining how quickly stats grow.</div>
            </div>
          </div>

          {/* Combat System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#ef4444' }}>⚔️ Combat System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Firmness</strong> - Determines attack damage. Base damage = firmness stat, modified by traits, mutations, skills, and elements.</div>
              <div><strong>Slipperiness</strong> - Affects dodge chance (+1.5% per point) and crit chance (+1% per point). Base dodge is 5%, base crit is 5%.</div>
              <div><strong>Viscosity</strong> - Scales mutation passive effects (formula: baseValue + viscScale x viscosity). Higher viscosity = stronger mutation bonuses.</div>
              <div><strong>Turn Order</strong> - Combat is turn-based. Each slime and the monster take turns. Damage is modified by traits, mutations, skill tree bonuses, and elements.</div>
              <div><strong>Monster Abilities</strong> - Some monsters have special abilities (shown in their compendium entry) that trigger randomly instead of normal attacks.</div>
              <div><strong>Status Effects</strong> - Poison, Burn, Bleed deal damage over time. Stun skips turns. Slow reduces attack frequency.</div>
            </div>
          </div>

          {/* Element System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#3b82f6' }}>✨ Element System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Element Cycle</strong>: Fire 🔥 &gt; Nature 🌿 &gt; Earth 🪨 &gt; Water 💧 &gt; Fire. Strong = +25% damage, Weak = -25% damage.</div>
              <div><strong>Gaining Affinity</strong> - Slimes gain elemental affinity from fighting in elemental zones (rate varies by zone). At 100%, they become permanently attuned.</div>
              <div><strong>Elemental Ranches</strong> - Fire Grove, Tidal Pool, Earthen Den, and Verdant Nest also grant elemental affinity passively.</div>
              <div><strong>Void Trait</strong> - Slimes with Void cannot gain elements but deal neutral (unresisted) damage. Gained from the Nullifier Chamber ranch.</div>
              <div><strong>Mutations</strong> - Some mutations grant starting elemental affinity, giving a head start toward attunement.</div>
            </div>
          </div>

          {/* Mutation System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#a855f7' }}>🧪 Mutation System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Unlocking</strong> - Each monster type has an associated mutation. Kill enough of that monster (100-600 kills) to unlock it. Progress is tracked per expedition and shown in the Zones tab.</div>
              <div><strong>Mutation Slots</strong> - Basic: 1, Enhanced: 2, Elite: 3, Royal: 4. The Mutation Mastery skill grants +1 slot to all tiers. Each mutation costs 3 Royal Jelly.</div>
              <div><strong>Stat Bonuses</strong> - Each mutation grants a flat stat bonus on spawn (e.g., +2 firmness). This is added to base stats when the slime is created.</div>
              <div><strong>Passive Abilities</strong> - Each mutation grants a unique passive that activates in combat. Many scale with Viscosity (VISC scaling). The Mutation Mastery skill increases passive strength by 25%.</div>
              <div><strong>Examples</strong> - Sharp: auto-crit chance, Stoneskin: +firmness scaling with VISC, Ferocity: +15% damage, Armored: -20% damage taken, Reflect: return 15% damage.</div>
            </div>
          </div>

          {/* Mana System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#10b981' }}>🔮 Mana System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Earning Mana</strong> - Each slime generates 1 mana per hour (boosted by Mana Well ranch). More slimes = faster mana generation.</div>
              <div><strong>Hive Abilities</strong> - Spend mana to activate temporary buffs. Unlocked via the skill tree:</div>
              <ul style={{ margin: '0 0 0 20px', padding: 0, lineHeight: 1.8 }}>
                <li><strong>Primal Blessing</strong> (15 mana, 2h) - +10% base stats on newly spawned slimes</li>
                <li><strong>Nurturing Aura</strong> (25 mana, 4h) - Double ranch tick speed</li>
                <li><strong>Swift Expedition</strong> (35 mana, 2h) - Expeditions move 50% faster</li>
                <li><strong>Shared Vigor</strong> (50 mana, 2h) - Slimes heal 2 HP each time they attack</li>
                <li><strong>Bountiful Harvest</strong> (75 mana, 4h) - +25% biomass and material drops</li>
                <li><strong>Evolution Pulse</strong> (100 mana, 8h) - +50% elemental affinity gain everywhere</li>
                <li><strong>Slime Decoy</strong> (40 mana, one-time) - Blocks first raider in Tower Defense</li>
              </ul>
            </div>
          </div>

          {/* Ranch System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#22c55e' }}>🏠 Ranch System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Building Ranches</strong> - Unlocked via skill tree. Assign slimes to ranches for passive rewards (accumulates up to 24 hours). Collect by clicking.</div>
              <div><strong>Upgrades</strong> - Ranches can be upgraded to level 5. Each level: +1 capacity, +20% effect, -10% cycle time (max 50% reduction).</div>
              <div><strong>Ranch Types</strong>:</div>
              <ul style={{ margin: '0 0 0 20px', padding: 0, lineHeight: 1.8 }}>
                <li><strong>Feeding Pool</strong> 🥣 - 2 biomass per cycle (30 min). Unlocks at Queen Lv.3</li>
                <li><strong>Fire Grove / Tidal Pool / Earthen Den / Verdant Nest</strong> - +1 elemental affinity per cycle (1 hr)</li>
                <li><strong>Healing Spring</strong> 💚 - Passive HP regen scaling with Viscosity</li>
                <li><strong>War Den</strong> ⚔️ - +Tower Defense damage scaling with Firmness</li>
                <li><strong>Mana Well</strong> 🔮 - +mana/hr scaling with Viscosity</li>
                <li><strong>Scout Post</strong> 🔭 - +expedition rewards scaling with Slipperiness</li>
                <li><strong>Nullifier Chamber</strong> 🕳️ - Grants Void trait (25 Prisms)</li>
                <li><strong>Luxury Lounge</strong> ✨ - 8% chance for rare traits per cycle (50 Prisms)</li>
              </ul>
            </div>
          </div>

          {/* Buildings */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#f97316' }}>🏗️ Buildings & Research</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Tier Buildings</strong> - Spawning Vat (Enhanced), Royal Hatchery (Elite), Primordial Chamber (Royal). Each unlocks the next slime tier.</div>
              <div><strong>Slime Pit</strong> - +10 Royal Jelly capacity each, up to 5 pits (+50 total).</div>
              <div><strong>Biomass Reclaimer</strong> - 3 tiers: recovers 25%/50%/75% of a slime's biomass when it dies on expedition.</div>
              <div><strong>Research</strong> - Biomass Pools (+20% biomass), Absorption Nexus (+25% reabsorb XP), Vitality Chamber (+15% HP), Training Arena (+20% attack speed), Expedition Depot (100-kill runs), Deep Exploration Hub (infinite runs).</div>
            </div>
          </div>

          {/* Personality Traits */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#f59e0b' }}>💫 Personality Traits</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Generation</strong> - Slimes can randomly gain personality traits when spawned. Rare traits come from the Luxury Lounge ranch.</div>
              <div style={{ opacity: 0.8 }}><strong>Common:</strong></div>
              <ul style={{ margin: '0 0 0 20px', padding: 0, lineHeight: 1.6 }}>
                <li><strong>Brave</strong> 🦁 +5% damage when below 50% HP</li>
                <li><strong>Cautious</strong> 🛡️ +5% dodge when below 50% HP</li>
                <li><strong>Hardy</strong> 💪 +3% max HP</li>
                <li><strong>Swift</strong> ⚡ +3% crit chance</li>
                <li><strong>Wise</strong> 🧠 +5% element gain rate</li>
                <li><strong>Lazy</strong> 😴 -5% damage, +10% ranch effectiveness</li>
                <li><strong>Timid</strong> 😰 +10% dodge, -5% damage</li>
                <li><strong>Curious</strong> 🔍 +10% exploration event chance</li>
              </ul>
              <div style={{ opacity: 0.8 }}><strong>Uncommon:</strong></div>
              <ul style={{ margin: '0 0 0 20px', padding: 0, lineHeight: 1.6 }}>
                <li><strong>Lucky</strong> 🍀 +5% material drop rate</li>
                <li><strong>Greedy</strong> 💰 +5% biomass gain</li>
                <li><strong>Resilient</strong> 🔄 Recover 1 HP per kill</li>
                <li><strong>Fierce</strong> 😤 +8% damage on first attack</li>
                <li><strong>Reckless</strong> 💥 +10% damage, +5% damage taken</li>
                <li><strong>Glutton</strong> 🍖 +10% biomass gain, -3% max HP</li>
              </ul>
              <div style={{ opacity: 0.8 }}><strong>Rare/Legendary:</strong></div>
              <ul style={{ margin: '0 0 0 20px', padding: 0, lineHeight: 1.6 }}>
                <li><strong>Adaptable</strong> 🔀 +50% elemental affinity gain</li>
                <li><strong>Void</strong> 🕳️ Cannot gain elements, deals neutral damage</li>
                <li><strong>Ancient</strong> 📜 +1 mutation slot</li>
                <li><strong>Primordial</strong> 🌟 +10% all stats</li>
              </ul>
            </div>
          </div>

          {/* Tower Defense */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#ef4444' }}>🏰 Tower Defense</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Overview</strong> - Human raiders attack the hive. Assign slimes to defend. Difficulty scales with Queen level (+10% HP, +20% enemies, +15% rewards per level).</div>
              <div><strong>Cooldown</strong> - 24 hours between Tower Defense battles.</div>
              <div><strong>Party Slots</strong> - Base slots can be expanded with Defense Slot buildings and skill tree bonuses.</div>
              <div><strong>War Den</strong> - Ranch building that passively boosts Tower Defense damage based on assigned slimes' Firmness stat.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compendium;

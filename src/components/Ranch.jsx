import React, { useState } from 'react';
import { RANCH_TYPES, RANCH_UPGRADE_BONUSES, MAX_RANCH_LEVEL } from '../data/ranchData.js';
import { ELEMENTS } from '../data/gameConstants.js';
import { SLIME_TIERS } from '../data/slimeData.js';
import SlimeSprite from './SlimeSprite.jsx';

const Ranch = ({
  queen,
  bio,
  mats,
  prisms,
  slimes,
  exps,
  ranchBuildings,
  ranchAssignments,
  ranchProgress,
  ranchEvents,
  canBuildRanch,
  buildRanch,
  canUpgradeRanch,
  upgradeRanch,
  getRanchCapacity,
  canAssignToRanch,
  assignToRanch,
  removeFromRanch,
  getSlimeRanch,
}) => {
  const [selectedRanch, setSelectedRanch] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Get available slimes (not on expedition, not already assigned)
  const getAvailableSlimes = (ranchId) => {
    return slimes.filter(s => {
      // Not on expedition
      if (Object.values(exps).some(e => e.party.some(p => p.id === s.id))) return false;
      // Not assigned to any ranch
      for (const [rid, assigned] of Object.entries(ranchAssignments)) {
        if (assigned.includes(s.id)) return false;
      }
      return true;
    });
  };

  const getUpgradeCost = (ranchId) => {
    const ranch = RANCH_TYPES[ranchId];
    const building = ranchBuildings[ranchId];
    if (!ranch || !building) return null;
    const costMult = Math.pow(ranch.upgradeCost.multiplier, building.level - 1);
    return {
      biomass: ranch.upgradeCost.biomass ? Math.floor(ranch.upgradeCost.biomass * costMult) : 0,
      prisms: ranch.upgradeCost.prisms ? Math.floor(ranch.upgradeCost.prisms * costMult) : 0,
    };
  };

  const formatProgress = (ranchId) => {
    const ranch = RANCH_TYPES[ranchId];
    const building = ranchBuildings[ranchId];
    if (!ranch || !building) return { progress: 0, cycleTime: 0 };
    const cycleReduction = 1 - Math.min(0.5, (building.level - 1) * RANCH_UPGRADE_BONUSES.cycleReduction);
    const effectiveCycleTime = ranch.cycleTime * cycleReduction;
    const progress = ((ranchProgress[ranchId] || 0) / effectiveCycleTime) * 100;
    return { progress: Math.min(100, progress), cycleTime: effectiveCycleTime };
  };

  return (
    <div>
      <div style={{ marginBottom: 15 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>Slime Ranch</div>
          <div style={{ fontSize: 12, color: '#f59e0b' }}>
            <span style={{ marginRight: 10 }}>Prisms: {prisms}</span>
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
          Assign slimes to ranches for passive benefits. Slimes gain effects each cycle.
        </div>
      </div>

      {/* Ranch Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {Object.entries(RANCH_TYPES).map(([ranchId, ranch]) => {
          const building = ranchBuildings[ranchId];
          const isBuilt = !!building;
          const canBuild = canBuildRanch(ranchId);
          const isLocked = ranch.unlock.type === 'level' ? queen.level < ranch.unlock.value : prisms < ranch.unlock.value;
          const assigned = ranchAssignments[ranchId] || [];
          const capacity = getRanchCapacity(ranchId);
          const { progress, cycleTime } = isBuilt ? formatProgress(ranchId) : { progress: 0, cycleTime: ranch.cycleTime };

          return (
            <div
              key={ranchId}
              style={{
                background: isBuilt ? `linear-gradient(135deg, ${ranch.color}22, ${ranch.color}11)` : 'rgba(0,0,0,0.3)',
                borderRadius: 10,
                padding: 12,
                border: `2px solid ${isBuilt ? ranch.color : isLocked ? '#4b5563' : '#22d3ee'}`,
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{ranch.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 14 }}>{ranch.name}</div>
                  {isBuilt && (
                    <div style={{ fontSize: 10, color: ranch.color }}>Level {building.level}/{MAX_RANCH_LEVEL}</div>
                  )}
                </div>
                {isBuilt && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#4ade80' }}>{assigned.length}/{capacity}</div>
                    <div style={{ fontSize: 9, opacity: 0.6 }}>slimes</div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 10 }}>{ranch.desc}</div>

              {/* Effect Info */}
              <div style={{ fontSize: 10, background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 4, marginBottom: 10 }}>
                {ranch.effect === 'biomass' && (
                  <span>+{ranch.effectValue} biomass/cycle</span>
                )}
                {ranch.effect === 'element' && (
                  <span>{ELEMENTS[ranch.element]?.icon} +{ranch.effectValue}% {ELEMENTS[ranch.element]?.name}/cycle</span>
                )}
                {ranch.effect === 'stats' && (
                  <span>+{ranch.effectValue} random stat/cycle</span>
                )}
                {ranch.effect === 'trait' && ranch.grantsTrait === 'void' && (
                  <span>Grants Void trait (removes elements)</span>
                )}
                {ranch.effect === 'trait' && ranch.traitPool && (
                  <span>{(ranch.effectValue * 100).toFixed(0)}% chance for rare trait/cycle</span>
                )}
                <span style={{ marginLeft: 8, opacity: 0.6 }}>({cycleTime.toFixed(0)}s cycle)</span>
              </div>

              {/* Progress Bar (if built and has slimes) */}
              {isBuilt && assigned.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ height: 6, background: 'rgba(0,0,0,0.4)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${ranch.color}, ${ranch.color}cc)`,
                        transition: 'width 0.1s',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Assigned Slimes */}
              {isBuilt && assigned.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Assigned Slimes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {assigned.map(slimeId => {
                      const slime = slimes.find(s => s.id === slimeId);
                      if (!slime) return null;
                      return (
                        <div
                          key={slimeId}
                          onClick={() => removeFromRanch(slimeId, ranchId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 10,
                          }}
                          title="Click to remove"
                        >
                          <SlimeSprite tier={slime.tier} size={16} />
                          <span>{slime.name}</span>
                          <span style={{ opacity: 0.5 }}>x</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!isBuilt && !isLocked && (
                <button
                  onClick={() => buildRanch(ranchId)}
                  disabled={!canBuild}
                  style={{
                    width: '100%',
                    padding: 8,
                    background: canBuild ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${canBuild ? '#22d3ee' : '#4b5563'}`,
                    borderRadius: 6,
                    color: '#fff',
                    cursor: canBuild ? 'pointer' : 'not-allowed',
                    fontSize: 11,
                  }}
                >
                  Build ({ranch.cost.biomass ? `${ranch.cost.biomass} bio` : ''}{ranch.cost.prisms ? `${ranch.cost.prisms} prisms` : ''}
                  {ranch.cost.mats && Object.entries(ranch.cost.mats).map(([m, c]) => ` ${c} ${m}`).join('')})
                </button>
              )}

              {!isBuilt && isLocked && (
                <div style={{ fontSize: 10, textAlign: 'center', color: '#f59e0b', padding: 8 }}>
                  {ranch.unlock.type === 'level' ? `Unlocks at Queen Lv.${ranch.unlock.value}` : `Requires ${ranch.unlock.value} prisms`}
                </div>
              )}

              {isBuilt && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      setSelectedRanch(ranchId);
                      setShowAssignModal(true);
                    }}
                    disabled={assigned.length >= capacity}
                    style={{
                      flex: 1,
                      padding: 6,
                      background: assigned.length >= capacity ? 'rgba(0,0,0,0.3)' : 'rgba(34,211,238,0.2)',
                      border: `1px solid ${assigned.length >= capacity ? '#4b5563' : '#22d3ee'}`,
                      borderRadius: 6,
                      color: '#fff',
                      cursor: assigned.length >= capacity ? 'not-allowed' : 'pointer',
                      fontSize: 10,
                    }}
                  >
                    Assign Slime
                  </button>
                  {building.level < MAX_RANCH_LEVEL && (
                    <button
                      onClick={() => upgradeRanch(ranchId)}
                      disabled={!canUpgradeRanch(ranchId)}
                      style={{
                        padding: 6,
                        background: canUpgradeRanch(ranchId) ? 'rgba(74,222,128,0.2)' : 'rgba(0,0,0,0.3)',
                        border: `1px solid ${canUpgradeRanch(ranchId) ? '#4ade80' : '#4b5563'}`,
                        borderRadius: 6,
                        color: '#fff',
                        cursor: canUpgradeRanch(ranchId) ? 'pointer' : 'not-allowed',
                        fontSize: 10,
                      }}
                    >
                      Upgrade ({getUpgradeCost(ranchId)?.biomass || getUpgradeCost(ranchId)?.prisms})
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Events */}
      {ranchEvents.length > 0 && (
        <div style={{ marginTop: 15 }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>Recent Ranch Events</div>
          <div style={{ maxHeight: 100, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 8 }}>
            {ranchEvents.slice().reverse().map((event, i) => {
              const ranch = RANCH_TYPES[event.ranchId];
              return (
                <div key={i} style={{ fontSize: 10, opacity: 0.8, marginBottom: 4 }}>
                  <span style={{ color: ranch?.color }}>{ranch?.icon}</span> {event.msg}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedRanch && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAssignModal(false)}
        >
          <div
            style={{
              background: '#1a1a2e',
              borderRadius: 12,
              padding: 20,
              maxWidth: 400,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>
              Assign Slime to {RANCH_TYPES[selectedRanch].icon} {RANCH_TYPES[selectedRanch].name}
            </div>

            {getAvailableSlimes(selectedRanch).length === 0 ? (
              <div style={{ textAlign: 'center', opacity: 0.6, padding: 20 }}>
                No available slimes. Slimes on expeditions or already assigned cannot be selected.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {getAvailableSlimes(selectedRanch).map(slime => {
                  const tier = SLIME_TIERS[slime.tier];
                  return (
                    <div
                      key={slime.id}
                      onClick={() => {
                        if (canAssignToRanch(slime.id, selectedRanch)) {
                          assignToRanch(slime.id, selectedRanch);
                          setShowAssignModal(false);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 10,
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: '2px solid transparent',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = tier.color}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                    >
                      <SlimeSprite tier={slime.tier} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: 12 }}>{slime.name}</div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>{tier.name}</div>
                        {slime.primaryElement && (
                          <div style={{ fontSize: 10, color: ELEMENTS[slime.primaryElement]?.color }}>
                            {ELEMENTS[slime.primaryElement]?.icon} {ELEMENTS[slime.primaryElement]?.name}
                          </div>
                        )}
                        {slime.traits?.includes('lazy') && (
                          <div style={{ fontSize: 9, color: '#4ade80' }}>+10% ranch effectiveness</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setShowAssignModal(false)}
              style={{
                width: '100%',
                marginTop: 15,
                padding: 10,
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid #ef4444',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ranch;

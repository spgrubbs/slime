import React, { useState } from 'react';
import { RANCH_TYPES, RANCH_UPGRADE_BONUSES, MAX_RANCH_LEVEL, RANCH_MAX_ACCUMULATION_TIME } from '../data/ranchData.js';
import { ELEMENTS } from '../data/gameConstants.js';
import { SLIME_TIERS } from '../data/slimeData.js';
import SlimeSprite from './SlimeSprite.jsx';

// CSS keyframes for bouncing animation
const bounceKeyframes = `
@keyframes slimeBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
`;

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
  isRanchUnlocked,
  getAssignedSlimeIds,
  getSlimeAccumulated,
  getSlimeStartTime,
}) => {
  const [selectedRanch, setSelectedRanch] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Get available slimes (not on expedition, not already assigned)
  const getAvailableSlimes = () => {
    return slimes.filter(s => {
      if (Object.values(exps).some(e => e.party.some(p => p.id === s.id))) return false;
      for (const [rid, assigned] of Object.entries(ranchAssignments)) {
        const ids = (assigned || []).map(a => typeof a === 'object' ? a.slimeId : a);
        if (ids.includes(s.id)) return false;
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

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatAccumulatedReward = (ranchId, slimeId) => {
    const ranch = RANCH_TYPES[ranchId];
    const acc = getSlimeAccumulated(slimeId, ranchId);
    if (ranch.effect === 'biomass' && acc.biomass > 0) {
      return `+${Math.floor(acc.biomass)} biomass`;
    } else if (ranch.effect === 'element' && acc.element > 0) {
      return `+${acc.element.toFixed(1)}% ${ELEMENTS[ranch.element]?.name || ''}`;
    } else if (ranch.effect === 'stats' && acc.stats > 0) {
      return `+${acc.stats.toFixed(1)} stats`;
    } else if (ranch.effect === 'trait') {
      return `${acc.cycles || 0} cycles`;
    }
    return 'Accumulating...';
  };

  const getTimeRemaining = (slimeId, ranchId) => {
    const startTime = getSlimeStartTime(slimeId, ranchId);
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, RANCH_MAX_ACCUMULATION_TIME - elapsed);
    if (remaining <= 0) return 'MAX (24h)';
    return formatTime(remaining) + ' left';
  };

  const getTimeProgress = (slimeId, ranchId) => {
    const startTime = getSlimeStartTime(slimeId, ranchId);
    const elapsed = (Date.now() - startTime) / 1000;
    return Math.min(100, (elapsed / RANCH_MAX_ACCUMULATION_TIME) * 100);
  };

  // Only show ranches that are unlocked
  const visibleRanches = Object.entries(RANCH_TYPES).filter(([ranchId]) => isRanchUnlocked(ranchId));

  return (
    <div>
      <style>{bounceKeyframes}</style>

      {/* Header */}
      <div style={{ marginBottom: 15 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>Slime Ranch</div>
          <div style={{ display: 'flex', gap: 15, fontSize: 12 }}>
            <span style={{ color: '#f59e0b' }}>💎 {prisms} Prisms</span>
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          Assign slimes to ranches for passive benefits. Rewards accumulate (max 24h) and are applied when slimes are removed.
        </div>
      </div>

      {/* Ranch Buildings - Horizontal Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {visibleRanches.map(([ranchId, ranch]) => {
          const building = ranchBuildings[ranchId];
          const isBuilt = !!building;
          const canBuild = canBuildRanch(ranchId);
          const assignedIds = getAssignedSlimeIds(ranchId);
          const capacity = isBuilt ? getRanchCapacity(ranchId) : ranch.capacity;
          const { progress, cycleTime } = formatProgress(ranchId);

          return (
            <div
              key={ranchId}
              style={{
                background: isBuilt ? `linear-gradient(135deg, ${ranch.color}15, ${ranch.color}08)` : 'rgba(0,0,0,0.3)',
                borderRadius: 12,
                padding: 15,
                border: `2px solid ${isBuilt ? ranch.color : canBuild ? '#22d3ee' : '#4b5563'}`,
              }}
            >
              {/* Ranch Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 32 }}>{ranch.icon}</span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{ranch.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{ranch.desc}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {isBuilt ? (
                    <>
                      <div style={{ fontSize: 12, color: ranch.color }}>Level {building.level}/{MAX_RANCH_LEVEL}</div>
                      <div style={{ fontSize: 10, opacity: 0.6 }}>{cycleTime.toFixed(0)}s cycle</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: canBuild ? '#22d3ee' : '#4b5563' }}>
                      Not Built
                    </div>
                  )}
                </div>
              </div>

              {/* Effect Info */}
              <div style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6, marginBottom: 12 }}>
                {ranch.effect === 'biomass' && <span>Effect: +{ranch.effectValue} biomass per cycle per slime</span>}
                {ranch.effect === 'element' && <span>Effect: {ELEMENTS[ranch.element]?.icon} +{ranch.effectValue}% {ELEMENTS[ranch.element]?.name} affinity per cycle</span>}
                {ranch.effect === 'stats' && <span>Effect: +{ranch.effectValue} random stat points per cycle</span>}
                {ranch.effect === 'trait' && ranch.grantsTrait === 'void' && <span>Effect: Grants Void trait (removes elements)</span>}
                {ranch.effect === 'trait' && ranch.traitPool && <span>Effect: {(ranch.effectValue * 100).toFixed(0)}% chance for rare trait per cycle</span>}
              </div>

              {/* Slot Visualization */}
              {isBuilt && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>Slots:</span>
                    <span style={{ fontSize: 12, color: '#4ade80' }}>{assignedIds.length}/{capacity}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* Render slots */}
                    {Array.from({ length: capacity }).map((_, idx) => {
                      const slimeId = assignedIds[idx];
                      const slime = slimeId ? slimes.find(s => s.id === slimeId) : null;

                      return (
                        <div
                          key={idx}
                          style={{
                            width: 70,
                            height: 90,
                            background: slime ? `${ranch.color}22` : 'rgba(0,0,0,0.3)',
                            borderRadius: 8,
                            border: `2px dashed ${slime ? ranch.color : '#4b5563'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: slime ? 'pointer' : 'default',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                          onClick={() => slime && removeFromRanch(slimeId, ranchId)}
                          title={slime ? `Click to collect ${slime.name}` : 'Empty slot'}
                        >
                          {slime ? (
                            <>
                              <div
                                style={{
                                  animation: 'slimeBounce 1s ease-in-out infinite',
                                  animationDelay: `${idx * 0.2}s`,
                                }}
                              >
                                <SlimeSprite tier={slime.tier} size={32} />
                              </div>
                              <div style={{ fontSize: 8, textAlign: 'center', marginTop: 4, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {slime.name}
                              </div>
                              <div style={{ fontSize: 8, color: '#4ade80', textAlign: 'center' }}>
                                {formatAccumulatedReward(ranchId, slimeId)}
                              </div>
                              {/* Time progress bar */}
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.4)' }}>
                                <div
                                  style={{
                                    width: `${getTimeProgress(slimeId, ranchId)}%`,
                                    height: '100%',
                                    background: getTimeProgress(slimeId, ranchId) >= 100 ? '#f59e0b' : ranch.color,
                                  }}
                                />
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 10, opacity: 0.4 }}>Empty</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cycle Progress Bar */}
              {isBuilt && assignedIds.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Cycle Progress</div>
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

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {!isBuilt ? (
                  <button
                    onClick={() => buildRanch(ranchId)}
                    disabled={!canBuild}
                    style={{
                      flex: 1,
                      padding: 10,
                      background: canBuild ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.3)',
                      border: `1px solid ${canBuild ? '#22d3ee' : '#4b5563'}`,
                      borderRadius: 6,
                      color: '#fff',
                      cursor: canBuild ? 'pointer' : 'not-allowed',
                      fontSize: 12,
                    }}
                  >
                    Build ({ranch.cost.biomass ? `${ranch.cost.biomass} bio` : ''}{ranch.cost.prisms ? `${ranch.cost.prisms} prisms` : ''}
                    {ranch.cost.mats && Object.entries(ranch.cost.mats).map(([m, c]) => ` ${c} ${m}`).join('')})
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedRanch(ranchId);
                        setShowAssignModal(true);
                      }}
                      disabled={assignedIds.length >= capacity}
                      style={{
                        flex: 1,
                        padding: 8,
                        background: assignedIds.length >= capacity ? 'rgba(0,0,0,0.3)' : 'rgba(34,211,238,0.2)',
                        border: `1px solid ${assignedIds.length >= capacity ? '#4b5563' : '#22d3ee'}`,
                        borderRadius: 6,
                        color: '#fff',
                        cursor: assignedIds.length >= capacity ? 'not-allowed' : 'pointer',
                        fontSize: 11,
                      }}
                    >
                      + Assign Slime
                    </button>
                    {building.level < MAX_RANCH_LEVEL && (
                      <button
                        onClick={() => upgradeRanch(ranchId)}
                        disabled={!canUpgradeRanch(ranchId)}
                        style={{
                          padding: 8,
                          background: canUpgradeRanch(ranchId) ? 'rgba(74,222,128,0.2)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${canUpgradeRanch(ranchId) ? '#4ade80' : '#4b5563'}`,
                          borderRadius: 6,
                          color: '#fff',
                          cursor: canUpgradeRanch(ranchId) ? 'pointer' : 'not-allowed',
                          fontSize: 11,
                        }}
                      >
                        Upgrade ({getUpgradeCost(ranchId)?.biomass || getUpgradeCost(ranchId)?.prisms})
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* No ranches unlocked message */}
      {visibleRanches.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>
          No ranches unlocked yet. Reach Queen Level 3 to unlock the Feeding Pool!
        </div>
      )}

      {/* Recent Events */}
      {ranchEvents.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>Recent Events</div>
          <div style={{ maxHeight: 120, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 10 }}>
            {ranchEvents.slice().reverse().map((event, i) => {
              const ranch = RANCH_TYPES[event.ranchId];
              const typeColor = event.type === 'bonus' ? '#4ade80' : event.type === 'penalty' ? '#ef4444' : event.type === 'trait' ? '#f59e0b' : '#9ca3af';
              return (
                <div key={i} style={{ fontSize: 11, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ opacity: 0.5, fontSize: 10 }}>{event.timestamp || ''}</span>
                  <span style={{ color: ranch?.color }}>{ranch?.icon}</span>
                  <span style={{ color: typeColor }}>{event.msg}</span>
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
            background: 'rgba(0,0,0,0.85)',
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
              border: `2px solid ${RANCH_TYPES[selectedRanch].color}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{RANCH_TYPES[selectedRanch].icon}</span>
              <span>Assign to {RANCH_TYPES[selectedRanch].name}</span>
            </div>

            {getAvailableSlimes().length === 0 ? (
              <div style={{ textAlign: 'center', opacity: 0.6, padding: 20 }}>
                No available slimes. Slimes on expeditions or already assigned cannot be selected.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {getAvailableSlimes().map(slime => {
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
                        gap: 12,
                        padding: 12,
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = tier.color}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                    >
                      <SlimeSprite tier={slime.tier} size={36} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: 13 }}>{slime.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>{tier.name}</div>
                        {slime.primaryElement && (
                          <div style={{ fontSize: 10, color: ELEMENTS[slime.primaryElement]?.color }}>
                            {ELEMENTS[slime.primaryElement]?.icon} {ELEMENTS[slime.primaryElement]?.name}
                          </div>
                        )}
                      </div>
                      {slime.traits?.includes('lazy') && (
                        <div style={{ fontSize: 9, color: '#4ade80', padding: '2px 6px', background: 'rgba(74,222,128,0.2)', borderRadius: 4 }}>
                          +10% ranch
                        </div>
                      )}
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

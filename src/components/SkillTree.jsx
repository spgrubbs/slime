import React, { useState, useMemo } from 'react';
import { SKILL_TREES, canPurchaseSkill, getSkillEffects, SKILL_POINTS_PER_LEVEL } from '../data/skillTreeData.js';

const SkillTree = ({ queenLevel, purchasedSkills, onPurchaseSkill, availablePoints }) => {
  const [activeTree, setActiveTree] = useState('expedition');
  const [hoveredSkill, setHoveredSkill] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);

  const trees = Object.entries(SKILL_TREES);
  const currentTree = SKILL_TREES[activeTree];
  const skills = Object.values(currentTree.skills);

  // Calculate spent points
  const spentPoints = useMemo(() => {
    let total = 0;
    Object.values(SKILL_TREES).forEach(tree => {
      Object.values(tree.skills).forEach(skill => {
        if (purchasedSkills.includes(skill.id)) {
          total += skill.cost;
        }
      });
    });
    return total;
  }, [purchasedSkills]);

  // Get skill effects summary
  const effects = useMemo(() => getSkillEffects(purchasedSkills), [purchasedSkills]);

  const handlePurchase = (skillId) => {
    if (canPurchaseSkill(skillId, activeTree, purchasedSkills, availablePoints)) {
      const skill = currentTree.skills[skillId];
      onPurchaseSkill(skillId, skill.cost);
      setSelectedSkill(null);
    }
  };

  // Calculate lines between skills
  const connections = useMemo(() => {
    const lines = [];
    skills.forEach(skill => {
      skill.requires.forEach(reqId => {
        const reqSkill = currentTree.skills[reqId];
        if (reqSkill) {
          const isPurchased = purchasedSkills.includes(skill.id);
          const reqPurchased = purchasedSkills.includes(reqId);
          lines.push({
            from: reqSkill.position,
            to: skill.position,
            active: reqPurchased,
            complete: isPurchased && reqPurchased,
          });
        }
      });
    });
    return lines;
  }, [skills, purchasedSkills, currentTree]);

  const getSkillState = (skill) => {
    if (purchasedSkills.includes(skill.id)) return 'purchased';
    if (canPurchaseSkill(skill.id, activeTree, purchasedSkills, availablePoints)) return 'available';
    if (skill.requires.every(r => purchasedSkills.includes(r))) return 'locked-points';
    return 'locked';
  };

  const stateColors = {
    purchased: currentTree.color,
    available: '#4ade80',
    'locked-points': '#f59e0b',
    locked: '#374151',
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 15 }}>
      {/* Header with points */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>🌳 Queen Skill Tree</h3>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            Level {queenLevel} • Unlock powerful abilities
          </div>
        </div>
        <div style={{
          background: 'rgba(236,72,153,0.2)',
          padding: '8px 16px',
          borderRadius: 8,
          border: '2px solid #ec4899'
        }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ec4899' }}>
            ✨ {availablePoints}
          </div>
          <div style={{ fontSize: 10, opacity: 0.7 }}>Skill Points</div>
        </div>
      </div>

      {/* Tree tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
        {trees.map(([id, tree]) => {
          const treeSkills = Object.values(tree.skills);
          const purchased = treeSkills.filter(s => purchasedSkills.includes(s.id)).length;
          const isActive = activeTree === id;
          return (
            <button
              key={id}
              onClick={() => { setActiveTree(id); setSelectedSkill(null); }}
              style={{
                flex: 1,
                padding: '12px 8px',
                background: isActive ? `${tree.color}22` : 'rgba(0,0,0,0.3)',
                border: `2px solid ${isActive ? tree.color : 'transparent'}`,
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 20 }}>{tree.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>{tree.name}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{purchased}/{treeSkills.length}</div>
            </button>
          );
        })}
      </div>

      {/* Tree description */}
      <div style={{
        background: `${currentTree.color}11`,
        padding: '8px 12px',
        borderRadius: 6,
        marginBottom: 15,
        borderLeft: `3px solid ${currentTree.color}`,
        fontSize: 12,
        opacity: 0.8
      }}>
        {currentTree.description}
      </div>

      {/* Skill tree visualization */}
      <div style={{
        position: 'relative',
        height: 450,
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {/* SVG for connection lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {connections.map((line, i) => (
            <line
              key={i}
              x1={`${line.from.x}%`}
              y1={`${line.from.y}%`}
              x2={`${line.to.x}%`}
              y2={`${line.to.y}%`}
              stroke={line.complete ? currentTree.color : line.active ? '#4ade80' : '#374151'}
              strokeWidth={line.complete ? 3 : 2}
              strokeDasharray={line.active ? 'none' : '5,5'}
              opacity={line.complete ? 1 : 0.5}
            />
          ))}
        </svg>

        {/* Skill nodes */}
        {skills.map(skill => {
          const state = getSkillState(skill);
          const isHovered = hoveredSkill === skill.id;
          const isSelected = selectedSkill === skill.id;

          return (
            <div
              key={skill.id}
              onClick={() => setSelectedSkill(isSelected ? null : skill.id)}
              onMouseEnter={() => setHoveredSkill(skill.id)}
              onMouseLeave={() => setHoveredSkill(null)}
              style={{
                position: 'absolute',
                left: `${skill.position.x}%`,
                top: `${skill.position.y}%`,
                transform: 'translate(-50%, -50%)',
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: state === 'purchased'
                  ? `linear-gradient(135deg, ${currentTree.color}, ${currentTree.color}88)`
                  : 'rgba(0,0,0,0.6)',
                border: `3px solid ${stateColors[state]}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: state === 'locked' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: isHovered || isSelected
                  ? `0 0 15px ${stateColors[state]}88`
                  : state === 'purchased'
                    ? `0 0 10px ${currentTree.color}44`
                    : 'none',
                zIndex: isHovered || isSelected ? 10 : 1,
              }}
            >
              <span style={{
                fontSize: 22,
                filter: state === 'locked' ? 'grayscale(1) opacity(0.5)' : 'none'
              }}>
                {skill.icon}
              </span>
              {skill.cost > 0 && state !== 'purchased' && (
                <div style={{
                  position: 'absolute',
                  bottom: -8,
                  right: -8,
                  background: state === 'available' ? '#4ade80' : '#374151',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: 10,
                  border: '2px solid rgba(0,0,0,0.5)',
                }}>
                  {skill.cost}
                </div>
              )}
              {state === 'purchased' && (
                <div style={{
                  position: 'absolute',
                  bottom: -6,
                  right: -6,
                  background: '#4ade80',
                  color: '#fff',
                  fontSize: 10,
                  padding: '1px 4px',
                  borderRadius: 8,
                }}>
                  ✓
                </div>
              )}
            </div>
          );
        })}

        {/* Hover tooltip */}
        {hoveredSkill && !selectedSkill && (
          <SkillTooltip
            skill={currentTree.skills[hoveredSkill]}
            state={getSkillState(currentTree.skills[hoveredSkill])}
            treeColor={currentTree.color}
          />
        )}
      </div>

      {/* Selected skill detail panel */}
      {selectedSkill && (
        <SkillDetailPanel
          skill={currentTree.skills[selectedSkill]}
          state={getSkillState(currentTree.skills[selectedSkill])}
          treeColor={currentTree.color}
          purchasedSkills={purchasedSkills}
          allSkills={currentTree.skills}
          onPurchase={() => handlePurchase(selectedSkill)}
          onClose={() => setSelectedSkill(null)}
        />
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        marginTop: 15,
        fontSize: 11,
        opacity: 0.7
      }}>
        <span><span style={{ color: currentTree.color }}>●</span> Purchased</span>
        <span><span style={{ color: '#4ade80' }}>●</span> Available</span>
        <span><span style={{ color: '#f59e0b' }}>●</span> Need Points</span>
        <span><span style={{ color: '#374151' }}>●</span> Locked</span>
      </div>

      {/* Active bonuses summary */}
      {purchasedSkills.length > 0 && (
        <div style={{
          marginTop: 15,
          padding: 12,
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 8
        }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.7 }}>
            Active Bonuses
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(effects.bonuses).map(([stat, value]) => (
              <span key={stat} style={{
                background: 'rgba(74,222,128,0.2)',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                color: '#4ade80'
              }}>
                {stat}: {value > 0 ? '+' : ''}{value}%
              </span>
            ))}
            {effects.pheromones.map(ability => (
              <span key={ability} style={{
                background: 'rgba(168,85,247,0.2)',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                color: '#a855f7'
              }}>
                🧪 {ability}
              </span>
            ))}
            {effects.passives.map(passive => (
              <span key={passive} style={{
                background: 'rgba(34,211,238,0.2)',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                color: '#22d3ee'
              }}>
                ⚡ {passive}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Tooltip component for hovering
const SkillTooltip = ({ skill, state, treeColor }) => (
  <div style={{
    position: 'absolute',
    left: '50%',
    bottom: 10,
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.95)',
    border: `2px solid ${treeColor}`,
    borderRadius: 8,
    padding: 12,
    maxWidth: 250,
    zIndex: 100,
    pointerEvents: 'none',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 20 }}>{skill.icon}</span>
      <span style={{ fontWeight: 'bold' }}>{skill.name}</span>
    </div>
    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{skill.desc}</div>
    {skill.cost > 0 && state !== 'purchased' && (
      <div style={{ fontSize: 11, color: '#f59e0b' }}>Cost: {skill.cost} points</div>
    )}
  </div>
);

// Detail panel for selected skill
const SkillDetailPanel = ({ skill, state, treeColor, purchasedSkills, allSkills, onPurchase, onClose }) => {
  const prereqs = skill.requires.map(id => allSkills[id]).filter(Boolean);
  const missingPrereqs = prereqs.filter(p => !purchasedSkills.includes(p.id));

  return (
    <div style={{
      marginTop: 15,
      background: 'rgba(0,0,0,0.4)',
      border: `2px solid ${treeColor}`,
      borderRadius: 10,
      padding: 15,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: state === 'purchased' ? treeColor : 'rgba(0,0,0,0.5)',
            border: `3px solid ${treeColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            {skill.icon}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>{skill.name}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{skill.desc}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 4,
            padding: '4px 8px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* Effect details */}
      <div style={{
        marginTop: 12,
        padding: 10,
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 6
      }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Effect:</div>
        <div style={{ fontSize: 13, color: '#4ade80' }}>
          {skill.effect.type === 'bonus' && `${skill.effect.stat}: ${skill.effect.value > 0 ? '+' : ''}${skill.effect.value}%`}
          {skill.effect.type === 'unlock' && `Unlocks: ${skill.effect.zone || skill.effect.building || skill.effect.feature}`}
          {skill.effect.type === 'pheromone' && `Unlocks mana ability: ${skill.effect.ability}`}
          {skill.effect.type === 'passive' && skill.effect.desc}
        </div>
      </div>

      {/* Prerequisites */}
      {prereqs.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Requires:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {prereqs.map(p => (
              <span key={p.id} style={{
                background: purchasedSkills.includes(p.id) ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)',
                color: purchasedSkills.includes(p.id) ? '#4ade80' : '#ef4444',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
              }}>
                {p.icon} {p.name} {purchasedSkills.includes(p.id) ? '✓' : '✗'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Purchase button */}
      {state !== 'purchased' && (
        <button
          onClick={onPurchase}
          disabled={state !== 'available'}
          style={{
            width: '100%',
            marginTop: 15,
            padding: 12,
            background: state === 'available'
              ? `linear-gradient(135deg, ${treeColor}, ${treeColor}88)`
              : 'rgba(100,100,100,0.5)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 'bold',
            cursor: state === 'available' ? 'pointer' : 'not-allowed',
            fontSize: 14,
          }}
        >
          {state === 'available' && `✨ Purchase (${skill.cost} points)`}
          {state === 'locked-points' && `Need ${skill.cost} points`}
          {state === 'locked' && missingPrereqs.length > 0 && `Requires: ${missingPrereqs.map(p => p.name).join(', ')}`}
        </button>
      )}

      {state === 'purchased' && (
        <div style={{
          marginTop: 15,
          padding: 12,
          background: 'rgba(74,222,128,0.2)',
          borderRadius: 8,
          textAlign: 'center',
          color: '#4ade80',
          fontWeight: 'bold',
        }}>
          ✓ Skill Purchased
        </div>
      )}
    </div>
  );
};

export default SkillTree;

import React, { useState, useEffect } from 'react';
import { SLIME_TIERS } from '../data/slimeData.js';
import { STATUS_EFFECTS, MUTATION_LIBRARY } from '../data/traitData.js';
import { ELEMENTS } from '../data/gameConstants.js';
import { SLIME_SPRITES, ELEMENT_SPRITES, ANIMATION_CONFIG } from '../data/spriteConfig.js';

// Helper to normalize sprite imports (handles both CommonJS and ES module formats)
const getSpriteSrc = (sprite) => {
  if (!sprite) return null;
  // Handle ES module default export: { default: "path" }
  if (typeof sprite === 'object' && sprite.default) {
    return sprite.default;
  }
  // Handle direct string path
  return sprite;
};

// Use centralized config
const SPRITE_SHEETS = SLIME_SPRITES;
const FRAME_DURATION = ANIMATION_CONFIG.frameDuration;
const FRAME_COUNT = ANIMATION_CONFIG.frameCount;
const SPRITE_SIZE = ANIMATION_CONFIG.spriteSize;

// Note: 'mutations' prop displays mutation icons below the slime
const SlimeSprite = ({
  tier,
  size = 40,
  isQueen,
  hp,
  maxHp,
  traits = [],
  mutations = [],
  anim = 'idle',
  status = [],
  primaryElement = null
}) => {
  const [frame, setFrame] = useState(0);
  const tierData = SLIME_TIERS[tier];
  const color = isQueen ? '#ec4899' : (tierData?.color || '#4ade80');
  const hpPct = hp !== undefined && maxHp ? (hp / maxHp) * 100 : 100;

  // Get sprite sheet for this tier and animation
  const rawSpriteSheet = SPRITE_SHEETS[tier]?.[anim] || SPRITE_SHEETS[tier]?.idle;
  const spriteSheet = getSpriteSrc(rawSpriteSheet);
  const useSprite = !!spriteSheet;

  // Animate through frames for sprite sheet
  useEffect(() => {
    if (!useSprite) return;

    const interval = setInterval(() => {
      setFrame(f => (f + 1) % FRAME_COUNT);
    }, FRAME_DURATION);

    return () => clearInterval(interval);
  }, [useSprite, anim]);

  // CSS-based transform for non-sprite rendering
  const cssTransform = anim === 'attack' ? 'translateX(15px) scale(1.1)' :
                       anim === 'hurt' ? 'translateX(-5px) scale(0.9)' : 'scale(1)';

  // Calculate scale for sprite rendering
  const scale = size / SPRITE_SIZE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* HP Bar */}
      {hp !== undefined && maxHp && (
        <div style={{
          width: size,
          height: 5,
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 2,
          marginBottom: 3,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${hpPct}%`,
            height: '100%',
            background: hpPct > 50 ? '#4ade80' : hpPct > 25 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.3s'
          }} />
        </div>
      )}

      {/* Slime Body - Sprite or CSS */}
      {useSprite ? (
        // Sprite sheet rendering
        <div style={{
          width: size,
          height: size,
          backgroundImage: `url(${spriteSheet})`,
          backgroundPosition: `-${frame * SPRITE_SIZE * scale}px 0`,
          backgroundSize: `${SPRITE_SIZE * FRAME_COUNT * scale}px ${SPRITE_SIZE * scale}px`,
          imageRendering: 'pixelated',
          position: 'relative',
        }}>
          {/* Queen crown overlay */}
          {isQueen && (
            <div style={{
              position: 'absolute',
              top: -size * 0.3,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: size * 0.4
            }}>
              👑
            </div>
          )}
          {/* Element badge */}
          {primaryElement && ELEMENTS[primaryElement] && (
            <ElementBadge element={primaryElement} size={size} />
          )}
        </div>
      ) : (
        // CSS-based rendering (fallback)
        <div style={{
          width: size,
          height: size * 0.7,
          backgroundColor: color,
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          position: 'relative',
          boxShadow: `0 ${size*0.1}px ${size*0.2}px rgba(0,0,0,0.3), inset 0 ${size*0.1}px ${size*0.2}px rgba(255,255,255,0.3)`,
          transform: cssTransform,
          transition: 'transform 0.15s',
          filter: anim === 'hurt' ? 'brightness(1.5)' : 'none',
        }}>
          {/* Eyes */}
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '20%',
            width: size * 0.15,
            height: size * 0.15,
            backgroundColor: 'white',
            borderRadius: '50%'
          }}>
            <div style={{
              position: 'absolute',
              top: '30%',
              left: '30%',
              width: '50%',
              height: '50%',
              backgroundColor: '#333',
              borderRadius: '50%'
            }}/>
          </div>
          <div style={{
            position: 'absolute',
            top: '25%',
            right: '20%',
            width: size * 0.15,
            height: size * 0.15,
            backgroundColor: 'white',
            borderRadius: '50%'
          }}>
            <div style={{
              position: 'absolute',
              top: '30%',
              left: '30%',
              width: '50%',
              height: '50%',
              backgroundColor: '#333',
              borderRadius: '50%'
            }}/>
          </div>
          {/* Queen crown */}
          {isQueen && (
            <div style={{
              position: 'absolute',
              top: -size * 0.3,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: size * 0.4
            }}>
              👑
            </div>
          )}
          {/* Element badge */}
          {primaryElement && ELEMENTS[primaryElement] && (
            <ElementBadge element={primaryElement} size={size} />
          )}
        </div>
      )}

      {/* Status effects */}
      {status?.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
          {status.map((s, i) => (
            <span key={i} style={{ fontSize: size * 0.3 }}>
              {STATUS_EFFECTS[s.type]?.icon}
            </span>
          ))}
        </div>
      )}

      {/* Mutations/Traits icons */}
      {(mutations?.length > 0 || traits?.length > 0) && (
        <div style={{ display: 'flex', gap: 1, marginTop: 2 }}>
          {mutations.slice(0, 4).map((m, i) => (
            <span key={`m-${i}`} style={{ fontSize: size * 0.25 }}>
              {MUTATION_LIBRARY[m]?.icon}
            </span>
          ))}
          {!mutations?.length && traits?.slice(0, 4).map((t, i) => (
            <span key={`t-${i}`} style={{ fontSize: size * 0.25 }}>
              {MUTATION_LIBRARY[t]?.icon}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Element badge component - supports both emoji and sprite icons
const ElementBadge = ({ element, size }) => {
  const elementData = ELEMENTS[element];
  if (!elementData) return null;

  // Check if element has a custom sprite in the config
  const spriteIcon = getSpriteSrc(ELEMENT_SPRITES[element]);
  const useSprite = !!spriteIcon;

  return (
    <div style={{
      position: 'absolute',
      bottom: -size * 0.15,
      right: -size * 0.15,
      width: size * 0.4,
      height: size * 0.4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `${elementData.color}33`,
      borderRadius: '50%',
      border: `2px solid ${elementData.color}`,
      boxShadow: `0 0 ${size * 0.1}px ${elementData.color}66`,
    }}>
      {useSprite ? (
        <img
          src={spriteIcon}
          alt={elementData.name}
          style={{
            width: size * 0.3,
            height: size * 0.3,
            imageRendering: 'pixelated',
          }}
        />
      ) : (
        <span style={{ fontSize: size * 0.35 }}>
          {elementData.icon}
        </span>
      )}
    </div>
  );
};

export default SlimeSprite;

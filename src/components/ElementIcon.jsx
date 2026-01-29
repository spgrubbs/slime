import React from 'react';
import { ELEMENTS } from '../data/gameConstants.js';
import { ELEMENT_SPRITES } from '../data/spriteConfig.js';

// Helper to normalize sprite imports (handles both CommonJS and ES module formats)
const getSpriteSrc = (sprite) => {
  if (!sprite) return null;
  if (typeof sprite === 'object' && sprite.default) {
    return sprite.default;
  }
  return sprite;
};

/**
 * Reusable element icon component
 * Displays either a custom 16x16 sprite or falls back to emoji
 *
 * @param {string} element - Element key (fire, water, nature, earth)
 * @param {number} size - Display size in pixels (default 16)
 * @param {boolean} showBorder - Whether to show colored border (default false)
 * @param {object} style - Additional inline styles
 */
const ElementIcon = ({ element, size = 16, showBorder = false, style = {} }) => {
  const elementData = ELEMENTS[element];
  if (!elementData) return null;

  const spriteIcon = getSpriteSrc(ELEMENT_SPRITES[element]);
  const useSprite = !!spriteIcon;

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    ...(showBorder && {
      background: `${elementData.color}33`,
      borderRadius: '50%',
      border: `2px solid ${elementData.color}`,
      padding: 2,
    }),
    ...style,
  };

  if (useSprite) {
    return (
      <span style={containerStyle}>
        <img
          src={spriteIcon}
          alt={elementData.name}
          style={{
            width: showBorder ? size - 4 : size,
            height: showBorder ? size - 4 : size,
            imageRendering: 'pixelated',
          }}
        />
      </span>
    );
  }

  return (
    <span style={{ ...containerStyle, fontSize: size * 0.9 }}>
      {elementData.icon}
    </span>
  );
};

export default ElementIcon;

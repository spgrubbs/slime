// Sprite Configuration
// This file centralizes all custom sprite asset paths
// Set paths to null to use emoji/CSS fallbacks

// =============================================================================
// ELEMENT ICONS (16x16 PNG sprites)
// =============================================================================
// Place your 16x16 element icons in: src/assets/sprites/elements/
// File naming convention: {element}.png (e.g., fire.png, water.png)
//
// To enable custom element icons, uncomment the require statements below:

export const ELEMENT_SPRITES = {
  fire: null,    // require('../assets/sprites/elements/fire.png'),
  water: null,   // require('../assets/sprites/elements/water.png'),
  nature: null,  // require('../assets/sprites/elements/nature.png'),
  earth: null,   // require('../assets/sprites/elements/earth.png'),
};

// =============================================================================
// SLIME SPRITE SHEETS (256x32 PNG - 8 frames horizontal)
// =============================================================================
// Place sprite sheets in: src/assets/sprites/
// File naming convention: slime-{tier}-{animation}.png
// Each sheet should be 8 frames × 32px = 256px wide, 32px tall
//
// To enable custom slime sprites, uncomment the require statements below:

export const SLIME_SPRITES = {
  basic: {
    idle: null,   // require('../assets/sprites/slime-basic-idle.png'),
    attack: null, // require('../assets/sprites/slime-basic-attack.png'),
    hurt: null,   // require('../assets/sprites/slime-basic-hurt.png'),
  },
  enhanced: {
    idle: null,
    attack: null,
    hurt: null,
  },
  elite: {
    idle: null,
    attack: null,
    hurt: null,
  },
  royal: {
    idle: null,
    attack: null,
    hurt: null,
  },
};

// Animation settings
export const ANIMATION_CONFIG = {
  frameDuration: 100,  // ms per frame
  frameCount: 8,       // frames per animation
  spriteSize: 32,      // base size in pixels
};

// Element icon settings
export const ELEMENT_ICON_CONFIG = {
  size: 16,            // base size in pixels
};

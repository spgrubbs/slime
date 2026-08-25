// Sprite Configuration
// This file centralizes all custom sprite asset paths
// Set paths to null to use emoji/CSS fallbacks

import fireIcon from '../assets/sprites/elements/fire.png';
import waterIcon from '../assets/sprites/elements/water.png';
import natureIcon from '../assets/sprites/elements/nature.png';
import earthIcon from '../assets/sprites/elements/earth.png';
import basicIdle from '../assets/sprites/slime-basic-idle.png';

// =============================================================================
// ELEMENT ICONS (16x16 PNG sprites)
// =============================================================================
// Place your 16x16 element icons in: src/assets/sprites/elements/
// File naming convention: {element}.png (e.g., fire.png, water.png)
//
// To add a new element icon, import it above and reference it below.


export const ELEMENT_SPRITES = {
  fire: fireIcon,
  water: waterIcon,
  nature: natureIcon,
  earth: earthIcon,
};

// =============================================================================
// SLIME SPRITE SHEETS (256x32 PNG - 8 frames horizontal)
// =============================================================================
// Place sprite sheets in: src/assets/sprites/
// File naming convention: slime-{tier}-{animation}.png
// Each sheet should be 8 frames × 32px = 256px wide, 32px tall
//
// To enable a custom slime sprite, import the sheet above and slot it in below.


export const SLIME_SPRITES = {
  basic: {
    idle: basicIdle,
    attack: null, // import and slot in a slime-basic-attack.png sheet
    hurt: null,   // import and slot in a slime-basic-hurt.png sheet
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

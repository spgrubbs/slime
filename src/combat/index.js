// Combat module entry point.
//
// Importing this file registers every effect and validates the registry, so a
// mutation whose passive has no implementation fails loudly at startup instead
// of silently doing nothing in battle.

import './effects.js';
import { validateRegistry } from './validate.js';

validateRegistry();

export * from './hooks.js';
export * from './stats.js';
export * from './trace.js';
export * from './resolveRound.js';
export { validateRegistry } from './validate.js';

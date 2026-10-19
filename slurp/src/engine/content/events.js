// Events — text, 2–3 choices. Effects get (run, rng, api) and return the
// outcome text. `req(run)` gates a choice. All randomness comes from the
// event's own seeded stream, so reloading never rerolls an outcome.

export const EVENTS = {
  lonelySlime: {
    title: 'A Lonely Slime', icon: '🟩',
    text: 'A tiny, wobbling slime has been following you for three rooms. It makes a hopeful little "blep."',
    choices: [
      { label: 'Merge with it (+12 max Mass, heal 12)', effect: (run, rng, api) => { run.slime.maxMassBonus += 12; api.heal(run, 12); return 'You become one. Slightly bigger, slightly happier.'; } },
      { label: 'Eat it (+1 copy to a random slotted essence)', req: (run) => run.slime.slotted.length > 0,
        effect: (run, rng, api) => { const e = api.randomOwnedSlotted(run, rng); api.gainEssence(run, e.id, 1); return `It was delicious. ${api.name(e.id)} grows stronger. You feel a little bad.`; } },
      { label: 'Leave it be', effect: () => 'It blinks at you, then wanders off to find someone else.' },
    ],
  },
  mushroomRing: {
    title: 'Mushroom Ring', icon: '🍄',
    text: 'A perfect circle of glowing mushrooms. They smell like adventure and, faintly, like regret.',
    choices: [
      { label: 'Eat one (a random essence; risky)', effect: (run, rng, api) => {
        if (rng() < 0.25) { api.loseMass(run, Math.floor(api.maxMass(run) * 0.12)); return 'Your vision swims. You lose 12% Mass and learn nothing.'; }
        const id = api.randomEssence(rng, run);
        api.gainEssence(run, id, 1);
        return `Something new sprouts inside you: ${api.name(id)}.`;
      } },
      { label: 'Collect spores (+25 Gel)', effect: (run) => { run.gel += 25; return 'Shelly will pay good Gel for these.'; } },
    ],
  },
  shrineOfMitosis: {
    title: 'Shrine of Mitosis', icon: '🥚',
    text: 'An ancient pool that splits whatever touches it. The water hums.',
    choices: [
      { label: 'Split (−20% current Mass, +1 copy to your biggest essence)', req: (run) => run.slime.slotted.length > 0,
        effect: (run, rng, api) => {
          api.loseMass(run, Math.floor(run.slime.hp * 0.2));
          const e = [...run.slime.slotted].sort((a, b) => b.copies - a.copies)[0];
          api.gainEssence(run, e.id, 1);
          return `You split and re-merge. ${api.name(e.id)} doubles up.`;
        } },
      { label: 'Drink (heal 20%)', effect: (run, rng, api) => { api.heal(run, Math.floor(api.maxMass(run) * 0.2)); return 'Refreshing, in a cellular sort of way.'; } },
    ],
  },
  crabCaravan: {
    title: 'Crab Caravan', icon: '🦀',
    text: 'A procession of hermit crabs carrying shiny junk. One holds up a sign: "TRADES."',
    choices: [
      { label: 'Pay 60 Gel for a random relic', req: (run) => run.gel >= 60,
        effect: (run, rng, api) => { run.gel -= 60; const r = api.addRandomRelic(run, rng); return r ? `You swallow the ${r}. It rattles around inside you.` : 'They have nothing you do not already own.'; } },
      { label: 'Wave and move on', effect: () => 'The crabs click their claws politely.' },
    ],
  },
  professorOoze: {
    title: "Professor Ooze's Lab", icon: '🧑‍🔬',
    text: 'A bespectacled slime adjusts a bubbling flask. "Fascinating specimen! Hold still."',
    choices: [
      { label: 'Pay 150 Gel: raise a Level III essence to APEX', req: (run, api) => run.gel >= 150 && api.apexCandidates(run).length > 0,
        effect: (run, rng, api) => { run.gel -= 150; const e = api.apexCandidates(run)[0]; e.apex = true; return `${api.name(e.id)} reaches APEX. The Professor faints with joy.`; } },
      { label: 'Volunteer (+2 copies to one essence, −1 copy to another)', req: (run) => run.slime.slotted.length >= 2,
        effect: (run, rng, api) => {
          const a = api.randomOwnedSlotted(run, rng);
          const others = run.slime.slotted.filter(e => e !== a && e.copies > 1);
          api.gainEssence(run, a.id, 2);
          if (others.length) others[Math.floor(rng() * others.length)].copies -= 1;
          return `${api.name(a.id)} surges. Something else feels a little thinner.`;
        } },
      { label: 'Back away slowly', effect: () => '"Come back anytime! For science!"' },
    ],
  },
  saltCircle: {
    title: 'Salt Circle', icon: '🧂',
    text: 'Someone has poured a ring of salt across the only path forward. It burns just to look at.',
    choices: [
      { label: 'Push through (−15% max Mass of damage)', effect: (run, rng, api) => { api.loseMass(run, Math.floor(api.maxMass(run) * 0.15)); return 'It stings. A lot.'; } },
      { label: 'Pay a passing beetle 40 Gel to sweep it', req: (run) => run.gel >= 40, effect: (run) => { run.gel -= 40; return 'The beetle sweeps with great dignity.'; } },
    ],
  },
  abandonedCache: {
    title: 'Abandoned Cache', icon: '📦',
    text: 'A half-buried crate, the lid nailed shut. Something inside clinks.',
    choices: [
      { label: 'Pry it open (+45 Gel, may hurt)', effect: (run, rng, api) => {
        run.gel += 45;
        if (rng() < 0.3) { api.loseMass(run, 10); return '+45 Gel, and a splinter. −10 Mass.'; }
        return '+45 Gel. Clean.';
      } },
      { label: 'Leave it', effect: () => 'Probably a mimic anyway.' },
    ],
  },
  stickyPuddle: {
    title: 'Sticky Puddle', icon: '🍯',
    text: 'A warm, amber puddle. It is, unmistakably, a relative.',
    choices: [
      { label: 'Soak in it (heal 25%)', effect: (run, rng, api) => { api.heal(run, Math.floor(api.maxMass(run) * 0.25)); return 'Like a hug from the inside.'; } },
      { label: 'Absorb it (+2 VISC permanently)', effect: (run, rng, api) => { api.gainEssence(run, 'focusGland', 1); return 'You feel thicker. In a good way.'; } },
    ],
  },
};

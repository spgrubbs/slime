// ─────────────────────────────────────────────────────────────────────────────
// Calculation traces
//
// Every number combat produces carries a record of how it got there, so
// verbose mode can show the full derivation instead of just the result.
// This is the audit surface for balancing.
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (n) => Math.round(n * 100) / 100;

export function makeTrace(label, start = 0) {
  return {
    value: start,
    steps: [{ label, value: round2(start), kind: 'base' }],

    mul(stepLabel, factor) {
      if (factor === 1 || factor === undefined || factor === null) return this;
      this.value *= factor;
      this.steps.push({ label: stepLabel, op: `×${round2(factor)}`, value: round2(this.value), kind: 'mul' });
      return this;
    },

    add(stepLabel, amount) {
      if (!amount) return this;
      this.value += amount;
      this.steps.push({
        label: stepLabel,
        op: `${amount > 0 ? '+' : ''}${round2(amount)}`,
        value: round2(this.value),
        kind: 'add',
      });
      return this;
    },

    set(stepLabel, value) {
      this.value = value;
      this.steps.push({ label: stepLabel, op: '=', value: round2(value), kind: 'set' });
      return this;
    },

    /** A non-numeric annotation — a roll that fired, a flag that was set. */
    note(stepLabel) {
      this.steps.push({ label: stepLabel, kind: 'note' });
      return this;
    },

    /** A dice roll, shown whether or not it landed. */
    roll(stepLabel, rolled, threshold, hit) {
      this.steps.push({
        label: stepLabel,
        op: `${(rolled * 100).toFixed(1)}% vs ${(threshold * 100).toFixed(1)}%`,
        kind: hit ? 'roll-hit' : 'roll-miss',
      });
      return this;
    },

    floor() {
      this.value = Math.floor(this.value);
      return this;
    },

    render() {
      return this.steps
        .map(s => {
          if (s.kind === 'base') return `${s.label} ${s.value}`;
          if (s.kind === 'note') return s.label;
          if (s.kind === 'roll-hit')  return `${s.label} ✓ ${s.op}`;
          if (s.kind === 'roll-miss') return `${s.label} ✗ ${s.op}`;
          return `${s.op} ${s.label} → ${s.value}`;
        })
        .join('  ');
    },
  };
}

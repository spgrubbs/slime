import React from 'react';
import { MERCHANT, canTakeDeal } from '../data/merchantData.js';
import { MUTATION_LIBRARY, mutagenName } from '../data/traitData.js';
import { formatTime } from '../utils/helpers.js';

const itemLabel = (item) => {
  if (item.kind === 'mutagen') {
    const m = MUTATION_LIBRARY[item.id];
    return `${m?.icon || '🧬'} ${mutagenName(item.id)}`;
  }
  return item.id;
};

const have = (item, mats, mutagens) =>
  item.kind === 'mutagen' ? (mutagens[item.id] || 0) : (mats[item.id] || 0);

/**
 * Mossback's stall. Shown on the Nucleus screen once Trade Musk is learned:
 * the deals while the peddler is here, and when it will be back while it is not.
 */
export default function Merchant({ stall, merchant, mats = {}, mutagens = {}, onTake }) {
  if (!stall) return null;
  const now = Date.now();

  if (!stall.present || !merchant?.deals) {
    return (
      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 15, marginBottom: 15, opacity: 0.75 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold' }}>{MERCHANT.icon} {MERCHANT.name} is off down the road</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
          Back in {formatTime(Math.max(0, stall.nextAt - now) / 1000)}. The slime trail is still warm.
        </div>
      </div>
    );
  }

  const taken = new Set(merchant.taken || []);
  const open = merchant.deals.filter(d => !taken.has(d.id));

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(132,204,22,0.14), rgba(132,204,22,0.04))', border: '1px solid rgba(132,204,22,0.4)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 'bold' }}>{MERCHANT.icon} {MERCHANT.name}'s stall</div>
        <div style={{ fontSize: 11, opacity: 0.65 }}>leaves in {formatTime(Math.max(0, stall.leavesAt - now) / 1000)}</div>
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
        An old snail with a shop on its back. It swaps things for things and always keeps a little for itself.
      </div>

      {open.length === 0 && (
        <div style={{ fontSize: 12, opacity: 0.6, fontStyle: 'italic' }}>
          "Cleaned me out. Come back when I do."
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {open.map(deal => {
          const ok = canTakeDeal(deal, { mats, mutagens });
          const owned = have(deal.give, mats, mutagens);
          return (
            <div key={deal.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                <span style={{ color: ok ? '#fca5a5' : '#ef4444' }}>
                  {deal.give.qty}× {itemLabel(deal.give)}
                  <span style={{ opacity: 0.6 }}> (have {owned})</span>
                </span>
                <span style={{ opacity: 0.5 }}>→</span>
                <span style={{ color: '#86efac', fontWeight: 'bold' }}>{deal.get.qty}× {itemLabel(deal.get)}</span>
                <button
                  onClick={() => onTake(deal.id)}
                  disabled={!ok}
                  style={{
                    marginLeft: 'auto', padding: '6px 14px', borderRadius: 6, border: 'none', fontWeight: 'bold', fontSize: 11,
                    background: ok ? '#84cc16' : 'rgba(100,100,100,0.5)', color: '#1a1a2e',
                    cursor: ok ? 'pointer' : 'not-allowed',
                  }}
                >
                  Swap
                </button>
              </div>
              <div style={{ fontSize: 10, opacity: 0.55, fontStyle: 'italic', marginTop: 4 }}>"{deal.pitch}"</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

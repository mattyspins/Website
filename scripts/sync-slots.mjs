/**
 * sync-slots.mjs
 * Fetches all slots from slot.report and merges them with the existing
 * slotGames.ts, preserving manually curated image URLs for known slots.
 *
 * Run: node scripts/sync-slots.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLOT_GAMES_PATH = join(__dirname, '../frontend/lib/slotGames.ts');

// ─── Volatility mapping ───────────────────────────────────────────────────────
const VOL_MAP = {
  'low':         'Low',
  'medium-low':  'Low',
  'medium':      'Medium',
  'medium-high': 'High',
  'high':        'High',
  'very-high':   'Very High',
  'very high':   'Very High',
  'extreme':     'Very High',
};

function mapVol(v) {
  if (!v) return 'High';
  return VOL_MAP[v.toLowerCase()] ?? 'High';
}

// ─── Parse existing slotGames.ts to extract image expressions ─────────────────
function parseExistingImages(src) {
  const map = new Map(); // name.toLowerCase() → raw image expression (as it appears in TS)
  // Matches both PP("code") and "https://..." image values
  const re = /\{\s*name:\s*"([^"]+)",\s*provider:\s*"[^"]*",\s*image:\s*(PP\("[^"]*"\)|"[^"]*"),/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    map.set(m[1].toLowerCase(), m[2]);
  }
  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📡 Fetching slots from slot.report…');
  const res = await fetch('https://slot.report/api/v1/slots.json');
  if (!res.ok) throw new Error(`slot.report returned ${res.status}`);
  const body = await res.json();
  const apiSlots = body.results ?? body;
  console.log(`✅ Got ${apiSlots.length} slots`);

  // Build merged list — all images from casinoreviews.net CDN via slug
  const seen = new Set();
  const merged = [];

  for (const slot of apiSlots) {
    const key = slot.name.toLowerCase();
    if (seen.has(key)) continue; // skip dupes within slot.report
    seen.add(key);

    const vol = mapVol(slot.volatility);
    const url = `https://cdn.casinoreviews.net/slot-images/${slot.slug}.jpg`;

    merged.push({
      name: slot.name,
      provider: slot.provider,
      imageExpr: `"${url}"`,
      volatility: vol,
    });
  }

  // Sort: provider A→Z, then name A→Z
  merged.sort((a, b) => {
    const p = a.provider.localeCompare(b.provider);
    return p !== 0 ? p : a.name.localeCompare(b.name);
  });

  // ─── Generate TypeScript ──────────────────────────────────────────────────
  const lines = [];
  lines.push('export type Volatility = "Low" | "Medium" | "High" | "Very High";');
  lines.push('');
  lines.push('export interface SlotGame {');
  lines.push('  name: string;');
  lines.push('  provider: string;');
  lines.push('  image: string;');
  lines.push('  volatility: Volatility;');
  lines.push('}');
  lines.push('');
  lines.push('export const SLOT_GAMES: SlotGame[] = [');

  let currentProvider = '';
  for (const slot of merged) {
    if (slot.provider !== currentProvider) {
      if (currentProvider !== '') lines.push('');
      const pad = '─'.repeat(Math.max(2, 66 - slot.provider.length));
      lines.push(`  // ─── ${slot.provider} ${pad}`);
      currentProvider = slot.provider;
    }
    const name = JSON.stringify(slot.name);
    const prov = JSON.stringify(slot.provider);
    lines.push(`  { name: ${name}, provider: ${prov}, image: ${slot.imageExpr}, volatility: "${slot.volatility}" },`);
  }

  lines.push('];');
  lines.push('');
  lines.push('export function searchSlots(query: string): SlotGame[] {');
  lines.push('  if (!query.trim()) return SLOT_GAMES;');
  lines.push('  const q = query.toLowerCase();');
  lines.push('  return SLOT_GAMES.filter(');
  lines.push('    (s) =>');
  lines.push('      s.name.toLowerCase().includes(q) ||');
  lines.push('      s.provider.toLowerCase().includes(q)');
  lines.push('  );');
  lines.push('}');
  lines.push('');
  lines.push('export function findSlot(name: string): SlotGame | undefined {');
  lines.push('  return SLOT_GAMES.find((s) => s.name.toLowerCase() === name.toLowerCase());');
  lines.push('}');
  lines.push('');

  writeFileSync(SLOT_GAMES_PATH, lines.join('\n'), 'utf-8');

  console.log('');
  console.log('✅ slotGames.ts updated!');
  console.log(`   Total slots : ${merged.length}`);
  console.log(`   All images  : casinoreviews.net CDN via slug`);
}

main().catch((err) => { console.error('❌', err); process.exit(1); });

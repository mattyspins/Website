/**
 * sync-slots.mjs
 * Fetches all slots from slot.report and generates slotGames.ts.
 * For Pragmatic Play games that lack a slot.report image, falls back to
 * scraping slotcatalog.com to find a working image URL.
 *
 * Run: node scripts/sync-slots.mjs
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SLOT_GAMES_PATH = join(__dirname, '../frontend/lib/slotGames.ts');

const CONCURRENT_HEAD  = 20;  // parallel HEAD checks against slot.report
const CONCURRENT_SCRAPE = 5;  // parallel slotcatalog page scrapes
const SCRAPE_DELAY_MS   = 150; // ms between scrape batches

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

// ─── Check if slot.report has an image for this slug ─────────────────────────
async function hasSlotReportImage(slug) {
  try {
    const r = await fetch(`https://slot.report/images/slots/${slug}-start.webp`, { method: 'HEAD' });
    return r.status === 200;
  } catch {
    return false;
  }
}

// ─── Convert game name to slotcatalog slug ────────────────────────────────────
function toSlotcatalogSlug(name) {
  return name.replace(/[™®©]/g, '').trim().replace(/\s+/g, '-');
}

// ─── Scrape slotcatalog.com for an image URL ──────────────────────────────────
async function getSlotcatalogImage(name) {
  const slug = toSlotcatalogSlug(name);
  try {
    const r = await fetch(`https://slotcatalog.com/en/slots/${slug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0' },
    });
    if (r.status !== 200) return null;
    const html = await r.text();
    const m = html.match(/userfiles\/image\/games\/[^"'\s]+_s\.jpg/);
    return m ? `https://slotcatalog.com/${m[0]}` : null;
  } catch {
    return null;
  }
}

// ─── Run tasks in batches ─────────────────────────────────────────────────────
async function runBatched(items, concurrency, fn, delayMs = 0) {
  const results = new Array(items.length);
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((item, j) => fn(item, i + j)));
    batchResults.forEach((r, j) => { results[i + j] = r; });
    if (delayMs > 0 && i + concurrency < items.length) {
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📡 Fetching slots from slot.report…');
  const res = await fetch('https://slot.report/api/v1/slots.json');
  if (!res.ok) throw new Error(`slot.report returned ${res.status}`);
  const body = await res.json();
  const apiSlots = body.results ?? body;
  console.log(`✅ Got ${apiSlots.length} slots`);

  // Deduplicate and build initial list
  const seen = new Set();
  const merged = [];

  for (const slot of apiSlots) {
    const key = slot.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      name: slot.name,
      provider: slot.provider,
      slug: slot.slug,
      volatility: mapVol(slot.volatility),
      imageExpr: `"https://slot.report/images/slots/${slot.slug}-start.webp"`,
    });
  }

  // ─── Pragmatic Play image enrichment ─────────────────────────────────────
  const ppSlots = merged.filter(s => s.provider === 'Pragmatic Play');
  console.log(`\n🔍 Checking slot.report images for ${ppSlots.length} Pragmatic Play slots…`);

  const headResults = await runBatched(ppSlots, CONCURRENT_HEAD, async (slot) => {
    return { slot, has: await hasSlotReportImage(slot.slug) };
  });

  const missing = headResults.filter(r => !r.has).map(r => r.slot);
  const found   = headResults.filter(r =>  r.has).length;
  console.log(`   slot.report: ${found} with images, ${missing.length} missing`);

  if (missing.length > 0) {
    console.log(`🌐 Scraping slotcatalog.com for ${missing.length} missing Pragmatic Play images…`);
    let scraped = 0;
    const scrapeResults = await runBatched(missing, CONCURRENT_SCRAPE, async (slot) => {
      const img = await getSlotcatalogImage(slot.name);
      if (img) scraped++;
      return { slot, img };
    }, SCRAPE_DELAY_MS);

    for (const { slot, img } of scrapeResults) {
      if (img) {
        slot.imageExpr = `"${img}"`;
      }
    }
    console.log(`   slotcatalog: ${scraped} images found`);
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

  const ppWithImages = merged.filter(s => s.provider === 'Pragmatic Play' && !s.imageExpr.includes('slot.report')).length;
  console.log('');
  console.log('✅ slotGames.ts updated!');
  console.log(`   Total slots         : ${merged.length}`);
  console.log(`   PP slots (total)    : ${ppSlots.length}`);
  console.log(`   PP from slotcatalog : ${ppWithImages}`);
}

main().catch((err) => { console.error('❌', err); process.exit(1); });

// One-off script used to generate the placeholder bag-of-beans art referenced
// by src/data/sample-beans.json (public/samples/beans/*.png). These are plain
// color-block "flat lay" illustrations, not real product photos — same
// approach as the Refreshers/Home Spotlight sample images — just enough for
// the Beans page to preview correctly before real Airtable data/photos are
// wired up.
//
// Half the set renders at 1:1 (a square flat-lay shot) and half at 4:3 (a
// landscape product shot), on purpose: the Beans page renders each card's
// image box at the photo's own aspect ratio (see content.config.ts /
// DrinkCard.astro's `flexibleAspect`), so the sample set needs to actually
// demonstrate both supported ratios rather than only ever showing one.
//
// Run with: node scripts/generate-beans-samples.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve('./public/samples/beans');

const bags = [
  { file: 'original-blend-beans.png', ratio: '1:1', bag: '#3b2a1d', label: '#c9a37a' },
  { file: 'midnight-dark-roast-beans.png', ratio: '4:3', bag: '#1c130d', label: '#8a6a4a' },
  { file: 'cinnamon-vanilla-beans.png', ratio: '1:1', bag: '#5a3a22', label: '#e8c79a' },
  { file: 'peppermint-mocha-beans.png', ratio: '4:3', bag: '#2c1a16', label: '#c9524f' },
  { file: 'decaf-house-blend-beans.png', ratio: '1:1', bag: '#4a3320', label: '#b98f63' },
  { file: 'single-origin-ethiopia-beans.png', ratio: '4:3', bag: '#402d1a', label: '#d9b47a' },
];

function dims(ratio) {
  return ratio === '1:1' ? { w: 1000, h: 1000 } : { w: 1000, h: 750 };
}

await fs.mkdir(OUT_DIR, { recursive: true });

for (const b of bags) {
  const { w, h } = dims(b.ratio);
  // Simple flat-lay placeholder: a soft vignette background, a rounded "bag"
  // block, a fold line near the top, and a handful of bean-like dots — enough
  // silhouette to read as "bag of coffee beans" at a glance without claiming
  // to be a real product photo.
  const bagW = Math.round(w * 0.62);
  const bagH = Math.round(h * 0.72);
  const bagX = Math.round((w - bagW) / 2);
  const bagY = Math.round((h - bagH) / 2);
  const foldY = bagY + Math.round(bagH * 0.16);

  const beans = Array.from({ length: 14 })
    .map(() => {
      const cx = bagX + Math.round(Math.random() * bagW);
      const cy = foldY + Math.round(Math.random() * (bagY + bagH - foldY - 40)) + 20;
      const r = 9 + Math.round(Math.random() * 5);
      const rot = Math.round(Math.random() * 360);
      return `<g transform="translate(${cx} ${cy}) rotate(${rot})">
        <ellipse rx="${r}" ry="${r * 0.62}" fill="#140d08" opacity="0.55"/>
        <line x1="0" y1="${-r * 0.5}" x2="0" y2="${r * 0.5}" stroke="#3a2717" stroke-width="1.4"/>
      </g>`;
    })
    .join('');

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="50%" cy="42%" r="75%">
        <stop offset="0" stop-color="#20160f"/>
        <stop offset="1" stop-color="#0b0805"/>
      </radialGradient>
      <linearGradient id="bagg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${b.bag}"/>
        <stop offset="1" stop-color="#0e0a07"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect x="${bagX}" y="${bagY}" width="${bagW}" height="${bagH}" rx="${Math.round(bagW * 0.06)}" fill="url(#bagg)"/>
    <rect x="${bagX}" y="${foldY}" width="${bagW}" height="${Math.round(bagH * 0.05)}" fill="#000000" opacity="0.25"/>
    ${beans}
    <text x="${w / 2}" y="${bagY + bagH * 0.4}" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.round(bagW * 0.09)}" fill="${b.label}" opacity="0.9">LOVE POURED OUT</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, b.file));
  console.log(`wrote ${b.file} (${b.ratio}, ${w}x${h})`);
}

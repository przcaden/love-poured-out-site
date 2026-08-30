// One-off script used to generate the placeholder gradient banners referenced
// by src/data/sample-spotlight.json (public/samples/spotlight/*.png). These
// are plain color-block art, not real product photos, matching how the
// Refreshers sample images were generated — just enough for the homepage
// slideshow to preview correctly before real Airtable data is wired up.
//
// Run with: node scripts/generate-spotlight-samples.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve('./public/samples/spotlight');
const WIDTH = 1600;
const HEIGHT = 800;

const slides = [
  { file: 'fall-collection-launch.png', c1: '#3b2410', c2: '#c98a3b' },
  { file: 'refreshers-are-here.png', c1: '#0e141c', c2: '#6e90bc' },
  { file: 'peppermint-season.png', c1: '#0e2a24', c2: '#3fae8a' },
  { file: 'holiday-blend-beans.png', c1: '#1a0e14', c2: '#b53b5e' },
];

await fs.mkdir(OUT_DIR, { recursive: true });

for (const s of slides) {
  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${s.c1}"/>
        <stop offset="1" stop-color="${s.c2}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, s.file));
  console.log(`wrote ${s.file}`);
}

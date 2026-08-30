import { defineCollection, z } from 'astro:content';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// -----------------------------------------------------------------------------
// Each menu page reads its own Airtable TABLE from the same base. To add a new
// page later (beans, refreshers, syrups…):
//   1. create a table in Airtable with the same fields (see README),
//   2. add one line to the `collections` export at the bottom,
//   3. add a matching sample file in src/data/ and a page in src/pages/.
//
// Every table is pulled at BUILD TIME. Images are downloaded and cached locally
// because Airtable attachment URLs expire ~2 hours after they're issued — see
// cacheImage() below. With no credentials, each collection falls back to its
// sample JSON so the site always builds and previews.
// -----------------------------------------------------------------------------

const IMAGE_DIR = path.resolve('./public/menu-images');

// Cards and the popup never render an image wider than this, so anything larger
// is wasted bytes on the client. Owner-uploaded phone photos from Airtable are
// often 2–5 MB each; downscaling to this width and re-encoding as WebP brings a
// typical image down to ~100 KB (~95% smaller), which is the difference between
// the Coffees page loading instantly and appearing to hang over the network.
const IMAGE_MAX_WIDTH = 1000;

// Home Spotlight slides render full-bleed across the page's max width, not
// inside a small card, so they get a wider cap than the drink thumbnails above.
const SPOTLIGHT_IMAGE_MAX_WIDTH = 1600;

// Read an env var from either import.meta.env (local .env) or process.env (CI).
// Accepts several aliases and returns the first one that's set, so both the
// documented names (AIRTABLE_TOKEN / AIRTABLE_BASE) and the alternates
// (AIRTABLE_API_KEY / AIRTABLE_BASE_ID) work.
const env = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value =
      (import.meta.env as Record<string, string | undefined>)[key] ?? process.env[key];
    if (value) return value;
  }
  return undefined;
};

const TOKEN_KEYS = ['AIRTABLE_TOKEN', 'AIRTABLE_API_KEY'] as const;
const BASE_KEYS = ['AIRTABLE_BASE', 'AIRTABLE_BASE_ID'] as const;

const menuSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  price: z.string().default(''),
  roast: z.string().default(''),        // "Light" | "Medium" | "Dark" (free text ok)
  collection: z.string().default(''),   // e.g. "Flavor Reveal #2" — a series label
  releaseDate: z.string().default(''),  // free-text label, e.g. "Coming Fall 2026"
  order: z.number().default(0),
  available: z.boolean().default(true),
  seasonal: z.boolean().default(false),
  image: z.string().default(''),      // generic single image ("Photo" field), used by single-image pages
  hotImage: z.string().default(''),   // Coffees: "Hot Coffee Image" attachment
  icedImage: z.string().default(''),  // Coffees: "Iced Coffee Image" attachment
});

interface MenuEntry {
  id: string;
  name: string;
  description: string;
  price: string;
  roast: string;
  collection: string;
  releaseDate: string;
  order: number;
  available: boolean;
  seasonal: boolean;
  image: string;
  hotImage: string;
  icedImage: string;
}

// `key` is the filename stem. A record can have more than one attachment
// (Coffees have a hot AND an iced image), so callers pass a distinct key per
// image — e.g. `${rec.id}-hot` / `${rec.id}-ice` — to avoid overwriting.
async function cacheImage(
  photo: { url: string },
  key: string,
  maxWidth: number = IMAGE_MAX_WIDTH,
): Promise<string> {
  const filename = `${key}.webp`;
  const res = await fetch(photo.url); // URL is fresh — issued moments ago by this build
  if (!res.ok) throw new Error(`Image download failed for ${key}: ${res.status}`);
  // Downscale + re-encode so the browser isn't pulling multi-MB originals.
  // .rotate() with no args applies EXIF orientation, so phone photos that were
  // shot sideways don't render rotated. withoutEnlargement keeps small images
  // from being upscaled (and blurred).
  const optimized = await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(IMAGE_DIR, filename), optimized);
  return `/menu-images/${filename}`;
}

// Airtable attachment fields come back as an array; grab the first attachment.
const firstAttachment = (field: unknown): { url: string; type?: string } | null =>
  Array.isArray(field) && field[0]?.url ? field[0] : null;

// Generic single-image tables use either column name — "Photo" (the original
// name) or "Image" (used by Refreshers and on). Whichever is present wins.
const firstPhoto = (f: Record<string, any>) => firstAttachment(f.Photo) ?? firstAttachment(f.Image);

async function loadFromAirtable(table: string): Promise<MenuEntry[]> {
  const token = env(...TOKEN_KEYS)!;
  const base = env(...BASE_KEYS)!;
  // Records come back in the order of this view, so the owner can drag rows to
  // reorder. Name the ordering view the same in every table (default below).
  const view = env('AIRTABLE_VIEW') ?? 'Grid view';

  const records: Array<{ id: string; fields: Record<string, any> }> = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`);
    url.searchParams.set('view', view);
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Airtable request failed for "${table}": ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { records: typeof records; offset?: string };
    records.push(...json.records);
    offset = json.offset;
  } while (offset);

  const entries: MenuEntry[] = [];
  let position = 0;
  for (const rec of records) {
    const f = rec.fields;
    if (!f.Name) continue; // skip empty rows

    // Coffees table uses two attachment columns; other tables may use a single
    // "Photo" column. Cache whatever is present (with distinct filenames).
    const hotPhoto = firstAttachment(f['Hot Coffee Image']);
    const icedPhoto = firstAttachment(f['Iced Coffee Image']);
    const photo = firstPhoto(f);

    const hotImage = hotPhoto ? await cacheImage(hotPhoto, `${rec.id}-hot`) : '';
    const icedImage = icedPhoto ? await cacheImage(icedPhoto, `${rec.id}-ice`) : '';
    // Fall back to the hot image so the summary card always has a thumbnail.
    const image = photo ? await cacheImage(photo, rec.id) : hotImage;

    entries.push({
      id: rec.id,
      name: String(f.Name),
      description: f.Description ? String(f.Description) : '',
      price: f.Price != null ? String(f.Price) : '',
      // New columns. Use single-line TEXT fields in Airtable so the owner types
      // exactly what should appear: Roast = "Light"/"Medium"/"Dark",
      // Collection = a series name, "Release Date" = a label like "Coming Fall 2026"
      // (a plain-text field, NOT a Date field — a Date field would print an ISO string).
      roast: f.Roast ? String(f.Roast) : '',
      collection: f.Collection ? String(f.Collection) : '',
      releaseDate: f['Release Date'] ? String(f['Release Date']) : '',
      order: typeof f.Order === 'number' ? f.Order : position,
      available: f.Available !== false,
      seasonal: f.Seasonal === true,
      image,
      hotImage,
      icedImage,
    });
    position++;
  }
  return entries;
}

async function loadSample(file: string): Promise<MenuEntry[]> {
  const raw = await fs.readFile(path.resolve(`./src/data/${file}`), 'utf-8');
  return JSON.parse(raw) as MenuEntry[];
}

// Build a collection bound to one Airtable table, with a sample-data fallback.
function menuCollection(table: string, sampleFile: string) {
  return defineCollection({
    loader: async () => {
      if (env(...TOKEN_KEYS) && env(...BASE_KEYS)) {
        return loadFromAirtable(table);
      }
      console.warn(`[${table}] No Airtable credentials — using sample data (src/data/${sampleFile}).`);
      return loadSample(sampleFile);
    },
    schema: menuSchema,
  });
}

// -----------------------------------------------------------------------------
// Home Spotlight — the homepage slideshow. Its own table/schema/loader because
// its fields (a caption + optional link, no price/roast/etc.) don't match the
// drink-menu tables above. Same build-time-fetch-and-cache pattern otherwise.
// -----------------------------------------------------------------------------

const spotlightSchema = z.object({
  name: z.string(),
  image: z.string().default(''),
  caption: z.string().default(''),   // short text shown on the slide
  tag: z.string().default(''),       // small badge, free text: "New", "Seasonal"…
  link: z.string().default(''),      // internal path or full URL; blank = not clickable
  order: z.number().default(0),
  available: z.boolean().default(true),
});

interface SpotlightEntry {
  id: string;
  name: string;
  image: string;
  caption: string;
  tag: string;
  link: string;
  order: number;
  available: boolean;
}

async function loadSpotlightFromAirtable(table: string): Promise<SpotlightEntry[]> {
  const token = env(...TOKEN_KEYS)!;
  const base = env(...BASE_KEYS)!;
  const view = env('AIRTABLE_VIEW') ?? 'Grid view';

  const records: Array<{ id: string; fields: Record<string, any> }> = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`);
    url.searchParams.set('view', view);
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Airtable request failed for "${table}": ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { records: typeof records; offset?: string };
    records.push(...json.records);
    offset = json.offset;
  } while (offset);

  const entries: SpotlightEntry[] = [];
  let position = 0;
  for (const rec of records) {
    const f = rec.fields;
    if (!f.Name) continue; // skip empty rows

    const photo = firstAttachment(f.Image);
    const image = photo ? await cacheImage(photo, `spotlight-${rec.id}`, SPOTLIGHT_IMAGE_MAX_WIDTH) : '';

    entries.push({
      id: rec.id,
      name: String(f.Name),
      image,
      caption: f.Caption ? String(f.Caption) : '',
      tag: f.Tag ? String(f.Tag) : '',
      link: f.Link ? String(f.Link) : '',
      order: typeof f.Order === 'number' ? f.Order : position,
      available: f.Available !== false,
    });
    position++;
  }
  return entries;
}

function spotlightCollection(table: string, sampleFile: string) {
  return defineCollection({
    loader: async () => {
      if (env(...TOKEN_KEYS) && env(...BASE_KEYS)) {
        return loadSpotlightFromAirtable(table);
      }
      console.warn(`[${table}] No Airtable credentials — using sample data (src/data/${sampleFile}).`);
      return loadSample(sampleFile);
    },
    schema: spotlightSchema,
  });
}

// One collection per page. The string is the exact Airtable table name.
export const collections = {
  coffee: menuCollection('Coffees', 'sample-coffee.json'),
  refreshers: menuCollection('Refreshers', 'sample-refreshers.json'),
  // beans:  menuCollection('Coffee Beans', 'sample-beans.json'),
  // syrups: menuCollection('House Syrups', 'sample-syrups.json'),
  spotlight: spotlightCollection('Home Spotlight', 'sample-spotlight.json'),
};

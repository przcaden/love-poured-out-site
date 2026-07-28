import { defineCollection, z } from 'astro:content';
import fs from 'node:fs/promises';
import path from 'node:path';

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

// Read an env var from either import.meta.env (local .env) or process.env (CI).
const env = (key: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[key] ?? process.env[key];

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
  image: z.string().default(''),
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
}

async function cacheImage(photo: { url: string; type?: string }, id: string): Promise<string> {
  const ext = (photo.type?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const filename = `${id}.${ext}`;
  const res = await fetch(photo.url); // URL is fresh — issued moments ago by this build
  if (!res.ok) throw new Error(`Image download failed for ${id}: ${res.status}`);
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(IMAGE_DIR, filename), Buffer.from(await res.arrayBuffer()));
  return `/menu-images/${filename}`;
}

async function loadFromAirtable(table: string): Promise<MenuEntry[]> {
  const token = env('AIRTABLE_TOKEN')!;
  const base = env('AIRTABLE_BASE')!;
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

    const photo = Array.isArray(f.Photo) ? f.Photo[0] : null;
    const image = photo?.url ? await cacheImage(photo, rec.id) : '';

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
      if (env('AIRTABLE_TOKEN') && env('AIRTABLE_BASE')) {
        return loadFromAirtable(table);
      }
      console.warn(`[${table}] No Airtable credentials — using sample data (src/data/${sampleFile}).`);
      return loadSample(sampleFile);
    },
    schema: menuSchema,
  });
}

// One collection per page. The string is the exact Airtable table name.
export const collections = {
  coffee: menuCollection('Coffees', 'sample-coffee.json'),
  // beans:      menuCollection('Coffee Beans', 'sample-beans.json'),
  // refreshers: menuCollection('Refreshers', 'sample-refreshers.json'),
  // syrups:     menuCollection('House Syrups', 'sample-syrups.json'),
};

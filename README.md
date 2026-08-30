# Love Poured Out — menu site

A static Astro site whose menu is managed entirely from **Airtable** — no code
required to add, remove, reorder, or re-price drinks. When the owner is done
editing, they press one **Publish** button and the site rebuilds itself.

The theme uses the Love Poured Out palette (powder blue on black) and the brand
logo, and ships with sample data so the preview looks like the finished site.
Brand text (name, tagline, verse, mission, contact) all lives in
`src/site.config.ts`.

## Structure

- **Home** (`/`) — brand landing page with navigation to each menu section.
- **Coffees** (`/coffee`) — the coffee-drinks menu, read from the `Coffees` table.
- **Coffee Beans** (`/beans`) — bagged beans/roasts, read from the `Beans` table.
- **Refreshers** (`/refreshers`) — lemonades and refreshers, read from the `Refreshers` table.
- **Syrups** (`/syrups`) — flavor syrups, read from the `Syrups` table.

Every planned section page now exists; see *Adding another page* below if you
add a new one later (an "Our Story" info page and a Contact page are still
plain content, not Airtable-driven, and aren't covered by this pattern).

---

## Quick start (local)

Requires **Node 18.17+**.

```bash
npm install
npm run dev      # preview at http://localhost:4321 using sample data
npm run build    # production build into ./dist
```

With no credentials set, the site builds from the sample files in `src/data/` so
you can see it immediately. Add Airtable credentials (below) to use real data.

## Change the cafe's name, hours, and contact

Everything cafe-specific lives in **`src/site.config.ts`** — name, tagline,
verse, mission, hours, address, email. Edit there; nothing else needs touching.

## The navigation header

The header links are also defined in `src/site.config.ts`, in the `nav` array.
Each item is either a live link or greyed out (not yet built):

```ts
{ label: 'Syrups', href: null },    // greyed out, no link
{ label: 'Syrups', href: '/syrups' } // live link once the page exists
```

To turn a section on, build its page (see *Adding another page*) and set its
`href`. The blue **Follow Our Journey** button is inactive until you set the
`social` export to your social page URL.

---

## Airtable setup

**One base, one table per page.** Each page reads its own table, so the coffee
page reads a table named `Coffees`. `Collection` and `Roast` are optional —
leave them off a table entirely if a page doesn't use them (Syrups doesn't;
its card just omits the roast pips and collection line automatically). Give
every table these fields:

| Field         | Type             | Purpose                                            |
| ------------- | ---------------- | -------------------------------------------------- |
| `Name`         | Single line      | Drink name (required — blank rows are skipped)      |
| `Collection`   | Single line      | Series label shown in script above the name, e.g. `Flavor Reveal #2` (optional) |
| `Roast`        | Single line      | `Light`, `Medium`, or `Dark` — shows a label + filled bean pips (optional) |
| `Description`  | Long text        | Short description shown under the name             |
| `Release Date` | Single line TEXT | Free-text label, e.g. `Coming Fall 2026`. Use a **text** field, not a Date field (optional) |
| `Price`        | Currency or text | `4.50` shows as `$4.50`; free text shows as typed. Leave blank for coming-soon items |
| `Photo`/`Image`| Attachment       | One image per drink — see the aspect-ratio notes below for Beans/Syrups |
| `Order`        | Number           | Lower numbers first (fallback ordering)            |
| `Available`    | Checkbox         | Unchecked = hidden from the site (a soft "remove") |
| `Seasonal`     | Checkbox         | Adds a small "Seasonal" tag to the card            |

**Reordering:** records are pulled in the order of the Airtable **view** named in
`AIRTABLE_VIEW` (default `Grid view`). Name that view the same in every table,
and the owner just drags rows up or down to reorder. The `Order` number field is
a backup.

**Removing a drink:** uncheck `Available` (recommended — lets you bring seasonal
items back later) or delete the row.

### Coffee Beans — photo aspect ratio

Bagged-beans photos usually aren't the same shape as a drink cup photo, so the
Beans page (`/beans`) sizes each card's image box to that row's own `Image`
attachment instead of forcing every photo into one fixed shape. At build time
every photo is snapped to whichever of these two ratios it's closer to:

- **1:1 (square)** — a flat-lay shot of the bag from above.
- **4:3 (landscape)** — a bag photographed at an angle or on its side.

Shoot in either ratio and it'll render correctly, uncropped and undistorted;
there's nothing to configure per-row. A photo shot far outside both ratios
(e.g. a tall portrait) still displays without cropping, just with a little
letterboxing inside the nearer box. Only the Beans page behaves this way —
Coffees and Refreshers keep their existing fixed image box.

### Syrups — photo aspect ratio

Syrup bottle photos are a consistent shape by nature, so unlike Beans, the
Syrups page (`/syrups`) doesn't snap per-photo — every card's image box is a
fixed **2:3 portrait** ratio (a typical bottle-photo shape), set once for the
whole page. Shoot each bottle photo close to 2:3 (roughly twice as tall as it
is wide) for the best fit; a photo shot a different shape still displays in
full, just letterboxed inside that 2:3 box rather than cropped.

### Credentials

Create an Airtable **personal access token** at
<https://airtable.com/create/tokens> with `data.records:read` scope and access to
this one base. Then copy `.env.example` to `.env` (local) or set these in your
host's dashboard (production):

```
AIRTABLE_TOKEN=pat_xxxxxxxxxxxxxx
AIRTABLE_BASE=appXXXXXXXXXXXXXX
AIRTABLE_VIEW=Grid view
```

The token is gitignored via `.env`.

---

## Why images are downloaded at build time

Airtable attachment URLs **expire about two hours after they're issued**, so they
can't be linked straight into the page. `src/content.config.ts` fetches each
image during the build (while its URL is still fresh) and writes a permanent
local copy into `public/menu-images/`. The browser only ever sees a local path,
so photos never break. That folder is gitignored and regenerated every build.

---

## Deploying

Deploy as a plain static site:

- **Build command:** `npm run build`
- **Output directory:** `dist`

Add the three `AIRTABLE_*` variables in the host's environment settings.

### The Publish button (deploy hook)

Because content is baked in at build time, editing Airtable doesn't change the
live site until a rebuild runs. Wire up a one-click publish:

1. **Create a deploy/build hook** on your host — a URL you can POST to that
   triggers a fresh build. (Cloudflare Pages: *Settings → Builds & deployments →
   Deploy hooks*. Netlify: *Site configuration → Build & deploy → Build hooks*.)
2. **Add an Airtable automation** with a *Run a script* action:

   ```js
   const HOOK = 'https://your-deploy-hook-url';
   await fetch(HOOK, { method: 'POST' });
   ```

3. **Trigger it from a button** — add a `Publish` checkbox (or Button field), run
   the automation when it's toggled, and have the script uncheck it at the end.

Owner workflow: edit drinks → press **Publish** → the site rebuilds in a minute
or two, re-pulling every table and re-downloading fresh images.

---

## Adding another page

Every page described in *Structure* above now exists, but the pattern is the
same for any future one — say a `Seasonal Drinks` page:

1. In Airtable, create a `Seasonal Drinks` table with the fields it needs
   (skip `Collection`/`Roast` if it won't use them, the way Syrups does).
2. In `src/content.config.ts`, add the collection:
   `seasonal: menuCollection('Seasonal Drinks', 'sample-seasonal.json'),`
3. Add `src/data/sample-seasonal.json` (copy an existing sample file's shape).
4. Create `src/pages/seasonal.astro` (copy `syrups.astro` or `refreshers.astro`,
   swap the collection name and title). Pick at most one image-box behavior:
   `flexibleAspect={true}` if photos vary in shape per item and should snap to
   1:1 or 4:3 (like Beans), or `fixedAspect="2 / 3"` (or any CSS aspect-ratio
   value) if every photo on the page is one consistent shape (like Syrups).
   Leave both off to keep the original fixed 4:5 box (like Coffees/Refreshers).
5. In `src/site.config.ts`, give that `nav` item a `href: '/seasonal'`.
6. In `src/pages/index.astro`, fetch its count the same way `syrupsCount` is
   fetched, and give that section a `href: '/seasonal'`.

---

## Project structure

```
src/
  site.config.ts          # cafe name, tagline, verse, mission, contact
  content.config.ts       # per-table collections + image caching + sample fallback
  data/
    sample-coffee.json     # placeholder coffee drinks (used with no credentials)
    sample-refreshers.json # placeholder refreshers
    sample-beans.json      # placeholder bagged beans (mix of 1:1 and 4:3 photos)
    sample-syrups.json     # placeholder syrups (all fixed 2:3 photos)
  layouts/Base.astro      # <head>, fonts, global styles
  components/
    SiteHeader.astro      # slim logo header for interior pages
    SiteFooter.astro      # shared footer (mission, contact)
    HomeSpotlight.astro   # homepage slideshow
    MenuPage.astro        # shared page shell (fetch → filter → sort → render)
    MenuGrid.astro        # section title + responsive card grid
    DrinkCard.astro       # a single drink card + its detail popup
  pages/
    index.astro           # home landing + section navigation
    coffee.astro           # /coffee — reads the Coffees table
    refreshers.astro       # /refreshers — reads the Refreshers table
    beans.astro             # /beans — reads the Beans table
    syrups.astro            # /syrups — reads the Syrups table
  styles/global.css       # design tokens + layout
scripts/
  generate-spotlight-samples.mjs # regenerates the placeholder spotlight art
  generate-beans-samples.mjs     # regenerates the placeholder bean-bag art
  generate-syrups-samples.mjs    # regenerates the placeholder syrup-bottle art
public/
  logo.png                # brand logo (also the favicon)
  samples/                # placeholder images for sample data
  menu-images/            # (generated at build) cached Airtable photos
```

## Possible next steps

- **Our Story / Contact pages** — still plain content, not wired to Airtable.
- **Contact form** — the footer has a `mailto:` link; swap in Formspree or a
  Cloudflare/Netlify form when ready.
- **Image optimization** — images are downscaled and re-encoded as WebP at
  build time already (see *Why images are downloaded at build time*); further
  gains would mean serving responsive `srcset` sizes per breakpoint.

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

More section pages (beans, refreshers, syrups) are planned; see *Adding another
page* below.

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
{ label: 'Coffee Beans', href: null },   // greyed out, no link
{ label: 'Coffee Beans', href: '/beans' } // live link once the page exists
```

To turn a section on, build its page (see *Adding another page*) and set its
`href`. The blue **Follow Our Journey** button is inactive until you set the
`social` export to your social page URL.

---

## Airtable setup

**One base, one table per page.** Each page reads its own table, so the coffee
page reads a table named `Coffees`. Give every table these fields:

| Field         | Type             | Purpose                                            |
| ------------- | ---------------- | -------------------------------------------------- |
| `Name`        | Single line      | Drink name (required — blank rows are skipped)      |
| `Description` | Long text        | Short description shown under the name             |
| `Price`       | Currency or text | `4.50` shows as `$4.50`; free text shows as typed  |
| `Photo`       | Attachment       | One image per drink                                |
| `Order`       | Number           | Lower numbers first (fallback ordering)            |
| `Available`   | Checkbox         | Unchecked = hidden from the site (a soft "remove") |
| `Seasonal`    | Checkbox         | Adds a small "Seasonal" tag to the card            |

**Reordering:** records are pulled in the order of the Airtable **view** named in
`AIRTABLE_VIEW` (default `Grid view`). Name that view the same in every table,
and the owner just drags rows up or down to reorder. The `Order` number field is
a backup.

**Removing a drink:** uncheck `Available` (recommended — lets you bring seasonal
items back later) or delete the row.

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

To add, say, the Refreshers page:

1. In Airtable, create a `Refreshers` table with the same fields.
2. In `src/content.config.ts`, uncomment / add the collection:
   `refreshers: menuCollection('Refreshers', 'sample-refreshers.json'),`
3. Add `src/data/sample-refreshers.json` (copy an existing sample file).
4. Create `src/pages/refreshers.astro` (copy `coffee.astro`, swap the collection
   name and title).
5. In `src/pages/index.astro`, give that section a `href: '/refreshers'`.

---

## Project structure

```
src/
  site.config.ts          # cafe name, tagline, verse, mission, contact
  content.config.ts       # per-table collections + image caching + sample fallback
  data/
    sample-coffee.json    # placeholder coffee drinks (used with no credentials)
  layouts/Base.astro      # <head>, fonts, global styles
  components/
    SiteHeader.astro      # slim logo header for interior pages
    SiteFooter.astro      # shared footer (mission, contact)
    MenuGrid.astro        # section title + responsive card grid
    DrinkCard.astro       # a single drink card
  pages/
    index.astro           # home landing + section navigation
    coffee.astro          # /coffee — reads the Coffees table
  styles/global.css       # design tokens + layout
public/
  logo.png                # brand logo (also the favicon)
  samples/                # placeholder images for sample data
  menu-images/            # (generated at build) cached Airtable photos
```

## Possible next steps

- **Beans / Refreshers / Syrups pages** — follow *Adding another page*.
- **Contact form** — the footer has a `mailto:` link; swap in Formspree or a
  Cloudflare/Netlify form when ready.
- **Image optimization** — images are stored at original size; resize in the
  loader (e.g. with `sharp`) for faster loads.

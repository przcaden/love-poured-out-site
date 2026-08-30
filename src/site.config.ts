// -----------------------------------------------------------------------------
// Everything cafe-specific lives here. Edit these values, save, and redeploy —
// no other files need touching.
// -----------------------------------------------------------------------------
export const site = {
  name: 'Love Poured Out',
  tagline: 'Love in every sip. Brewing hope. Pouring love.',
  verse: 'Jeremiah 29:11',
  mission: 'With every brew there is hope, and with every sip there is love.',
  hours: 'Mon-Sat · 7am-3pm',        // update with real hours
  address: '', // add a street address here to show it, or leave blank to hide
  email: 'lovepouredout@outlook.com',
  domain: 'lovepouredout.net',
};

// Primary navigation. Set `href` to activate a link; leave it null to show the
// item greyed out (not yet built). All labels render in uppercase.
export const nav: { label: string; href: string | null }[] = [
  { label: 'Home', href: '/' },
  { label: 'Our Story', href: null },
  { label: 'Coffees', href: '/coffee' },
  { label: 'Coffee Beans', href: '/beans' },
  { label: 'Refreshers', href: '/refreshers' },
  { label: 'Syrups', href: null },
  { label: 'Contact', href: null },
];

// Social pages shown as icon buttons in the header (desktop) and mobile menu.
// Add, remove, or reorder entries here — no other file needs touching. Only
// list platforms with a real, live URL; there's no "coming soon" state here
// the way the nav has, since a social button with nowhere to go isn't useful.
export const socials: { name: 'Instagram' | 'Facebook' | 'TikTok'; href: string }[] = [
  { name: 'Instagram', href: 'https://www.instagram.com/love.pouredout/' },
  { name: 'Facebook', href: 'https://www.facebook.com/share/1E9PVd3Jsr/?mibextid=wwXIfr' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@hellolove.pouredout' },
];

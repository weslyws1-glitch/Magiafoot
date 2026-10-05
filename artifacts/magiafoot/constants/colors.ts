/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#14221a',
    tint: '#16804d',

    // Core surfaces
    background: '#f4f6f0',
    foreground: '#14221a',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#14221a',

    // Primary action color (buttons, links, active states)
    primary: '#16804d',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e8eee5',
    secondaryForeground: '#21392b',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#e8eee5',
    mutedForeground: '#69776c',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#d9f36a',
    accentForeground: '#14221a',

    // Destructive actions (delete, error states)
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#e1e7de',
    input: '#d9e2d8',
  },
  dark: {
    text: '#eef5ed',
    tint: '#a9d840',
    background: '#0e1712',
    foreground: '#eef5ed',
    card: '#16231b',
    cardForeground: '#eef5ed',
    primary: '#80c75a',
    primaryForeground: '#0e1712',
    secondary: '#203128',
    secondaryForeground: '#dce9dd',
    muted: '#203128',
    mutedForeground: '#9bab9d',
    accent: '#d9f36a',
    accentForeground: '#14221a',
    destructive: '#ff6262',
    destructiveForeground: '#ffffff',
    border: '#29392e',
    input: '#29392e',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;

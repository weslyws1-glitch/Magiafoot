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
    text: '#eef5ed',
    tint: '#79ef91',
    background: '#07150d',
    foreground: '#eef5ed',
    inverse: '#ffffff',
    card: '#0b2117',
    cardForeground: '#eef5ed',
    primary: '#2b6b48',
    primaryForeground: '#ffffff',
    secondary: '#153426',
    secondaryForeground: '#eef5ed',
    muted: '#153426',
    mutedForeground: '#9fb2a5',
    accent: '#7df28e',
    accentForeground: '#07150d',
    destructive: '#ff6262',
    destructiveForeground: '#ffffff',
    border: '#2b4d3a',
    input: '#315741',
  },
  dark: {
    text: '#eef5ed',
    tint: '#a9d840',
    background: '#0e1712',
    foreground: '#eef5ed',
    inverse: '#ffffff',
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

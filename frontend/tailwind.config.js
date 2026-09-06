module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // "green" is intentionally overridden to an emerald-toned scale
        // (Tailwind's default green-500 is #22c55e, not this app's accent
        // color) - full scale, not a flat value, so `green-400`/`green-600`
        // etc. keep resolving. blue/red/purple/pink already match Tailwind's
        // own defaults, so they're left alone rather than re-flattened.
        green: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        // Semantic tokens bound to the CSS custom properties in index.css -
        // resolve to light values by default, dark values under a `.dark`
        // class on <html> (see utils/theme.ts). Named additively alongside
        // the literal zinc/amber classes still used throughout the app,
        // rather than replacing them outright.
        page: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-alt": "var(--color-surface-alt)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
      },
      keyframes: {
        fadeSlideDown: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeSlideDown: "fadeSlideDown 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

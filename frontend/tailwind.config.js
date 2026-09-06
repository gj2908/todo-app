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

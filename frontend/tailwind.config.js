module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        blue: "#3b82f6",
        green: "#10b981",
        red: "#ef4444",
        purple: "#a855f7",
        pink: "#ec4899",
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

export type Theme = "light" | "dark";

const STORAGE_KEY = "taskflow-theme";

// Mirrors the inline script in public/index.html that runs before React
// hydrates (so there's no flash of the wrong theme) - keep the two in sync.
export const getStoredTheme = (): Theme | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
};

export const getSystemTheme = (): Theme =>
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const getCurrentTheme = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // best-effort - theme still applies for this page load
  }
};

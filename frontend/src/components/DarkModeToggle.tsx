import { useState, useEffect } from "react";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(localStorage.getItem("theme") === "dark");
  const [theme, setTheme] = useState(
    localStorage.getItem("color-theme") || "blue",
  );

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("color-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="flex gap-2 items-center bg-white dark:bg-gray-700 rounded-lg p-2">
      <button
        onClick={() => setDark(!dark)}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded font-semibold transition hover:scale-110"
        title="Toggle dark mode"
      >
        {dark ? "🌙" : "☀️"}
      </button>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded font-semibold transition cursor-pointer"
        title="Change theme color"
      >
        <option value="blue">🔵 Blue</option>
        <option value="green">🟢 Green</option>
        <option value="purple">🟣 Purple</option>
        <option value="red">🔴 Red</option>
        <option value="pink">🩷 Pink</option>
      </select>
    </div>
  );
}

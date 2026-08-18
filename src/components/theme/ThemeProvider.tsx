"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme =
  | "light"
  | "dark"
  | "system";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext =
  createContext<ThemeContextType | null>(
    null
  );

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] =
    useState<Theme>("light");

  useEffect(() => {
    const savedTheme =
      localStorage.getItem(
        "inventory-theme"
      ) as Theme | null;

    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
    ) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("light");
    }
  }, []);

  function setTheme(
    newTheme: Theme
  ) {
    setThemeState(newTheme);

    localStorage.setItem(
      "inventory-theme",
      newTheme
    );

    applyTheme(newTheme);
  }

  function toggleTheme() {
    setTheme(
      theme === "dark"
        ? "light"
        : "dark"
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(
  theme: Theme
) {
  const root =
    document.documentElement;

  root.classList.remove("dark");

  if (theme === "dark") {
    root.classList.add("dark");
    return;
  }

  if (theme === "system") {
    const prefersDark =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

    if (prefersDark) {
      root.classList.add("dark");
    }
  }
}

export function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}
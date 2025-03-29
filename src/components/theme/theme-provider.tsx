"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useMemo } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  resolvedTheme: "light",
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light")
  const [mounted, setMounted] = useState(false)

  // Only set theme after component is mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)

    // Add preload class to prevent transitions on initial load
    document.documentElement.classList.add("preload")

    // Load theme from localStorage if available
    const storedTheme = localStorage.getItem("theme") as Theme | null
    if (storedTheme && ["dark", "light", "system"].includes(storedTheme)) {
      setThemeState(storedTheme)
    }

    // Remove preload class after a short delay
    const timer = setTimeout(() => {
      document.documentElement.classList.remove("preload")
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  // Handle system theme changes
  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = () => {
      if (theme === "system") {
        const newResolvedTheme = mediaQuery.matches ? "dark" : "light"
        setResolvedTheme(newResolvedTheme)
        updateDocumentClass(newResolvedTheme)
      }
    }

    // Initial check
    handleChange()

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, mounted])

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      setResolvedTheme(systemTheme)
      updateDocumentClass(systemTheme)
    } else {
      setResolvedTheme(theme)
      updateDocumentClass(theme)
    }
  }, [theme, mounted])

  // Optimize theme class updates
  const updateDocumentClass = (newTheme: string) => {
    const root = window.document.documentElement

    // Use classList for better performance
    if (newTheme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    // Store theme in localStorage
    localStorage.setItem("theme", newTheme)
  }

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
    }),
    [theme, resolvedTheme],
  )

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}


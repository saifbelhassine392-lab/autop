import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "#1e293b",
        "red-650": "#dc2626",
        "amber-450": "#f59e0b",
        "slate-850": "#111827",
        gold: "#f59e0b",
        "bg-card": "#0f172a",
        "bg-dark": "#020617",
        "accent-red": "#dc2626",
        "accent-red-hover": "#b91c1c",
        "accent-green": "#10b981",
        "accent-blue": "#3b82f6",
        "accent-cyan": "#06b6d4",
        "accent-orange": "#f97316",
        "accent-purple": "#8b5cf6",
        "text-muted": "#94a3b8",
        "border-custom": "#1e293b",
      },
    },
  },
  plugins: [],
};
export default config;
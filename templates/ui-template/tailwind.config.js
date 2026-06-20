/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        background: "var(--background,var(--surface-0))",
        border: "var(--border,var(--surface-border))",
        card: "var(--card,var(--surface-card,var(--surface-0)))",
        foreground: "var(--foreground,var(--text-color))",
        muted: "var(--muted,var(--surface-500))",
        "muted-foreground": "var(--muted-foreground,var(--text-color-secondary))",
        primary: "var(--primary-color,var(--primary))",
      },
      screens: {
        sm: "576px",
        md: "768px",
        lg: "992px",
        xl: "1200px",
      },
    },
  },
  plugins: [],
};

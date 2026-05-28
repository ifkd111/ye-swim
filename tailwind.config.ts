import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1E2442",
        pool: {
          50: "#eef9ff",
          100: "#d9f0ff",
          200: "#b8e3ff",
          500: "#25a8df",
          600: "#168bc0",
          700: "#116f9c"
        },
        mint: "#11b981",
        coral: "#ff7c73",
        sun: "#ffc857",
        lavender: "#8b7cf6"
      },
      boxShadow: {
        soft: "0 18px 60px rgb(30 36 66 / 0.10)",
        line: "0 0 0 1px rgb(30 36 66 / 0.08)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.35rem",
        "3xl": "1.75rem"
      }
    }
  },
  plugins: []
};

export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"]
      },
      colors: {
        noska: {
          bg: "#F0FAFF",
          surface: "#F0F0F0",
          accent: "#E3CFB3",
          "accent-deep": "#C9B090",
          "accent-light": "#F0E6D6",
          sidebar: "#F5F7FA",
          hover: "#E8E8E8",
          blue: "#0066FF",
          blueGlow: "rgba(0, 102, 255, 0.25)",
          blueSoft: "rgba(0, 102, 255, 0.08)",
          blueLight: "#4791FF",
          blueDark: "#0052CC"
        }
      }
    }
  },
  plugins: []
};

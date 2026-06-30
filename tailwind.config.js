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
          sidebar: "#191919",
          teal: "#0F7B6C",
          hover: "#F1F1F0",
          blue: "#0066FF",
          blueGlow: "rgba(0, 102, 255, 0.35)",
          blueSoft: "rgba(0, 102, 255, 0.12)",
          blueLight: "#4791FF",
          blueDark: "#0052CC"
        }
      }
    }
  },
  plugins: []
};

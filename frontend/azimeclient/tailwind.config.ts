import colors from "tailwindcss/colors";

// "white" surfaces come from --surface (src/index.css) so they can be warmed now and
// themed for dark mode later. Text stays pure white. See docs/dark-mode-plan.md.
const surface = "rgb(var(--surface) / <alpha-value>)";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Warm neutrals: the app's slate and gray classes render as Tailwind's stone.
      colors: {
        slate: colors.stone,
        gray: colors.stone,
      },
      backgroundColor: { white: surface },
      borderColor: { white: surface },
      ringColor: { white: surface },
      ringOffsetColor: { white: surface },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

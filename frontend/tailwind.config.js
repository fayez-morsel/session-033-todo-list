/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4CAF50",
        primaryDark: "#2E7D32",
        accent: "#FFCA28",
      },
      borderRadius: {
        soft: "8px",
      },
    },
  },
  plugins: [],
};

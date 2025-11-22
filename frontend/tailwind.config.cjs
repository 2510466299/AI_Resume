/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5fbff",
          100: "#e1f3ff",
          500: "#1b77ff",
          600: "#115ed1",
        },
      },
    },
  },
  plugins: [],
};

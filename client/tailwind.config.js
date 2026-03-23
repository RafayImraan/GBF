/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07111f",
          900: "#0b1527",
          800: "#112039"
        },
        mint: {
          300: "#8df0b6",
          400: "#51d58f",
          500: "#27bf74"
        },
        gold: {
          300: "#ffd88a",
          400: "#efbc56"
        }
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "serif"],
        body: ["Segoe UI", "system-ui", "sans-serif"]
      },
      boxShadow: {
        panel: "0 20px 60px rgba(1, 12, 25, 0.28)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(141, 240, 182, 0.12), transparent 30%), radial-gradient(circle at top right, rgba(239, 188, 86, 0.14), transparent 28%), linear-gradient(135deg, rgba(13, 28, 48, 0.95), rgba(6, 12, 23, 1))"
      }
    }
  },
  plugins: []
};

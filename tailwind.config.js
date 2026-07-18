/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#07070a",
        charcoal: "#111014",
        graphite: "#1c1a1f",
        ember: "#3a0407",
        crimson: "#7a0b10",
        blood: "#9c1218",
        scarlet: "#c11a20",
        gold: "#c9a961",
        "gold-light": "#e6d3a3",
        "gold-dark": "#8a7038",
        ivory: "#f4f1ea",
        bone: "#dedad1",
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'Manrope'", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.35em",
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(circle at center, rgba(156,18,24,0.25) 0%, rgba(7,7,10,0) 70%)",
        "gold-line":
          "linear-gradient(90deg, transparent, #c9a961, transparent)",
      },
      boxShadow: {
        gold: "0 0 30px rgba(201,169,97,0.25)",
        card: "0 20px 60px -20px rgba(0,0,0,0.7)",
      },
      animation: {
        "fade-up": "fadeUp 0.9s ease forwards",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html", // Escanea el HTML
    "./main.js",    // Escanea el JS donde inyectas clases dinámicas
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

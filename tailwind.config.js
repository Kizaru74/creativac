// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRÍTICO: Indica a Tailwind dónde buscar clases
  content: [
    "./index.html",
    "./main.js",
    // Agrega cualquier otro archivo JS/HTML que uses
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
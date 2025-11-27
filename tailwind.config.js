/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRÍTICO: Indica a Tailwind dónde buscar clases
  content: [
    "./index.html",
    "./main.js",
    // Agrega cualquier otro archivo JS/HTML que uses
  ],
  theme: {
    // Aquí puedes extender la configuración por defecto
    extend: {
        // No es necesario añadir z-index aquí, ya que los valores z-10 a z-50 
        // están disponibles por defecto.
    },
  },
  plugins: [],
}
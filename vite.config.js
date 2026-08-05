import { defineConfig } from "vite";

// Diagnostic-only branch. Bundle the React application graph directly, without
// using index.html as a multi-entry document. This isolates `main.jsx`/Studio
// module resolution from extra legacy module scripts still present in index.html.
export default defineConfig({
  build: {
    rollupOptions: {
      input: "src/main.jsx",
    },
  },
});

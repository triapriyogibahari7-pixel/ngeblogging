import { defineConfig } from "vite";

const COMMENTS_ENTRY = /(?:^|\/)comments-studio-v93\.jsx$/;

export default defineConfig({
  plugins: [
    {
      name: "ngeblogging-comments-react-dom-v93",
      enforce: "pre",
      transform(code, id) {
        if (!COMMENTS_ENTRY.test(id)) return null;
        const legacy = 'import { createPortal, createRoot } from "react-dom/client";';
        if (!code.includes(legacy)) return null;
        return {
          code: code.replace(
            legacy,
            'import { createPortal } from "react-dom";\nimport { createRoot } from "react-dom/client";',
          ),
          map: null,
        };
      },
    },
  ],
});

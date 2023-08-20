import { defineConfig } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'NoteDown',
      fileName: 'note-down',
    },
  },
});

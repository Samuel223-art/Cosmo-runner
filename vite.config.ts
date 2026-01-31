
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 'base: "./"' ensures the game works when hosted in a subfolder (CrazyGames requirement)
  base: './', 
  build: {
    // This creates the folder "crazygames_project" in your root
    outDir: 'crazygames_project', 
    
    // CRITICAL: Disable minification so the JS file is readable text, not "binary looking" gibberish
    minify: false, 
    
    // Place assets in root, not in nested folders, for simplicity
    assetsDir: '', 
    
    // Ensure the output is clean standard files
    rollupOptions: {
        output: {
            entryFileNames: 'script.js',  // Main game logic
            chunkFileNames: 'engine.js',  // Libraries
            assetFileNames: (assetInfo) => {
                if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                    return 'style.css';
                }
                return '[name][extname]';
            }
        }
    }
  },
  server: {
    port: 3000,
    host: true
  }
});

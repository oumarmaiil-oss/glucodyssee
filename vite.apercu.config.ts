import base from './vite.config.ts';
import { mergeConfig } from 'vite';
// Construction d'aperçu en un seul fichier (artefact) : pas de découpage, pas de service worker.
export default mergeConfig(typeof base === 'function' ? base({ command: 'build', mode: 'production' }) : base, {
  base: './', build: { outDir: 'dist-apercu', rollupOptions: { output: { inlineDynamicImports: true } } },
});

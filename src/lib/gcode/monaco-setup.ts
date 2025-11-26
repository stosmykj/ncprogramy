/**
 * Monaco Editor Setup for SvelteKit
 * Configures web workers to prevent SSR issues
 */

console.log('[monaco-setup] Module loading...');

import * as monaco from 'monaco-editor';

console.log('[monaco-setup] Monaco imported');

// Import workers using Vite's ?worker syntax
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

console.log('[monaco-setup] Editor worker imported');

// Set up Monaco environment with worker
self.MonacoEnvironment = {
  getWorker: function (_: string, label: string) {
    console.log('[monaco-setup] getWorker called for label:', label);
    // For G-code we only need the base editor worker
    const worker = new editorWorker();
    console.log('[monaco-setup] Worker created successfully');
    return worker;
  },
};

console.log('[monaco-setup] MonacoEnvironment configured');

export default monaco;

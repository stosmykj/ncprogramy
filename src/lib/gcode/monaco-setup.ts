/**
 * Monaco Editor Setup for SvelteKit
 * Configures web workers to prevent SSR issues
 */

import * as monaco from 'monaco-editor';

// Import workers using Vite's ?worker syntax
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

// Set up Monaco environment with worker
self.MonacoEnvironment = {
  getWorker: function (_: string, _label: string) {
    // For G-code we only need the base editor worker
    return new editorWorker();
  },
};

export default monaco;

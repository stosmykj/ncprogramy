<script lang="ts">
  import '../styles/main.css';
  import Toast from '../components/Toast.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { startPeriodicBackup, stopPeriodicBackup, createExitBackup } from '$lib/backupProcessor';
  import { initLogger, shutdownLogger } from '$lib/logger';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { loadTextZoomLevel, applyZoomLevel, zoomIn, zoomOut, zoomReset } from '$lib/settingsProcessor.svelte';

  let { children } = $props();
  let zoomHandler: ((event: KeyboardEvent) => void) | null = null;

  onMount(async () => {
    // Initialize logger
    await initLogger();

    // Load and apply zoom level
    const zoomLevel = await loadTextZoomLevel();
    applyZoomLevel(zoomLevel);

    // Global keyboard shortcuts for zoom
    zoomHandler = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === '=' || event.key === '+') {
          event.preventDefault();
          zoomIn();
        } else if (event.key === '-') {
          event.preventDefault();
          zoomOut();
        } else if (event.key === '0') {
          event.preventDefault();
          zoomReset();
        }
      }
    };
    window.addEventListener('keydown', zoomHandler);

    // Start periodic backup every 60 minutes
    startPeriodicBackup(60);

    // Listen for window close event to create backup
    const appWindow = getCurrentWindow();
    await appWindow.onCloseRequested(async (event) => {
      event.preventDefault();
      await shutdownLogger();
      await createExitBackup();
      await appWindow.destroy();
    });
  });

  onDestroy(() => {
    stopPeriodicBackup();
    if (zoomHandler) {
      window.removeEventListener('keydown', zoomHandler);
    }
  });
</script>

{@render children()}
<Toast />

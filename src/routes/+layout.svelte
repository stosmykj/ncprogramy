<script lang="ts">
  import '../styles/main.css';
  import Toast from '../components/Toast.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { startPeriodicBackup, stopPeriodicBackup, createExitBackup } from '$lib/backupProcessor';
  import { getCurrentWindow } from '@tauri-apps/api/window';

  let { children } = $props();

  onMount(async () => {
    // Start periodic backup every 60 minutes
    startPeriodicBackup(60);

    // Listen for window close event to create backup
    const appWindow = getCurrentWindow();
    await appWindow.onCloseRequested(async (event) => {
      event.preventDefault();
      await createExitBackup();
      await appWindow.destroy();
    });
  });

  onDestroy(() => {
    stopPeriodicBackup();
  });
</script>

{@render children()}
<Toast />

<script lang="ts">
  import { TOASTS, removeToast } from '$lib/toast.svelte';
  import { fly } from 'svelte/transition';
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'mdiCheckCircle';
      case 'error':
        return 'mdiAlertCircle';
      case 'warning':
        return 'mdiAlert';
      default:
        return 'mdiInformation';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#22aa44';
      case 'error':
        return '#d32f2f';
      case 'warning':
        return '#ff9800';
      default:
        return '#2196f3';
    }
  };
</script>

<div class="toast-container">
  {#each TOASTS as toast (toast.id)}
    <div
      class="toast toast-{toast.type}"
      transition:fly={{ y: 50, duration: 300 }}
      role="alert"
      aria-live="polite"
    >
      <div class="toast-icon">
        <Icon name={getIcon(toast.type)} size={24} color={getIconColor(toast.type)} />
      </div>
      <div class="toast-message">{toast.message}</div>
      <Button onClick={() => removeToast(toast.id)} icon="mdiClose" iconColor="#666" onlyIcon />
    </div>
  {/each}
</div>

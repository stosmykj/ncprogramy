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

<style lang="scss">
  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid;
    min-width: 300px;

    &.toast-success {
      border-left-color: #22aa44;
    }

    &.toast-error {
      border-left-color: #d32f2f;
    }

    &.toast-warning {
      border-left-color: #ff9800;
    }

    &.toast-info {
      border-left-color: #2196f3;
    }
  }

  .toast-icon {
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    font-size: 0.95rem;
    color: #333;
  }

  .toast-close {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f5f5;
    }
  }
</style>

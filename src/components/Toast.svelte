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

  // Must mirror the semantic color tokens in main.css. The Icon component
  // passes `color` to an SVG fill attribute, where `var(--…)` is not resolved.
  const getIconColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      default:
        return '#285597';
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
      <Button onClick={() => removeToast(toast.id)} icon="mdiClose" iconColor="#667085" onlyIcon />
    </div>
  {/each}
</div>

<script lang="ts">
  interface Props {
    keys: string;
    class?: string;
  }

  let { keys, class: className }: Props = $props();
</script>

<kbd class="keyboard-shortcut {className || ''}">
  {keys}
</kbd>

<style lang="scss">
  .keyboard-shortcut {
    display: flex;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    background: var(--color-primary-hover);
    border: 1px solid var(--color-primary-hover);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-2xs);
    font-family: var(--font-family);
    color: var(--color-text-on-primary);
    font-weight: 500;
    flex-shrink: 0;
    transition: opacity var(--transition-base);
  }
</style>

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
    padding: 4px 6px;
    background: #1e4177;
    border: 1px solid #1e4177;
    border-radius: 4px;
    font-size: 11px;
    font-family:
      'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana,
      sans-serif;
    color: #fff;
    font-weight: 500;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
  }
</style>

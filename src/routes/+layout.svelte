<script>
  import Toast from '../components/Toast.svelte';
  let { children } = $props();
</script>

{@render children()}
<Toast />

<style lang="scss">
  :global(*) {
    box-sizing: border-box;
  }
  :global(*:focus) {
    outline: 0;
    outline: none;
  }
  :global(html, body) {
    margin: 0;
    padding: 0;
  }
</style>

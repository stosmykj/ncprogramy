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
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
      'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>

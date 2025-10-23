<script>
  import '../styles/main.css';
  import Toast from '../components/Toast.svelte';
  let { children } = $props();
</script>

{@render children()}
<Toast />

<script lang="ts">
  // @ts-ignore - no declaration file for this module
  import SvgIcon from '@jamescoyle/svelte-icon/src/svg-icon.svelte';
  import { iconMap, type IconName } from '../models/icons';

  const { name, size, color, spin = false }: { name: IconName; size?: number; color?: string; spin?: boolean } = $props();
</script>

<span class:spin>
  <SvgIcon type="mdi" size={size ?? 20} path={iconMap[name]} color={color ?? '#000'} />
</span>

<style>
  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>

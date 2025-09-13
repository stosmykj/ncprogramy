<script lang="ts">
  import SvgIcon from '@jamescoyle/svelte-icon/src/svg-icon.svelte';
  import { iconMap, type IconName } from '../models/icons';
  // Import only the icons we actually use (saves ~2.7MB!)

  const { name, size, color }: { name: IconName; size?: number; color?: string } = $props();
</script>

<SvgIcon type="mdi" size={size ?? 20} path={iconMap[name]} color={color ?? '#000'} />

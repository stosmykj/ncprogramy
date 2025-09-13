<script lang="ts">
  import DatePicker from '../DatePicker.svelte';

  let {
    value = $bindable(new Date()),
    onSave,
    onCancel,
    autoFocus = true,
  }: {
    value: Date | null;
    onSave: (value: Date | null) => void;
    onCancel: () => void;
    autoFocus?: boolean;
  } = $props();

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="datetime-editor" onkeydown={handleKeyDown} role="group">
  <DatePicker bind:value type="datetime" {autoFocus} />
</div>

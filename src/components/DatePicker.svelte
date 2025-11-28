<script lang="ts">
  import { DateInput, localeFromDateFnsLocale } from 'date-picker-svelte';
  import { cs } from 'date-fns/locale';
  import Button from './Button.svelte';

  let {
    value = $bindable(null),
    type = 'date',
    placeholder = '',
    class: className = '',
    disabled = false,
    autoFocus = false,
  }: {
    value: Date | null;
    type?: 'date' | 'datetime';
    placeholder?: string;
    class?: string;
    disabled?: boolean;
    autoFocus?: boolean;
  } = $props();

  const format = type === 'date' ? 'dd. MM. yyyy' : 'dd. MM. yyyy HH:mm';
  const timePrecision = type === 'datetime' ? 'minute' : null;

  let wrapperRef: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (autoFocus && wrapperRef) {
      // Use setTimeout to ensure the DateInput component has rendered its internal input
      setTimeout(() => {
        const input = wrapperRef?.querySelector('input');
        if (input) {
          input.focus();
          input.select();
          // Also click to open the picker
          input.click();
        }
      }, 50);
    }
  });

  function clearDateTime() {
    value = null;
  }
</script>

<div class="date-picker-wrapper {className}" bind:this={wrapperRef}>
  <DateInput
    bind:value
    {format}
    {timePrecision}
    {placeholder}
    {disabled}
    locale={localeFromDateFnsLocale(cs)}
  />
  {#if value}
    <div class="clear-button">
      <Button onClick={clearDateTime} icon="mdiClose" onlyIcon />
    </div>
  {/if}
</div>

<style lang="scss">
  .date-picker-wrapper {
    position: relative;
    width: 100%;

    // Style the input field
    :global(.date-time-field) {
      width: 100%;
      height: 2.2rem;
      border: 1px solid #d0d5dd;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-family: inherit;
      background: white;
      box-sizing: border-box;
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
      }

      &:disabled {
        background: #f9fafb;
        color: #98a2b3;
        cursor: not-allowed;
      }

      &::placeholder {
        color: #98a2b3;
      }
    }

    :global(.date-time-field input) {
      width: 100%;
      height: 100%;
    }

    // Style the calendar popup
    :global(.date-time-picker) {
      height: 100%;
      background: white;
      border: 1px solid #d0d5dd;
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 0.75rem;
      z-index: 1001;
    }

    // Calendar header (month/year navigation)
    :global(.picker-header) {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 4px 0.75rem;
      border-bottom: 1px solid #eaecf0;
      margin-bottom: 0.75rem;
    }

    :global(.picker-header button) {
      background: transparent;
      border: none;
      color: #344054;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        background: #f2f4f7;
        color: #4a90e2;
      }
    }

    // Day names (Mon, Tue, etc.)
    :global(.weekdays) {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.25rem;
      margin-bottom: 0.25rem;
    }

    :global(.weekday) {
      text-align: center;
      font-size: 0.75rem;
      font-weight: 600;
      color: #667085;
      padding: 0.25rem;
    }

    // Calendar days
    :global(.days) {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.125rem;
    }

    :global(.day) {
      aspect-ratio: 1;
      border: none;
      background: transparent;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      color: #344054;
      cursor: pointer;
      transition: all 0.15s ease;
      font-weight: 400;

      &:hover {
        background: #f2f4f7;
        color: #4a90e2;
      }

      &.selected {
        background: #4a90e2 !important;
        color: white !important;
        font-weight: 600;
      }

      &.today {
        border: 1px solid #4a90e2;
        font-weight: 600;
      }

      &.disabled {
        color: #d0d5dd;
        cursor: not-allowed;
        &:hover {
          background: transparent;
        }
      }

      &.outside-month {
        color: #98a2b3;
      }
    }

    // Time picker section
    :global(.time-picker) {
      border-top: 1px solid #eaecf0;
      padding-top: 0.75rem;
      margin-top: 0.75rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
      justify-content: center;
    }

    :global(.time-picker input) {
      width: 60px;
      padding: 0.375rem 0.5rem;
      border: 1px solid #d0d5dd;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      text-align: center;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
      }
    }

    :global(.time-separator) {
      font-size: 1rem;
      font-weight: 600;
      color: #667085;
    }

    .clear-button {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      right: 0.5rem;
      height: 100%;
      z-index: 10;
    }
  }
</style>

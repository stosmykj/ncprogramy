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
      const input = wrapperRef.querySelector('input');
      if (input) {
        input.focus();
        input.select();
      }
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
      border-radius: 6px;
      font-size: 14px;
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
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 12px;
      z-index: 1001;
    }

    // Calendar header (month/year navigation)
    :global(.picker-header) {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 4px 12px;
      border-bottom: 1px solid #eaecf0;
      margin-bottom: 12px;
    }

    :global(.picker-header button) {
      background: transparent;
      border: none;
      color: #344054;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
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
      gap: 4px;
      margin-bottom: 4px;
    }

    :global(.weekday) {
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: #667085;
      padding: 4px;
    }

    // Calendar days
    :global(.days) {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    :global(.day) {
      aspect-ratio: 1;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 13px;
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
      padding-top: 12px;
      margin-top: 12px;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
    }

    :global(.time-picker input) {
      width: 60px;
      padding: 6px 8px;
      border: 1px solid #d0d5dd;
      border-radius: 4px;
      font-size: 14px;
      text-align: center;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: #4a90e2;
        box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
      }
    }

    :global(.time-separator) {
      font-size: 16px;
      font-weight: 600;
      color: #667085;
    }

    .clear-button {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      right: 8px;
      height: 100%;
      z-index: 10;
    }
  }
</style>

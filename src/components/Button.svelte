<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import type { IconName } from '../models/icons';

  const props: {
    onClick?: Function;
    children?: Snippet;
    class?: string | Array<string | object>;
    icon?: IconName;
    iconSize?: number;
    iconColor?: string;
    style?: string;
    color?: string;
    title?: string;
    onlyIcon?: boolean;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
    success?: boolean;
    warning?: boolean;
    selected?: boolean;
    small?: boolean;
    tabIndex?: number;
  } = $props();

  const iconColor = $derived.by(() => {
    if (props.iconColor) {
      return props.iconColor;
    }
    if (props.onlyIcon) {
      if (props.primary) return 'var(--color-primary)';
      if (props.danger) return 'var(--color-danger)';
      if (props.success) return 'var(--color-success)';
      if (props.warning) return 'var(--color-warning)';
    }
    if (props.primary || props.danger || props.success || props.warning) {
      return 'var(--color-text-on-primary)';
    }

    return 'var(--color-text)';
  });

  async function onclick(e: Event) {
    if (props.onClick) {
      await props.onClick(e);
    }

    const target = e.target as HTMLElement;
    const btnTarget = target instanceof HTMLButtonElement ? target : target.closest('button');
    if (btnTarget) {
      setTimeout(() => {
        btnTarget.blur();
      }, 300);
    }
  }
</script>

<button
  {...props}
  class:icon={props.icon}
  class:only-icon={!props.children || props.onlyIcon}
  class:primary={props.primary}
  class:danger={props.danger}
  class:disabled={props.disabled}
  class:warning={props.warning}
  class:selected={props.selected}
  class:small={props.small}
  tabindex={props.tabIndex}
  {onclick}
>
  {#if props.icon}
    <span class="icon">
      <Icon name={props.icon} size={props.iconSize} color={iconColor} />
    </span>
  {/if}
  {#if props.children}
    <div class="content" style="color: {props.color}">{@render props.children()}</div>
  {/if}
</button>

<style lang="scss">
  button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: start;
    height: var(--btn-height);
    padding: var(--btn-padding);
    background: var(--color-bg-muted);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    outline: none;
    border-radius: var(--btn-radius);
    font-size: var(--font-size-sm);
    font-weight: 600;
    font-family: var(--font-family);
    cursor: pointer;
    transition: var(--transition-base);

    &:hover {
      background: var(--color-border);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 1px;
    }

    &.full {
      width: calc(100% - 1rem);

      .content {
        justify-content: center;
      }
    }

    &.full-total {
      width: 100%;

      .content {
        justify-content: center;
      }
    }

    &.primary {
      color: var(--color-text-on-primary);
      background: var(--color-primary);
      border-color: var(--color-primary);

      &:hover,
      &.selected {
        background: var(--color-primary-dark);
      }
    }

    &.danger {
      color: var(--color-text-on-primary);
      background: var(--color-danger);
      border-color: var(--color-danger);

      &:hover,
      &.selected {
        background: var(--color-danger-hover);
      }
    }

    &.success {
      color: var(--color-text-on-primary);
      background: var(--color-success);
      border-color: var(--color-success);

      &:hover,
      &.selected {
        background: var(--color-success-hover);
      }
    }

    &.warning {
      color: var(--color-text-on-primary);
      background: var(--color-warning);
      border-color: var(--color-warning);

      &:hover,
      &.selected {
        background: var(--color-warning-hover);
      }
    }

    &.small {
      height: 1.5rem;
      font-size: var(--font-size-xs);
      padding: 0 var(--space-3);
    }

    &.disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .content {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
    }

    &.icon {
      &.only-icon {
        padding: 0;
        width: 1.25rem;
        height: 1.25rem;
        background: none;
        border: none;
        transition: var(--transition-base);

        &:hover {
          scale: 0.85;
        }
      }

      .content {
        margin-left: var(--space-3);
      }
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
  }
</style>

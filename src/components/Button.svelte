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
    onlyIcon?: boolean;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
    success?: boolean;
    warning?: boolean;
    selected?: boolean;
  } = $props();

  const iconColor = $derived.by(() => {
    if (props.iconColor) {
      return props.iconColor;
    }
    if (props.onlyIcon) {
      if (props.primary) {
        return '#285597';
      }
      if (props.danger) {
        return '#dc3545';
      }
      if (props.success) {
        return '#28a745';
      }
      if (props.warning) {
        return '#ffc107';
      }
    }
    if (props.primary) {
      return '#fff';
    }
    if (props.danger) {
      return '#fff';
    }
    if (props.success) {
      return '#fff';
    }
    if (props.warning) {
      return '#fff';
    }

    return '#333';
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
    display: flex;
    align-items: center;
    justify-content: start;
    height: 2.5rem;
    padding: 0.5rem 0.75rem;
    background: #e0e0e0;
    border: 2px solid #c0c0c0;
    color: #333;
    outline: none;
    border-radius: 8px;
    font-weight: bold;
    font-family:
      'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana,
      sans-serif;
    cursor: pointer;
    transition: 0.3s;

    &:hover {
      background: #c0c0c0;
    }

    &.full {
      width: calc(100% - 1.25rem);

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
      color: #fff;
      background: #285597;
      border-color: #285597;

      &:hover,
      &.selected {
        background: #183868;
      }
    }

    &.danger {
      color: #fff;
      background: #dc3545;
      border-color: #dc3545;

      &:hover,
      &.selected {
        background: #c82333;
      }
    }

    &.success {
      color: #fff;
      background: #28a745;
      border-color: #28a745;

      &:hover,
      &.selected {
        background: #218838;
      }
    }

    &.warning {
      color: #fff;
      background: #ffc107;
      border-color: #ffc107;

      &:hover,
      &.selected {
        background: #e0a800;
      }
    }

    &.disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .content {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
    }

    &.icon {
      &.only-icon {
        padding: 0;
        width: 1.5rem;
        height: 1.5rem;
        background: none;
        border: none;
        transition: 0.3s;

        &:hover {
          scale: 0.8;
        }
      }

      .content {
        margin-left: 0.5rem;
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

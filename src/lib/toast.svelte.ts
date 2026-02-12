/**
 * Toast notification system
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

export const TOASTS = $state<Toast[]>([]);

let toastCounter = 0;
const toastTimeouts = new Map<string, number>();

export function showToast(
  message: string,
  type: ToastType = 'info',
  duration: number = 3000
): void {
  const id = `toast-${++toastCounter}`;

  const toast: Toast = {
    id,
    message,
    type,
    duration,
  };

  TOASTS.push(toast);

  if (duration > 0) {
    const timeoutId = window.setTimeout(() => {
      toastTimeouts.delete(id);
      removeToast(id);
    }, duration);
    toastTimeouts.set(id, timeoutId);
  }
}

export function removeToast(id: string): void {
  // Clear any pending auto-dismiss timeout
  const timeoutId = toastTimeouts.get(id);
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
    toastTimeouts.delete(id);
  }

  const index = TOASTS.findIndex((t) => t.id === id);
  if (index !== -1) {
    TOASTS.splice(index, 1);
  }
}

export function showSuccess(message: string, duration?: number): void {
  showToast(message, 'success', duration);
}

export function showError(message: string, duration?: number): void {
  showToast(message, 'error', duration || 5000);
}

export function showWarning(message: string, duration?: number): void {
  showToast(message, 'warning', duration);
}

export function showInfo(message: string, duration?: number): void {
  showToast(message, 'info', duration);
}

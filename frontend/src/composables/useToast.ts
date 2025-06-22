import { ref } from 'vue';
import type { ToastProps } from '@/components/toast/Toast.vue';

// A unique ID generator for toasts
let toastId = 0;

// Set duration defaults based on type
const DURATIONS = {
  error: 8000,    // 8 seconds for errors
  success: 4000,  // 4 seconds for success
  info: 3000,     // 3 seconds for info
};

// State is kept outside the function to ensure it's a singleton
const toasts = ref<ToastProps[]>([]);

export function useToast() {
  // Add a new toast
  function showToast(message: string, type: 'error' | 'success' | 'info' = 'info', customDuration?: number) {
    const id = `toast-${toastId++}`;
    const duration = customDuration ?? DURATIONS[type];
    
    toasts.value.push({
      id,
      message,
      type,
      duration,
    });
    
    return id;
  }

  // Convenience methods
  function showError(message: string, duration?: number) {
    return showToast(message, 'error', duration);
  }

  function showSuccess(message: string, duration?: number) {
    return showToast(message, 'success', duration);
  }

  function showInfo(message: string, duration?: number) {
    return showToast(message, 'info', duration);
  }

  // Remove a toast by ID
  function closeToast(id: string) {
    const index = toasts.value.findIndex(toast => toast.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  // Clear all toasts
  function clearAllToasts() {
    toasts.value = [];
  }

  return {
    toasts,
    showToast,
    showError,
    showSuccess,
    showInfo,
    closeToast,
    clearAllToasts
  };
}

import { ref } from 'vue'

export type NotificationType = 'error' | 'info' | 'success'

interface Notification {
  show: boolean
  message: string
  type: NotificationType
  timeout: number | null
}

export function useNotification() {
  const notification = ref<Notification>({
    show: false,
    message: '',
    type: 'error',
    timeout: null
  })

  function showNotification(message: string, type: NotificationType = 'error') {
    // Clear any existing timeout
    if (notification.value.timeout) {
      clearTimeout(notification.value.timeout)
    }
    
    // Set notification 
    notification.value = {
      show: true,
      message,
      type,
      timeout: null
    }
    
    // Auto hide after 5 seconds
    notification.value.timeout = window.setTimeout(() => {
      hideNotification()
    }, 5000) as unknown as number
  }

  function hideNotification() {
    notification.value.show = false
  }

  return {
    notification,
    showNotification,
    hideNotification
  }
}

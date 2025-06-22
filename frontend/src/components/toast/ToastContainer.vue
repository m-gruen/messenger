<script setup lang="ts">
import Toast, { type ToastProps } from './Toast.vue';

defineProps<{
  toasts: ToastProps[]
}>();

const emit = defineEmits<{
  (e: 'close', id: string): void;
}>();
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col items-end">
    <TransitionGroup
      name="toast"
      tag="div"
      class="flex flex-col items-end"
    >
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        v-bind="toast"
        @close="emit('close', $event)"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>

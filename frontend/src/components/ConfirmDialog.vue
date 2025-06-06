<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, toRefs } from 'vue';
import { Button } from '@/components/ui/button';

interface Props {
  show: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive';
}

interface Emits {
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'update:show', value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  confirmVariant: 'destructive'
});

const { show, title, message, confirmLabel, cancelLabel, confirmVariant } = toRefs(props);

const emit = defineEmits<Emits>();

const dialogRef = ref<HTMLDivElement | null>(null);

const handleConfirm = () => {
  emit('confirm');
  emit('update:show', false);
};

const handleCancel = () => {
  emit('cancel');
  emit('update:show', false);
};

const handleClickOutside = (event: MouseEvent) => {
  if (dialogRef.value && !dialogRef.value.contains(event.target as Node)) {
    handleCancel();
  }
};

const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleCancel();
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleEscKey);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('keydown', handleEscKey);
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
    <div ref="dialogRef" class="bg-card rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-border">
      <!-- Header -->
      <div class="p-5 border-b border-border">
        <h2 class="text-xl font-bold text-foreground">{{ title }}</h2>
      </div>
      
      <!-- Content -->
      <div class="p-6">
        <p class="text-muted-foreground">{{ message }}</p>
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t border-border flex justify-end space-x-3">
        <Button variant="outline" @click="handleCancel">{{ cancelLabel }}</Button>
        <Button :variant="confirmVariant" @click="handleConfirm">{{ confirmLabel }}</Button>
      </div>
    </div>
  </div>
</template>

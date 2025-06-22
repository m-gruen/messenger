<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, toRefs, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Check, Trash2 } from 'lucide-vue-next';

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

const confirmIcon = computed(() => {
  return confirmVariant.value === 'destructive' ? Trash2 : Check;
});

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleEscKey);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('keydown', handleEscKey);
});
</script>

<style scoped>
/* Animations */
.animate-fade-in {
  animation: fadeIn 0.3s ease forwards;
}

.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, 
             shakeEffect 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.95) translateY(10px); 
  }
  to { 
    opacity: 1;
    transform: scale(1) translateY(0); 
  }
}

@keyframes shakeEffect {
  0% { transform: translateX(0); }
  15% { transform: translateX(-5px); }
  30% { transform: translateX(5px); }
  45% { transform: translateX(-3px); }
  60% { transform: translateX(3px); }
  75% { transform: translateX(-1px); }
  90% { transform: translateX(1px); }
  100% { transform: translateX(0); }
}

/* Shadow enhancement */
.shadow-2xl {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 40px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* Add glow effects based on dialog type */
:deep([class*="from-rose-500"]) ~ .shadow-2xl {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 40px rgba(0, 0, 0, 0.15),
    0 0 20px rgba(244, 63, 94, 0.15);
}

:deep([class*="from-violet-500"]) ~ .shadow-2xl {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 40px rgba(0, 0, 0, 0.15),
    0 0 20px rgba(139, 92, 246, 0.15);
}

/* Backdrop blur */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}
</style>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
    <div 
      ref="dialogRef" 
      class="bg-gradient-to-b from-card to-card/90 rounded-xl max-w-md w-full overflow-hidden border border-violet-300/20 dark:border-violet-800/30 shadow-2xl animate-scale-in relative"
    >
      <!-- Top accent bar -->
      <div class="h-1.5 w-full bg-gradient-to-r" :class="[
        confirmVariant === 'destructive' 
          ? 'from-rose-500 to-red-600' 
          : 'from-violet-500 to-purple-600'
      ]"></div>
      
      <!-- Close button -->
      <button 
        @click="handleCancel" 
        class="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" 
        aria-label="Close"
      >
        <X class="h-5 w-5" />
      </button>
      
      <!-- Header -->
      <div class="p-6 pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg" :class="[
            confirmVariant === 'destructive' 
              ? 'bg-rose-100 dark:bg-rose-900/30' 
              : 'bg-violet-100 dark:bg-violet-900/30'
          ]">
            <AlertTriangle 
              class="h-5 w-5" 
              :class="[
                confirmVariant === 'destructive' 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : 'text-violet-600 dark:text-violet-400'
              ]" 
            />
          </div>
          <h2 class="text-xl font-bold">{{ title }}</h2>
        </div>
      </div>
      
      <!-- Content -->
      <div class="px-6 py-4">
        <div class="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/30">
          <p class="text-slate-600 dark:text-slate-300">{{ message }}</p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-5 border-t border-slate-200 dark:border-slate-700/50 flex justify-end space-x-3 bg-slate-50/50 dark:bg-slate-800/30">
        <Button 
          variant="outline" 
          size="sm"
          class="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
          @click="handleCancel"
        >
          <X class="h-4 w-4 mr-1.5" />
          {{ cancelLabel }}
        </Button>
        <Button 
          :variant="confirmVariant"
          size="sm"
          :class="[
            confirmVariant === 'destructive' 
              ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg hover:shadow-rose-500/20' 
              : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg hover:shadow-violet-500/20'
          ]"
          class="transition-all duration-200"
          @click="handleConfirm"
        >
          <component :is="confirmIcon" class="h-4 w-4 mr-1.5" />
          {{ confirmLabel }}
        </Button>
      </div>
    </div>
  </div>
</template>

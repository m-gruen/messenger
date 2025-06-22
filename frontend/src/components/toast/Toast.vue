<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-vue-next';

export interface ToastProps {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
  duration: number;
}

const props = defineProps<ToastProps>();
const emit = defineEmits<{
  (e: 'close', id: string): void;
}>();

// Progress state for the timer bar
const progress = ref(100);
const timer = ref<number | null>(null);
const remainingTime = ref<number>(props.duration);
const isPaused = ref(false);

// Computed properties for styling
const toastClasses = computed(() => {
  return {
    'border-red-400 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200': props.type === 'error',
    'border-green-400 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200': props.type === 'success',
    'border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200': props.type === 'info'
  };
});

const progressBarClasses = computed(() => {
  return {
    'bg-red-500': props.type === 'error',
    'bg-green-500': props.type === 'success',
    'bg-blue-500': props.type === 'info'
  };
});

const toastIcon = computed(() => {
  switch (props.type) {
    case 'error':
      return AlertCircle;
    case 'success':
      return CheckCircle;
    case 'info':
      return Info;
    default:
      return Info;
  }
});

// Handle toast timer and progress bar
const startTimer = () => {
  if (timer.value) clearInterval(timer.value);
  
  const updateInterval = 10; // Update progress every 10ms for smooth animation
  const step = (updateInterval / props.duration) * 100;
  
  timer.value = window.setInterval(() => {
    progress.value -= step;
    remainingTime.value -= updateInterval;
    
    if (progress.value <= 0) {
      if (timer.value) clearInterval(timer.value);
      emit('close', props.id);
    }
  }, updateInterval);
};

const pauseTimer = () => {
  if (timer.value) {
    clearInterval(timer.value);
    isPaused.value = true;
  }
};

const resumeTimer = () => {
  isPaused.value = false;
  startTimer();
};

const closeToast = () => {
  if (timer.value) clearInterval(timer.value);
  emit('close', props.id);
};

// Start timer when component mounts
onMounted(() => {
  startTimer();
});

// Clean up timer on unmount
onBeforeUnmount(() => {
  if (timer.value) clearInterval(timer.value);
});

// Watch for type changes to reset timer with appropriate duration
watch(() => props.type, () => {
  if (timer.value) clearInterval(timer.value);
  startTimer();
});
</script>

<template>
  <div 
    class="mb-2 w-full max-w-xs rounded-md border shadow-lg overflow-hidden transition-all transform"
    :class="toastClasses"
    @mouseenter="pauseTimer"
    @mouseleave="resumeTimer"
  >
    <div class="flex p-4">
      <div class="flex-shrink-0 mr-3">
        <component :is="toastIcon" class="w-5 h-5" />
      </div>
      <div class="flex-1">
        <p class="text-sm font-medium">{{ message }}</p>
      </div>
      <div class="ml-3 flex-shrink-0">
        <button 
          @click="closeToast" 
          class="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
          :class="{
            'focus:ring-red-500': type === 'error',
            'focus:ring-green-500': type === 'success',
            'focus:ring-blue-500': type === 'info'
          }"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>
    
    <!-- Progress bar -->
    <div class="h-1 w-full bg-gray-200 dark:bg-gray-700">
      <div 
        class="h-full transition-all ease-linear" 
        :class="progressBarClasses" 
        :style="`width: ${progress}%`"
      ></div>
    </div>
  </div>
</template>

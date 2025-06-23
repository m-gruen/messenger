<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { MicOff, Pause, PlayCircle, Send, StopCircle, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useToast } from '@/composables/useToast';

// Get toast functions
const { showError } = useToast();

interface Props {
  show: boolean;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'send', audioBlob: Blob, duration: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Recording state
const isRecording = ref(false);
const isPaused = ref(false);
const recordingTime = ref(0);
const timerInterval = ref<number | null>(null);
const audioChunks = ref<Blob[]>([]);
const mediaRecorder = ref<MediaRecorder | null>(null);
const stream = ref<MediaStream | null>(null);
const audioURL = ref<string | null>(null);
const isPlayingPreview = ref(false);
const audioPreview = ref<HTMLAudioElement | null>(null);

// Computed properties
const formattedTime = computed(() => {
  const minutes = Math.floor(recordingTime.value / 60);
  const seconds = recordingTime.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const canSend = computed(() => {
  return audioChunks.value.length > 0 && !isRecording.value;
});

// Methods
const handleClose = () => {
  stopRecording();
  cleanupResources();
  emit('update:show', false);
};

const startRecording = async () => {
  try {
    // Request microphone access
    stream.value = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Clear previous recording data
    audioChunks.value = [];
    recordingTime.value = 0;
    
    // Try different MIME types in order of preference
    const mimeTypes = [
      'audio/mp3',
      'audio/mpeg',
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/wav',
      ''  // Empty string will use browser default
    ];
    
    // Find first supported MIME type
    let selectedType = '';
    for (const type of mimeTypes) {
      if (!type || MediaRecorder.isTypeSupported(type)) {
        selectedType = type;
        break;
      }
    }
    
    console.log('Using audio MIME type:', selectedType || 'browser default');
    
    // Create media recorder with options
    const options: MediaRecorderOptions = {
      audioBitsPerSecond: 128000
    };
    
    // Only add mimeType if we found a supported one (empty string is invalid)
    if (selectedType) {
      options.mimeType = selectedType;
    }
    
    try {
      mediaRecorder.value = new MediaRecorder(stream.value, options);
    } catch (e) {
      console.warn('Recording setup failed with selected codec, using default codec', e);
      mediaRecorder.value = new MediaRecorder(stream.value);
    }
    
    // Start recording with timeslice to get data during recording (not just on stop)
    // This ensures we get data chunks every 1 second (1000ms)
    mediaRecorder.value.start(1000);
    isRecording.value = true;
    isPaused.value = false;
    
    // Start timer
    startTimer();
    
    // Listen for data available event
    mediaRecorder.value.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.value.push(event.data);
        // Create preview periodically as we receive chunks
        if (!isRecording.value) {
          createAudioPreview();
        }
      }
    });
    
    // Handle recording stop
    mediaRecorder.value.addEventListener('stop', () => {
      createAudioPreview();
    });
  } catch (error) {
    console.error('Error accessing microphone:', error);
    emit('update:show', false);
    showError('Could not access microphone. Please check your permissions.');
  }
};

const pauseRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.pause();
    isPaused.value = true;
    stopTimer();
  }
};

const resumeRecording = () => {
  if (mediaRecorder.value && isPaused.value) {
    mediaRecorder.value.resume();
    isPaused.value = false;
    startTimer();
  }
};

const stopRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop();
    isRecording.value = false;
    isPaused.value = false;
    stopTimer();
    
    // Stop audio tracks
    if (stream.value) {
      stream.value.getAudioTracks().forEach(track => track.stop());
    }
  }
};

const createAudioPreview = () => {
  if (audioChunks.value.length === 0) return;
  
  // Use the same MIME type as the recorder
  const mimeType = mediaRecorder.value?.mimeType || '';
  console.log('Creating audio preview with MIME type:', mimeType || 'default');
  
  // Create audio blob - use the recorder's MIME type if available
  const audioBlob = new Blob(audioChunks.value, mimeType ? { type: mimeType } : undefined);
  
  // Check blob size
  console.log('Audio blob size:', audioBlob.size, 'bytes');
  if (audioBlob.size < 100) {
    console.warn('Warning: Audio blob size is suspiciously small');
  }
  
  // Create URL for preview
  if (audioURL.value) {
    URL.revokeObjectURL(audioURL.value);
  }
  
  audioURL.value = URL.createObjectURL(audioBlob);
  console.log('Created audio URL:', audioURL.value);
  
  // Create audio element for preview
  if (!audioPreview.value) {
    audioPreview.value = new Audio();
    
    // Add event listeners
    audioPreview.value.addEventListener('ended', () => {
      isPlayingPreview.value = false;
    });
    
    audioPreview.value.addEventListener('error', (e) => {
      console.error('Audio preview error:', e);
      showError('Failed to play audio preview. Your browser might not support this audio format.');
      isPlayingPreview.value = false;
    });
    
    // Add loadedmetadata listener to get duration
    audioPreview.value.addEventListener('loadedmetadata', () => {
      if (audioPreview.value && !isNaN(audioPreview.value.duration)) {
        console.log('Audio preview duration from metadata:', audioPreview.value.duration);
      }
    });
  }
  
  // Set the source and load the audio
  audioPreview.value.src = audioURL.value;
  audioPreview.value.load();
};

const playPausePreview = () => {
  if (!audioPreview.value || !audioURL.value) return;
  
  if (isPlayingPreview.value) {
    audioPreview.value.pause();
    isPlayingPreview.value = false;
  } else {
    // Use a promise to handle play failures (common on mobile)
    audioPreview.value.play()
      .then(() => {
        isPlayingPreview.value = true;
      })
      .catch(err => {
        console.error('Failed to play audio preview:', err);
        showError('Failed to play audio preview');
        isPlayingPreview.value = false;
      });
  }
};

const handleSend = () => {
  if (audioChunks.value.length === 0) return;
  
  // Get mime type from recorder
  const mimeType = mediaRecorder.value?.mimeType || '';
  
  // Create audio blob
  const audioBlob = new Blob(audioChunks.value, mimeType ? { type: mimeType } : undefined);
  
  // Check if we have a valid audio blob
  if (audioBlob.size < 100) {
    showError('Recording failed: Audio file is too small or empty.');
    return;
  }
  
  // Get duration - try to get it from the audio preview element if available
  let finalDuration = 0;
  
  if (audioPreview.value && !isNaN(audioPreview.value.duration) && isFinite(audioPreview.value.duration)) {
    finalDuration = audioPreview.value.duration;
    console.log('Using audio duration from preview element:', finalDuration);
  } else if (recordingTime.value > 0) {
    finalDuration = recordingTime.value;
    console.log('Using recorded time as duration:', finalDuration);
  }
  
  console.log('Sending audio message:', {
    mimeType: mimeType || 'browser default',
    size: audioBlob.size,
    duration: finalDuration,
    chunks: audioChunks.value.length
  });
  
  // Send audio message
  emit('send', audioBlob, finalDuration);
  
  // Close dialog
  handleClose();
};

const startTimer = () => {
  if (timerInterval.value) return;
  
  timerInterval.value = window.setInterval(() => {
    recordingTime.value++;
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
};

const cleanupResources = () => {
  // Stop timer
  stopTimer();
  
  // Stop all media tracks
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
    stream.value = null;
  }
  
  // Revoke audio URL
  if (audioURL.value) {
    URL.revokeObjectURL(audioURL.value);
    audioURL.value = null;
  }
  
  // Reset state
  mediaRecorder.value = null;
  audioChunks.value = [];
  isRecording.value = false;
  isPaused.value = false;
  recordingTime.value = 0;
  isPlayingPreview.value = false;
};

// Start recording when component is mounted
onMounted(() => {
  if (props.show) {
    startRecording();
  }
});

// Cleanup when unmounting
onBeforeUnmount(() => {
  cleanupResources();
});
</script>

<template>
  <teleport to="#portal-target">
    <div v-if="show" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
      <div 
        class="bg-gradient-to-b from-card to-card/90 rounded-xl max-w-md w-full overflow-hidden border border-violet-300/20 dark:border-violet-800/30 shadow-2xl animate-scale-in relative flex flex-col"
      >
        <!-- Top accent bar -->
        <div class="h-1.5 w-full bg-gradient-to-r from-violet-500 to-purple-600"></div>
        
        <!-- Close button -->
        <button 
          @click="handleClose" 
          class="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors z-10" 
          aria-label="Close"
        >
          <X class="h-5 w-5" />
        </button>
        
        <!-- Header -->
        <div class="p-6 pb-3">
          <h2 class="text-xl font-bold">Voice Message</h2>
        </div>
        
        <!-- Recording Interface -->
        <div class="p-8 flex flex-col items-center justify-center">
          <!-- Recording Time -->
          <div class="text-4xl font-bold mb-8">{{ formattedTime }}</div>
          
          <!-- Visualization (simple pulsing circle when recording) -->
          <div class="mb-8 relative">
            <div v-if="isRecording && !isPaused" class="recording-pulse absolute inset-0 rounded-full"></div>
            <div class="bg-indigo-600 rounded-full w-16 h-16 flex items-center justify-center">
              <MicOff v-if="!isRecording && audioChunks.length === 0" class="h-8 w-8 text-white" />
              <StopCircle v-else-if="isRecording" class="h-8 w-8 text-white" />
              <PlayCircle v-else class="h-8 w-8 text-white" />
            </div>
          </div>
          
          <!-- Control Buttons -->
          <div class="flex gap-4">
            <!-- Recording State Buttons -->
            <template v-if="isRecording">
              <Button 
                @click="stopRecording" 
                variant="destructive"
                size="lg"
                class="px-6"
              >
                <StopCircle class="h-5 w-5 mr-2" />
                Stop
              </Button>
              
              <Button 
                @click="isPaused ? resumeRecording() : pauseRecording()" 
                variant="outline"
                size="lg"
                class="px-6"
              >
                <Pause v-if="!isPaused" class="h-5 w-5 mr-2" />
                <PlayCircle v-else class="h-5 w-5 mr-2" />
                {{ isPaused ? 'Continue' : 'Pause' }}
              </Button>
            </template>
            
            <!-- Preview State Buttons -->
            <template v-else-if="audioURL">
              <Button 
                @click="startRecording" 
                variant="outline"
                size="lg"
                class="px-6"
              >
                <StopCircle class="h-5 w-5 mr-2" />
                Record New
              </Button>
              
              <Button 
                @click="playPausePreview" 
                variant="outline"
                size="lg"
                class="px-6"
              >
                <Pause v-if="isPlayingPreview" class="h-5 w-5 mr-2" />
                <PlayCircle v-else class="h-5 w-5 mr-2" />
                {{ isPlayingPreview ? 'Pause' : 'Play' }}
              </Button>
              
              <Button 
                @click="handleSend" 
                variant="default"
                size="lg"
                class="px-6 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                :disabled="!canSend"
              >
                <Send class="h-5 w-5 mr-2" />
                Send
              </Button>
            </template>
            
            <!-- Initial State -->
            <template v-else>
              <Button 
                @click="startRecording" 
                variant="default"
                size="lg"
                class="px-6 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                <StopCircle class="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
/* Animations */
.animate-fade-in {
  animation: fadeIn 0.3s ease forwards;
}

.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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

/* Recording pulse animation */
.recording-pulse {
  animation: pulse 1.5s ease-in-out infinite;
  background: rgba(79, 70, 229, 0.3);
  border-radius: 50%;
  transform: scale(1);
  box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.5);
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.5);
  }
  
  70% {
    transform: scale(1.5);
    box-shadow: 0 0 0 10px rgba(79, 70, 229, 0);
  }
  
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
  }
}
</style>

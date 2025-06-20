<script setup lang="ts">
import { Play, Pause, Download } from 'lucide-vue-next'
import { ref, watch, onMounted } from 'vue'
import type { IMessage } from '@/models/message-model'
import { formatTimeForMessage, getAudioSource, getAudioName, getAudioDuration, formatAudioTime } from './MessageUtils'

const props = defineProps<{
  message: IMessage
  showTimestamp: boolean
}>()

const audioState = ref({
  messageId: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0
})

// Extract audio metadata from message content if available
function getAudioDurationFromMessage(): number {
  return getAudioDuration(props.message)
}

// Initial setup for audio duration
onMounted(() => {
  const initialDuration = getAudioDurationFromMessage()
  if (initialDuration > 0) {
    audioState.value.duration = initialDuration
  }
})

function toggleAudioPlayback(): void {
  const audio = document.querySelector(`audio[data-message-id="${props.message.mid}"]`) as HTMLAudioElement
  if (!audio) return

  if (audio.paused) {
    // Stop any other playing audio first
    document.querySelectorAll('audio').forEach(a => a.pause())
    audio.play()
    audioState.value.messageId = props.message.mid
    audioState.value.isPlaying = true
  } else {
    audio.pause()
    audioState.value.isPlaying = false
  }
}

function handleTimeUpdate(event: Event): void {
  const audio = event.target as HTMLAudioElement
  if (audio && props.message.mid === audioState.value.messageId) {
    audioState.value.currentTime = audio.currentTime
  }
}

function handleAudioMetadata(event: Event): void {
  const audio = event.target as HTMLAudioElement
  if (audio && audio.duration) {
    // Always update duration for the current message's audio element
    audioState.value.duration = audio.duration
    
    // If this is the active audio, update the message state
    if (props.message.mid === audioState.value.messageId) {
      audioState.value.currentTime = audio.currentTime
    }
  }
}

function handleAudioEnded(): void {
  if (audioState.value.messageId === props.message.mid) {
    audioState.value.isPlaying = false
    audioState.value.currentTime = 0
  }
}

function setAudioPosition(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement
  if (!target) return
  const audio = document.querySelector(`audio[data-message-id="${props.message.mid}"]`) as HTMLAudioElement
  if (!audio) return
  
  const rect = target.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const newTime = percentage * audio.duration
  
  audio.currentTime = newTime
  audioState.value.currentTime = newTime
  
  if (audio.paused) {
    audio.play()
    audioState.value.messageId = props.message.mid
    audioState.value.isPlaying = true
  }
}

// Reset audio state when component unmounts
watch(() => props.message.mid, () => {
  if (audioState.value.messageId === props.message.mid) {
    const audio = document.querySelector(`audio[data-message-id="${props.message.mid}"]`) as HTMLAudioElement
    if (audio) {
      audio.pause()
    }
    audioState.value.messageId = 0 // Changed from string to number
    audioState.value.isPlaying = false
    audioState.value.currentTime = 0
    audioState.value.duration = 0
  }
})

// Get the original filename for download if available
function getAudioFilename(message: IMessage): string {
  return getAudioName(message)
}
</script>

<template>
  <div class="audio-container" :class="[showTimestamp ? 'has-timestamp' : '']">
    <div class="audio-player">
      <audio 
        :src="getAudioSource(message) || ''" 
        :data-message-id="message.mid" 
        preload="metadata"
        class="hidden" 
        @timeupdate="handleTimeUpdate($event)"
        @loadedmetadata="handleAudioMetadata($event)" 
        @ended="handleAudioEnded()"
      ></audio>
      <div class="custom-audio-player">
        <button 
          @click="toggleAudioPlayback()" 
          class="audio-control-button flex-shrink-0"
          :class="{ 'is-playing': audioState.messageId === props.message.mid && audioState.isPlaying }"
        >
          <Play v-if="audioState.messageId !== message.mid || !audioState.isPlaying" class="h-8 w-8" />
          <Pause v-else class="h-8 w-8" />
        </button>
        <div class="audio-progress-container ml-2 flex-1">
          <div class="audio-progress-bar-bg" @click="setAudioPosition($event)">
            <div 
              class="audio-progress-bar" 
              :style="{
                width: audioState.messageId === props.message.mid 
                    ? `${(audioState.currentTime / audioState.duration) * 100}%` 
                    : '0%' 
              }"
            ></div>
          </div>
          <div class="audio-time-display text-xs">
            <span>{{
              audioState.messageId === props.message.mid
                ? formatAudioTime(audioState.currentTime)
                : '0:00'
            }}</span>
            <span class="mx-1">/</span>
            <span>{{ formatAudioTime(audioState.duration) }}</span>
          </div>
        </div>
        <a 
          :href="getAudioSource(message) || ''"
          :download="getAudioFilename(message)"
          class="audio-download-button ml-2" 
          title="Download audio" 
          @click.stop
        >
          <Download class="h-5 w-5" />
        </a>
      </div>
      <span
        v-if="showTimestamp"
        class="text-xs opacity-70 message-timestamp audio-timestamp"
      >
        {{ formatTimeForMessage(message.timestamp) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.audio-container {
  position: relative;
  width: 100%;
  min-width: 280px;
}

.audio-player {
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  position: relative;
  padding: 8px;
}

.audio-timestamp {
  position: relative;
  display: block;
  text-align: right;
  margin-top: 4px;
  padding-right: 4px;
  z-index: 2;
}

.custom-audio-player {
  display: flex;
  align-items: center;
}

.audio-control-button {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
}

.audio-control-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.audio-control-button.is-playing {
  background-color: rgba(59, 130, 246, 0.5);
}

.audio-progress-container {
  display: flex;
  flex-direction: column;
  min-width: 160px;
}

.audio-progress-bar-bg {
  height: 6px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
  margin: 4px 0;
}

.audio-progress-bar {
  height: 100%;
  background-color: rgba(59, 130, 246, 0.8);
  border-radius: inherit;
  position: relative;
}

.audio-time-display {
  margin-top: 6px;
  display: flex;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
}

.audio-download-button {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.audio-download-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>

<script setup lang="ts">
import { defineProps, computed, ref, onMounted, nextTick, watch } from 'vue'
import type { IMessage } from '@/models/message-model'
import { MessageSquare, ArrowDown } from 'lucide-vue-next'
import { DateFormatService } from '@/services/date-format.service'

const props = defineProps({
  messages: {
    type: Array as () => IMessage[],
    default: () => []
  },
  currentUserId: {
    type: Number,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: undefined
  },
  contactUsername: {
    type: String,
    required: true
  }
})

// Add emits for loading more messages and image viewing
const emit = defineEmits<{
  'load-more-messages': [],
  'view-image': [src: string | null]
}>();

// Scroll tracking refs
const messageListRef = ref<HTMLElement | null>(null);
const isViewingOlderMessages = ref(false);
// Update scroll threshold to 300px as requested
const scrollThreshold = 3000;
// Add a new ref for smooth transitions
const notificationOpacity = ref(0);

// Track if we're at the top of the message list
const isLoadingMore = ref(false);
const loadMoreThreshold = 100; // px from top to trigger loading more

// Enhanced scroll handler to create smooth transitions
const handleScroll = () => {
  if (!messageListRef.value) return;

  const { scrollTop, scrollHeight, clientHeight } = messageListRef.value;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  const distanceFromTop = scrollTop;

  // Check if we're at the top and should load more messages
  if (distanceFromTop < loadMoreThreshold && !isLoadingMore.value && !props.isLoading) {
    isLoadingMore.value = true;
    emit('load-more-messages');
    
    // Reset after a reasonable timeout in case the load operation fails
    setTimeout(() => {
      isLoadingMore.value = false;
    }, 3000);
  }

  // Check if we're viewing older messages
  if (distanceFromBottom > scrollThreshold) {
    // If we're beyond the threshold, start showing the notification
    isViewingOlderMessages.value = true;
    // Calculate opacity based on how far beyond threshold (with a max of 1)
    const extraScroll = distanceFromBottom - scrollThreshold;
    notificationOpacity.value = Math.min(1, extraScroll / 100);
  } else {
    isViewingOlderMessages.value = false;
    notificationOpacity.value = 0;
  }
};

// Function to scroll to the latest messages
const scrollToLatest = () => {
  if (!messageListRef.value) return;

  messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  // Immediately reset notification state when manually scrolling to bottom
  isViewingOlderMessages.value = false;
  notificationOpacity.value = 0;
};

// Auto-scroll to bottom when new messages arrive
watch(() => props.messages, async (newMessages, oldMessages) => {
  // Only auto-scroll if we're already at the bottom or there are new messages
  if (!isViewingOlderMessages.value || (oldMessages && newMessages && newMessages.length > oldMessages.length)) {
    await nextTick();
    scrollToLatest();
  }
}, { deep: true });

// Reset scroll state when switching chats
watch(() => props.contactUsername, () => {
  isViewingOlderMessages.value = false;
  notificationOpacity.value = 0;
  
  // Need to wait for DOM to update before scrolling to bottom
  nextTick(() => {
    scrollToLatest();
  });
});

// Set up scroll event listener
onMounted(() => {
  if (messageListRef.value) {
    messageListRef.value.addEventListener('scroll', handleScroll);
    // Initial scroll to bottom
    scrollToLatest();
  }
});

// Group messages by date and by sender & minute
const messageGroups = computed(() => {
  if (!props.messages.length) return []

  const groups: { dateLabel: string, dateValue: string, messages: IMessage[], minuteGroups: Array<{ sender: number, messages: IMessage[], minute: string }> }[] = []
  let currentDate: string | null = null
  let currentMessages: IMessage[] = []

  // Create a copy of messages and sort by timestamp (oldest first)
  // This is needed because the UI displays messages in reverse order (newest at bottom)
  const sortedMessages = [...props.messages].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime()
    const dateB = new Date(b.timestamp).getTime()
    return dateA - dateB
  })

  // Process each message
  for (const message of sortedMessages) {
    const timestamp = new Date(message.timestamp)
    const messageDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate())
    const dateString = messageDate.toISOString().split('T')[0]

    // Check if we need to start a new group
    if (currentDate !== dateString) {
      if (currentDate !== null) {
        // Add the previous group to our list
        groups.push({
          dateLabel: currentMessages[0] ? DateFormatService.formatRelativeDate(new Date(currentMessages[0].timestamp)) : '',
          dateValue: currentDate,
          messages: [...currentMessages],
          minuteGroups: createMinuteGroups(currentMessages)
        })
      }

      // Start a new group
      currentDate = dateString
      currentMessages = [message]
    } else {
      // Add to the current group
      currentMessages.push(message)
    }
  }

  // Don't forget to add the last group
  if (currentMessages.length > 0) {
    groups.push({
      dateLabel: currentMessages[0] ? DateFormatService.formatRelativeDate(new Date(currentMessages[0].timestamp)) : '',
      dateValue: currentDate!,
      messages: [...currentMessages],
      minuteGroups: createMinuteGroups(currentMessages)
    })
  }

  return groups
})

// Helper function to create minute-based message groups
function createMinuteGroups(messages: IMessage[]) {
  const minuteGroups: Array<{ sender: number, messages: IMessage[], minute: string }> = []
  let currentSender: number | null = null
  let currentMinute: string | null = null
  let currentGroup: IMessage[] = []

  for (const message of messages) {
    const timestamp = new Date(message.timestamp)
    const minute = `${timestamp.getHours()}:${timestamp.getMinutes()}`

    // Start a new group if the minute changes or the sender changes
    if (currentMinute !== minute || currentSender !== message.sender_uid) {
      if (currentMinute !== null) {
        // Add the previous group to our list
        minuteGroups.push({
          sender: currentSender!,
          minute: currentMinute,
          messages: [...currentGroup]
        })
      }

      // Start a new group
      currentMinute = minute
      currentSender = message.sender_uid
      currentGroup = [message]
    } else {
      // Add to the current group
      currentGroup.push(message)
    }
  }

  // Add the last group
  if (currentGroup.length > 0 && currentMinute !== null) {
    minuteGroups.push({
      sender: currentSender!,
      minute: currentMinute,
      messages: [...currentGroup]
    })
  }

  return minuteGroups
}

// Determine message position in its minute-group
function getMessagePosition(message: IMessage, group: { sender: number, messages: IMessage[], minute: string }) {
  if (group.messages.length === 1) return 'single'

  const index = group.messages.findIndex(m => m.mid === message.mid)
  if (index === 0) return 'first'
  if (index === group.messages.length - 1) return 'last'
  return 'middle'
}

// Format time for message timestamp display
function formatTimeForMessage(dateString: string | Date | undefined): string {
  return DateFormatService.formatMessageTime(dateString) || '';
}

// Emoji detection and styling utilities
function isEmojiOnly(text: string): boolean {
  // Regex to detect emoji characters
  const emojiRegex = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Emoji_Component}|\s)+$/u;
  return emojiRegex.test(text);
}

function countEmojis(text: string): number {
  // Count emojis in a string, accounting for skin tone modifiers and ZWJ sequences
  // This is a simplified approach - emoji counting can be complex due to ZWJ sequences
  // and variation selectors
  
  // Match emoji characters or emoji sequences
  const emojiMatches = text.match(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\p{Emoji_Modifier}|\u200D\p{Emoji})*|\s+/gu);
  return emojiMatches ? emojiMatches.filter(match => match.trim().length > 0).length : 0;
}

function getEmojiMessageStyle(text: string): string | null {
  if (!text || !isEmojiOnly(text)) {
    return null; // Not an emoji-only message
  }
  
  const count = countEmojis(text);
  
  if (count === 1) {
    return 'emoji-only emoji-single'; // Single emoji, very large
  } else if (count <= 3) {
    return 'emoji-only emoji-few'; // 2-3 emojis, large
  } else if (count <= 8) {
    return 'emoji-only emoji-several'; // 4-8 emojis, medium
  } else {
    return null; // 9+ emojis, normal message styling
  }
}

// Parse message content to detect JSON structure
function parseMessageContent(content: string): { type: string, content: string, format?: string } {
  if (!content) {
    return { type: 'text', content: '' };
  }

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      return parsed;
    }
  } catch (e) {
    // If parsing fails, make a second attempt with escaped JSON
    try {
      // Some messages might be double-encoded JSON strings
      const doubleDecoded = JSON.parse(JSON.stringify(content));
      const parsed = JSON.parse(doubleDecoded);
      if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        return parsed;
      }
    } catch (nestedError) {
      console.log('Failed to parse message content as JSON:', e);
      // If all parsing fails, it's a regular text message or potential error
    }
  }
  
  // Default to text if not valid JSON or missing type
  return { type: 'text', content: content };
}

// Check if a message contains an image
function isImageMessage(content: string): boolean {
  const parsed = parseMessageContent(content);
  return parsed.type === 'image';
}

// Get content for rendering
function getMessageContent(message: IMessage): string {
  const parsed = parseMessageContent(message.content);
  return parsed.type === 'text' ? parsed.content : '';
}

// Get image source for image messages
function getImageSource(message: IMessage): string | null {
  const parsed = parseMessageContent(message.content);
  if (parsed.type === 'image' && parsed.content && parsed.format) {
    return `data:${parsed.format};base64,${parsed.content}`;
  }
  return null;
}
</script>

<template>
  <div class="relative flex-1 overflow-y-auto p-4 bg-background/95 message-list-container custom-scrollbar"
    ref="messageListRef"
    style="background-image: url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4-1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4-1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E');">
    <!-- Viewing Older Messages Notification -->
    <div v-if="isViewingOlderMessages"
      class="fixed bg-zinc-900 text-white rounded-full px-4 py-2 z-20 flex items-center justify-between shadow-lg older-messages-notification"
      :style="{ opacity: notificationOpacity, bottom: '100px', left: '50%', transform: 'translateX(-50%)' }">
      <span class="text-sm">You're Viewing Older Messages</span>
      <button @click="scrollToLatest"
        class="ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3 py-1 text-xs flex items-center">
        <span>Jump To Present</span>
        <ArrowDown class="h-3 w-3 ml-1" />
      </button>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <div class="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
      <span class="ml-2">Loading messages...</span>
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-full">
      <div class="bg-destructive/10 text-destructive p-4 rounded-md max-w-[80%] text-center">
        <p class="font-medium">Error loading messages</p>
        <p>{{ error }}</p>
      </div>
    </div>

    <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
      <div class="bg-card p-6 rounded-lg shadow-lg">
        <MessageSquare class="h-12 w-12 mx-auto text-muted-foreground" />
        <p class="mt-4 text-muted-foreground">No messages yet with {{ contactUsername }}</p>
        <p class="mt-2 text-sm text-muted-foreground">Send a message to start the conversation</p>
      </div>
    </div>

    <div v-else class="flex flex-col space-y-6">
      <!-- Iterate through date groups -->
      <div v-for="group in messageGroups" :key="group.dateValue">
        <!-- Date header -->
        <div class="flex justify-center mb-4">
          <div class="bg-muted/70 text-muted-foreground text-xs px-4 py-1 rounded-full">
            {{ group.dateLabel }}
          </div>
        </div>

        <!-- Messages grouped by minute -->
        <div class="flex flex-col space-y-4">
          <!-- Each minute group -->
          <div v-for="(minuteGroup, groupIndex) in group.minuteGroups"
            :key="`${group.dateValue}-${minuteGroup.minute}-${groupIndex}`" class="flex flex-col" :class="{
              'items-end pr-2': minuteGroup.sender === currentUserId,
              'items-start pl-2': minuteGroup.sender !== currentUserId,
              'mb-1': true
            }">

            <!-- Messages in this minute group - reduced width from 80% to 75% -->
            <div class="flex flex-col" style="max-width: 75%;">
              <div v-for="(message, messageIndex) in minuteGroup.messages" :key="message.mid"
                :class="[
                  // Check if this is an emoji-only message
                  getEmojiMessageStyle(getMessageContent(message)) || 'px-3 py-2 shadow-sm inline-block',
                  
                  // Base styling
                  {
                    // Sender styles (you) - only if not emoji-only message
                    'bg-blue-600 text-white': message.sender_uid === currentUserId && !getEmojiMessageStyle(getMessageContent(message)),
                    // Receiver styles (other person) - only if not emoji-only message
                    'bg-zinc-800 text-white': message.sender_uid !== currentUserId && !getEmojiMessageStyle(getMessageContent(message)),

                    // Spacing between messages in the same group
                    'mb-0.5': messageIndex < minuteGroup.messages.length - 1,

                    // Self-align each message
                    'self-end': message.sender_uid === currentUserId,
                    'self-start': message.sender_uid !== currentUserId,

                    // Maximum width for messages
                    'max-w-message': true
                  },
                  // Only apply bubble styling for non-emoji messages
                  !getEmojiMessageStyle(getMessageContent(message)) ? [
                    // Single message (completely rounded)
                    getMessagePosition(message, minuteGroup) === 'single' ? 'message-bubble-rounded' : '',

                    // First message in group
                    getMessagePosition(message, minuteGroup) === 'first' && message.sender_uid === currentUserId ?
                      'message-bubble-rounded-top message-bubble-rounded-left message-bubble-bottom-left' : '',
                    getMessagePosition(message, minuteGroup) === 'first' && message.sender_uid !== currentUserId ?
                      'message-bubble-rounded-top message-bubble-rounded-right message-bubble-bottom-right' : '',

                    // Middle messages in group
                    getMessagePosition(message, minuteGroup) === 'middle' && message.sender_uid === currentUserId ?
                      'message-bubble-rounded-left' : '',
                    getMessagePosition(message, minuteGroup) === 'middle' && message.sender_uid !== currentUserId ?
                      'message-bubble-rounded-right' : '',

                    // Last message in group
                    getMessagePosition(message, minuteGroup) === 'last' && message.sender_uid === currentUserId ?
                      'message-bubble-rounded-bottom message-bubble-rounded-left message-bubble-top-left' : '',
                    getMessagePosition(message, minuteGroup) === 'last' && message.sender_uid !== currentUserId ?
                      'message-bubble-rounded-bottom message-bubble-rounded-right message-bubble-top-right' : ''
                  ] : []
                ]">
                <!-- Fixed message layout with only last line having padding for timestamp -->
                <div class="relative message-content">
                  <!-- Text message content -->
                  <p v-if="!isImageMessage(message.content)"
                    :class="[
                      'message-text', 
                      (getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') ? 'has-timestamp' : '',
                      // Apply emoji styling classes directly to text element if it's an emoji-only message
                      getEmojiMessageStyle(getMessageContent(message))
                    ]">
                    {{ getMessageContent(message) }}
                  </p>
                  
                  <!-- Image message content -->
                  <div v-else class="image-container"
                    :class="[(getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') ? 'has-timestamp' : '']">
                    <template v-if="getImageSource(message)">
                      <img 
                        :src="getImageSource(message) || ''" 
                        alt="Image message" 
                        class="rounded-lg max-w-full"
                        style="max-height: 300px;" 
                        @click="emit('view-image', getImageSource(message))"
                      />
                      <!-- Timestamp included directly in the image container for better positioning -->
                      <span
                        v-if="getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last'"
                        class="text-xs opacity-70 message-timestamp image-timestamp">
                        {{ formatTimeForMessage(message.timestamp) }}
                      </span>
                    </template>
                    <div v-else class="image-error p-2 text-destructive">
                      Image data could not be loaded
                    </div>
                  </div>

                  <!-- Show time only in single or last messages in a group (but not for images) -->
                  <span
                    v-if="(getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') && !isImageMessage(message.content)"
                    class="text-xs opacity-70 message-timestamp"
                    :class="{ 'emoji-timestamp': getEmojiMessageStyle(getMessageContent(message)) }">
                    {{ formatTimeForMessage(message.timestamp) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  /* Thin scrollbar */
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  /* Transparent background */
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(128, 128, 128, 0.4);
  /* Semi-transparent gray */
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(128, 128, 128, 0.6);
  /* Slightly more visible on hover */
}

/* Hide scrollbar buttons (arrows) - multiple approaches for different browsers */
.custom-scrollbar::-webkit-scrollbar-button {
  display: none;
  height: 0;
  width: 0;
}

.custom-scrollbar::-webkit-scrollbar-button:start:decrement,
.custom-scrollbar::-webkit-scrollbar-button:end:increment {
  display: none;
}

/* For Firefox */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
}

/* Additional override to ensure no buttons are shown */
.custom-scrollbar * {
  -ms-overflow-style: none;
  scrollbar-width: thin;
}

/* Custom message bubble styles with increased roundness */
.message-bubble-rounded {
  border-radius: 18px;
}

.message-bubble-rounded-left {
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
}

.message-bubble-rounded-right {
  border-top-right-radius: 18px;
  border-bottom-right-radius: 18px;
}

.message-bubble-rounded-top {
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
}

.message-bubble-rounded-bottom {
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
}

.message-bubble-top-left {
  border-top-left-radius: 18px;
}

.message-bubble-top-right {
  border-top-right-radius: 18px;
}

.message-bubble-bottom-left {
  border-bottom-left-radius: 18px;
}

.message-bubble-bottom-right {
  border-bottom-right-radius: 18px;
}

/* Timestamp positioning */
.message-content {
  min-width: 14px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  padding: 0;
}

/* Only add space for timestamp in messages that have it */
.message-text.has-timestamp::after {
  content: '';
  display: inline-block;
  width: 40px; /* Space for timestamp */
}

/* Remove the extra space for emoji-only messages with timestamps */
.emoji-only .message-text.has-timestamp::after {
  width: 0;
  display: none;
}

.message-timestamp {
  position: absolute;
  right: 3px;
  bottom: 0;
  margin: 0;
  padding: 0;
  font-size: 0.65rem;
  white-space: nowrap;
}

/* Control maximum width of messages */
.max-w-message {
  max-width: 100%;
}

/* Emoji-only message styling */
.emoji-only {
  background: transparent !important;
  box-shadow: none !important;
  padding: 2px !important;
}

/* Single emoji styling - very large */
.emoji-single {
  font-size: 4rem !important;
  line-height: 1.2;
  padding: 0.2rem !important;
}

/* Few emojis styling - large */
.emoji-few {
  font-size: 3rem !important;
  line-height: 1.2;
  padding: 0.2rem !important;
}

/* Several emojis styling - medium */
.emoji-several {
  font-size: 2rem !important;
  line-height: 1.3;
  padding: 0.2rem !important;
}

/* Emoji timestamp positioning */
.emoji-timestamp {
  position: absolute;
  color: rgba(155, 155, 155, 0.8) !important;
  bottom: -1.5em !important;
  right: 3px !important;
  font-size: 0.65rem;
}

/* Image styling */
.image-container {
  cursor: pointer;
  transition: transform 0.2s;
  margin: 2px 0;
  position: relative;
  padding-bottom: 18px; /* Add padding for timestamp */
}

.image-container img {
  border-radius: 12px;
}

.image-container:hover {
  transform: scale(1.02);
}

.image-timestamp {
  color: rgba(255, 255, 255, 0.9) !important;
  bottom: 4px !important;
  right: 6px !important;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 2px 5px;
  border-radius: 10px;
  font-size: 0.65rem;
}

.image-error {
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  font-size: 0.85rem;
}

/* Viewing older messages notification styling */
.older-messages-notification {
  animation: fadeIn 0.3s ease-in-out;
  transition: all 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
</style>

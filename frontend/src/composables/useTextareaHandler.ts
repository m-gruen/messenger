import { ref, nextTick } from 'vue'

export function useTextareaHandler() {
    const textareaRef = ref<HTMLTextAreaElement | null>(null)
    const message = ref('')

    // Adjust textarea height based on content
    function adjustTextareaHeight() {
        if (!textareaRef.value) return;

        // Reset height to auto to get the correct scrollHeight
        textareaRef.value.style.height = 'auto';

        // Set new height based on scrollHeight, but capped at 3 lines (~72px)
        const newHeight = Math.min(textareaRef.value.scrollHeight, 72);
        textareaRef.value.style.height = `${newHeight}px`;
    }

    // Handle Shift+Enter for line breaks, Enter to send
    function handleKeydown(e: KeyboardEvent, sendCallback: () => void) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendCallback();
        } else if (e.key === 'Enter' && e.shiftKey) {
            // Let the default behavior add a line break
            nextTick(() => {
                adjustTextareaHeight();
            });
        }
    }

    // Watch for input changes to adjust height
    function handleInput() {
        adjustTextareaHeight();
    }

    // Insert text at cursor position (used for emoji insertion)
    function insertTextAtCursor(text: string) {
        if (!textareaRef.value) return;

        const textarea = textareaRef.value;
        const cursorPos = textarea.selectionStart;

        // Insert text at cursor position
        const textBeforeCursor = message.value.substring(0, cursorPos);
        const textAfterCursor = message.value.substring(cursorPos);
        message.value = textBeforeCursor + text + textAfterCursor;

        // Focus the textarea and set cursor position after the inserted text
        nextTick(() => {
            textarea.focus();
            const newCursorPos = cursorPos + text.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);

            // Adjust height after text insertion
            adjustTextareaHeight();
        });
    }

    // Reset textarea after sending
    function resetTextarea() {
        message.value = '';
        nextTick(() => {
            if (textareaRef.value) {
                adjustTextareaHeight();
            }
        });
    }

    return {
        textareaRef,
        message,
        adjustTextareaHeight,
        handleKeydown,
        handleInput,
        insertTextAtCursor,
        resetTextarea
    }
}

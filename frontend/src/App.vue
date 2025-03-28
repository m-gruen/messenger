<script setup lang="ts">
import { ref } from 'vue'

// Reactive state
const count = ref(0)

const increment = () => {
  count.value++
}
</script>

<template>
  <div class="messenger-app">
    <header>
      <h1>Self-Hosted E2E Messenger</h1>
    </header>
    
    <main>
      <div class="counter-demo">
        <button @click="increment">
          Count is: {{ count }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.messenger-app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: Arial, sans-serif;
}

header {
  margin-bottom: 2rem;
  text-align: center;
}

.counter-demo {
  display: flex;
  justify-content: center;
}

button {
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #45a049;
}
</style>

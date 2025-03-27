import { createApp, ref } from 'vue'
import './style.css'
import App from './App.vue'

createApp({
  setup() {
    return {
      count: ref(0)
    }
  }
}).mount('#App')
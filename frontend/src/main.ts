import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// Apply dark mode by default
document.documentElement.classList.add('dark')

const app = createApp(App)

// Setup Pinia for state management
app.use(createPinia())
// Use the router
app.use(router)

app.mount('#app')

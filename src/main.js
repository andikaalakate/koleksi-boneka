import { createApp } from 'vue'
import './style.css'
import "boxicons";
import App from './App.vue'

const app = createApp(App)

app.mount('#app')

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered', reg))
    .catch(err => console.error('SW registration failed', err))
}
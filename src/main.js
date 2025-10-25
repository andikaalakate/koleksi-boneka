import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());

createApp(App).mount('#app')

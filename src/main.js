import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Mencegah klik kanan
document.addEventListener('contextmenu', e => e.preventDefault());

// Mencegah drag
document.addEventListener('dragstart', e => e.preventDefault());

// Mencegah seleksi teks
document.addEventListener('selectstart', e => e.preventDefault());

// Mencegah copy (Ctrl+C / Command+C)
document.addEventListener('copy', e => e.preventDefault());

// Mencegah cut (Ctrl+X / Command+X)
document.addEventListener('cut', e => e.preventDefault());

// Mencegah touch & hold di mobile
document.addEventListener('touchstart', e => {
    if (e.touches.length > 1) e.preventDefault();
});

const style = document.createElement('style');
style.innerHTML = `
  * {
    user-select: none;
    -webkit-user-drag: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -khtml-user-select: none;
  }
`;
document.head.appendChild(style);

createApp(App).mount('#app')

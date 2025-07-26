import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/assets/main.css'
import App from './App.vue'
import router from './router'
const app = createApp(App)

app.use(createPinia())
app.use(router)
const el = document.createElement('div')
el.id = 'extend-sni'
document.body.appendChild(el)
app.mount('#extend-sni')

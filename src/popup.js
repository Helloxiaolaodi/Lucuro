import { createApp } from 'vue'
import Popup from './Popup.vue'
import { i18n, loadSavedLocale } from './i18n'
import './styles/popup.css'

loadSavedLocale().then(() => {
  createApp(Popup).use(i18n).mount('#popup-app')
})

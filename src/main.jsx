import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import VoiceMixtapeApp from './voice-mixtape.jsx'

// Polyfill window.storage if running in a standalone browser context
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
      return true;
    }
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <VoiceMixtapeApp />
  </StrictMode>,
)

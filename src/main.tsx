import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

try {
  registerSW({
    immediate: true,
    onRegisterError() {
      // Ignore service worker registration errors inside restricted preview iframes
    },
  });
} catch {
  // Ignore in restricted iframe contexts
}

createRoot(document.getElementById('root')!).render(<App />);

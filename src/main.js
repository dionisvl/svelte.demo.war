import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { registerServiceWorker } from '$lib/pwa/sw-register.js';

const app = mount(App, { target: document.getElementById('app') });

if (import.meta.env.PROD) registerServiceWorker();

export default app;

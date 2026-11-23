/* Cache only the field application's versioned, bundled assets. */
const PREFIX = 'masa-electrodiag-field:';
const ASSETS = [
  'index.html', 'mobile-start.html', 'manifest.webmanifest',
  'assets/v1.css', 'assets/mobile.css', 'assets/ai-chat.css', 'assets/mobile-shell.css', 'assets/mobile-launcher.css', 'assets/mobile-shell.js', 'assets/mobile-launcher.js', 'assets/android-native.js', 'assets/data.js', 'assets/app.js',
  'assets/engineering-engine.js', 'assets/engineering-ui.js', 'assets/circuit-machine.js',
  'assets/circuit-diagrams.js', 'assets/field-ui.js', 'assets/cable.js', 'assets/cable-ui.js',
  'assets/agent.js', 'assets/agent-ui.js', 'assets/free-ai.js', 'assets/free-ai-ui.js', 'assets/ai-chat-core.js', 'assets/ai-vault.js', 'assets/ai-chat-ui.js', 'assets/field-zip.js', 'assets/field-provider.js', 'assets/field-records.js',
  'assets/field-records-ui.js', 'assets/offline-status.js', 'assets/knowledge-ui.js',
  'assets/qr-vendor.js', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png',
  'assets/apple-touch-icon.png', 'data/components.json', 'data/measurements.json',
  'data/fault_trees.json', 'data/diagnostic_rules.json', 'data/safety_rules.json',
  'data/cable_categories.json', 'data/cable_fault_trees.json', 'data/cable_measurements.json',
  'data/cable_rules.json', 'data/MASA_FIELD_KNOWLEDGE_PACK.zip'
];
const CACHE = PREFIX + '1.4.4-HF1-browser-launcher';
const scope = new URL(self.registration.scope);
const bundle = new Map(ASSETS.map(path => [new URL(path, scope).href, path]));
const index = new URL('index.html', scope).href;

function usable(response, path) {
  if (!response?.ok || response.redirected) return false;
  const mime = (response.headers.get('content-type') || '').toLowerCase();
  if (path === 'index.html') return mime.includes('text/html');
  return !mime.includes('text/html');
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const items = [...bundle];
      // Bounded concurrency avoids flooding a slow phone connection during first install.
      for (let i = 0; i < items.length; i += 6) {
        const entries = await Promise.all(items.slice(i, i + 6).map(async ([url, path]) => {
          const response = await fetch(url, { cache: 'reload' });
          if (!usable(response, path)) throw Error('Could not precache ' + path);
          return [url, response];
        }));
        for (const [url, response] of entries) await cache.put(url, response);
      }
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE && key.startsWith(PREFIX)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  const navigation = request.mode === 'navigate' &&
    (url.pathname === scope.pathname || url.pathname === new URL(index).pathname);
  const key = navigation ? index : url.href;
  if (!bundle.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key);
    // Keep HTML and assets on the same version, even for offline equipment QR URLs.
    return cached || fetch(request);
  })());
});

self.addEventListener('message', event => {
  const port = event.ports[0];
  if (event.data?.type !== 'MASA_CHECK_OFFLINE' || !port) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const present = await Promise.all([...bundle].map(async ([url, path]) => usable(await cache.match(url), path)));
      port.postMessage({ ready: present.every(Boolean), expected: present.length, stored: present.filter(Boolean).length });
    } catch {
      port.postMessage({ ready: false, expected: bundle.size, stored: 0 });
    }
  })());
});

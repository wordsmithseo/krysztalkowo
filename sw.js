// Service Worker dla cache'owania obrazów
const CACHE_NAME = 'krysztalkowo-images-v1';
const RUNTIME_CACHE = 'krysztalkowo-runtime-v1';

// Czas życia cache (7 dni)
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;

// Instalacja Service Workera
self.addEventListener('install', (event) => {
  console.log('[SW] Instalowanie Service Workera...');
  self.skipWaiting();
});

// Aktywacja Service Workera
self.addEventListener('activate', (event) => {
  console.log('[SW] Aktywacja Service Workera...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Usuń stare cache
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Usuwanie starego cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Przejmij kontrolę nad wszystkimi klientami
      return self.clients.claim();
    })
  );
});

// Przechwytywanie requestów
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache tylko dla obrazów z Firebase Storage
  if (url.hostname.includes('firebasestorage.googleapis.com') &&
      request.destination === 'image') {

    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {

          // Sprawdź czy cache jest świeży
          if (cachedResponse) {
            const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date'));
            const now = new Date();

            if (now - cachedDate < MAX_CACHE_AGE) {
              console.log('[SW] Zwracam z cache:', url.pathname);
              return cachedResponse;
            } else {
              console.log('[SW] Cache wygasł, pobieram na nowo:', url.pathname);
            }
          }

          // Pobierz z sieci i zapisz do cache
          return fetch(request).then((response) => {
            // Sprawdź czy response jest OK
            if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
              return response;
            }

            // Sklonuj response (można użyć tylko raz)
            const responseToCache = response.clone();

            // Dodaj datę cache'owania do headera
            const headers = new Headers(responseToCache.headers);
            headers.append('sw-cached-date', new Date().toISOString());

            // Utwórz nową response z datą
            const cachedResponse = new Response(responseToCache.body, {
              status: responseToCache.status,
              statusText: responseToCache.statusText,
              headers: headers
            });

            cache.put(request, cachedResponse).catch((err) => {
              console.error('[SW] Błąd cache:', err);
            });

            console.log('[SW] Zapisano do cache:', url.pathname);
            return response;
          }).catch((err) => {
            console.error('[SW] Błąd pobierania:', err);

            // Jeśli jest w cache, zwróć mimo że wygasł
            if (cachedResponse) {
              console.log('[SW] Zwracam wygasły cache z powodu błędu sieci');
              return cachedResponse;
            }

            throw err;
          });
        });
      })
    );
  }
  // Dla innych requestów - normalne zachowanie
});

// Obsługa wiadomości od klienta
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache wyczyszczony');
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.keys().then((keys) => {
          event.ports[0].postMessage({
            success: true,
            count: keys.length
          });
        });
      })
    );
  }
});

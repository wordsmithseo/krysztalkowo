// Service Worker dla cache'owania obrazów
const CACHE_NAME = 'krysztalkowo-images-v3';
const RUNTIME_CACHE = 'krysztalkowo-runtime-v3';

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

  // Cache dla wszystkich requestów z Firebase Storage (obrazy, pliki)
  // Usuń warunek destination === 'image' bo może nie działać dla wszystkich requestów
  if (url.hostname.includes('firebasestorage.googleapis.com')) {
    console.log('[SW] Przechwycono request do Firebase Storage:', url.href);

    // Utwórz cache key bez query stringów (token się zmienia)
    const cacheKey = new Request(url.origin + url.pathname, {
      method: request.method,
      headers: request.headers,
      mode: request.mode === 'navigate' ? 'same-origin' : request.mode,
      credentials: request.credentials,
      redirect: 'follow'
    });

    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(cacheKey, { ignoreSearch: true }).then((cachedResponse) => {

          // Sprawdź czy cache jest świeży
          if (cachedResponse) {
            const cachedDate = cachedResponse.headers.get('sw-cached-date');

            if (cachedDate) {
              const cacheAge = Date.now() - new Date(cachedDate).getTime();

              if (cacheAge < MAX_CACHE_AGE) {
                console.log('[SW] ✅ Zwracam z cache (wiek:', Math.round(cacheAge/1000/60), 'min):', url.pathname);
                return cachedResponse;
              } else {
                console.log('[SW] ⚠️ Cache wygasł (wiek:', Math.round(cacheAge/1000/60/60), 'godz), pobieram na nowo');
              }
            } else {
              // Stary cache bez daty - użyj go ale spróbuj odświeżyć
              console.log('[SW] ℹ️ Zwracam stary cache bez daty');
              return cachedResponse;
            }
          }

          // Pobierz z sieci i zapisz do cache
          return fetch(request).then((response) => {
            // Sprawdź czy response jest OK
            if (!response || response.status !== 200) {
              console.log('[SW] ❌ Response nie OK:', response.status);
              return response;
            }

            // Sklonuj response (można użyć tylko raz)
            const responseToCache = response.clone();

            // Dodaj datę cache'owania
            const headers = new Headers(responseToCache.headers);
            headers.append('sw-cached-date', new Date().toISOString());

            // Utwórz nową response z datą
            responseToCache.blob().then((blob) => {
              const cachedResponse = new Response(blob, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
              });

              cache.put(cacheKey, cachedResponse).then(() => {
                console.log('[SW] 💾 Zapisano do cache (bez query):', url.pathname.substring(0, 50) + '...');
              }).catch((err) => {
                console.error('[SW] ❌ Błąd zapisu do cache:', err);
              });
            });

            return response;
          }).catch((err) => {
            console.error('[SW] ❌ Błąd pobierania z sieci:', err);

            // Jeśli jest w cache, zwróć mimo że wygasł
            if (cachedResponse) {
              console.log('[SW] 🔄 Zwracam wygasły cache z powodu błędu sieci');
              return cachedResponse;
            }

            throw err;
          });
        });
      })
    );
  }
  // Dla innych requestów - normalne zachowanie (pass through)
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

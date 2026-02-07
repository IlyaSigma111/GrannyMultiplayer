// service-worker.js
const CACHE_NAME = 'granny-multiplayer-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Файлы для кэширования
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/game.js',
  '/firebase.js',
  '/utils.js',
  '/physics.js',
  '/audio.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/sounds/click.mp3',
  '/sounds/hide.mp3'
];

// Динамический кэш для API запросов
const DYNAMIC_CACHE_NAME = 'granny-dynamic-v1';

// Установка Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Кэширование статических файлов...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker установлен');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Удаляем старые кэши
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('🗑️ Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker активирован');
      return self.clients.claim();
    })
  );
});

// Перехват fetch запросов
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Пропускаем запросы к Firebase
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic')) {
    return;
  }
  
  // Для статических файлов используем кэш
  if (request.mode === 'navigate' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'image') {
    
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request)
            .then(response => {
              // Кэшируем новые файлы
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE_NAME)
                  .then(cache => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(() => {
              // Оффлайн режим
              if (request.mode === 'navigate') {
                return caches.match(OFFLINE_URL);
              }
            });
        })
    );
  }
});

// Push уведомления
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Новое уведомление от Granny Multiplayer!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      roomId: data.roomId
    },
    actions: [
      {
        action: 'join',
        title: 'Присоединиться',
        icon: '/icons/join-icon.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: '/icons/close-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Granny Multiplayer', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'join' && event.notification.data.roomId) {
    event.waitUntil(
      clients.openWindow(`/?room=${event.notification.data.roomId}`)
    );
  } else if (event.action === 'close') {
    // Ничего не делаем
  } else {
    // Открываем приложение
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Фоновая синхронизация
self.addEventListener('sync', event => {
  if (event.tag === 'sync-game-data') {
    event.waitUntil(syncGameData());
  }
});

async function syncGameData() {
  // Здесь можно добавить синхронизацию игровых данных
  console.log('🔄 Синхронизация игровых данных...');
}

// Периодическая синхронизация (для новых версий)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});

async function updateCache() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  const updatePromises = requests.map(async request => {
    try {
      const response = await fetch(request);
      if (response.status === 200) {
        await cache.put(request, response);
      }
    } catch (error) {
      console.warn('Не удалось обновить кэш:', request.url);
    }
  });
  
  await Promise.all(updatePromises);
  console.log('🔄 Кэш обновлен');
}

// Сообщения между Service Worker и клиентом
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

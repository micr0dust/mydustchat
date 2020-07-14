self.addEventListener('install', function (event) {
    console.log('[SW] 安裝(Install) Service Worker!', event);
    self.skipWaiting();

    var offlinePage = new Request('offline.html');
    event.waitUntil(
        fetch(offlinePage).then(function (response) {
            return caches.open('offline2').then(function (cache) {
                return cache.put(offlinePage, response);
            });
        }));
});
self.addEventListener('fetch', function (event) {
    event.respondWith(
        fetch(event.request).catch(function (error) {
            return caches.open('offline2').then(function (cache) {
                return cache.match('offline.html');
            });
        }));
});
self.addEventListener('refreshOffline', function (response) {
    return caches.open('offline2').then(function (cache) {
        return cache.put(offlinePage, response);
    });
});
self.addEventListener('notificationclick', function (event) {
    var data = event.notification.data;
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
self.addEventListener('push', ev => {
    const data = ev.data.json();
    console.log(data);
    self.registration.showNotification(data.title, {
        body: data.content,
        icon: '/client/img/MyDustChat.png'
    });
});
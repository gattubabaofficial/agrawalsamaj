// Service worker killer script
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  self.registration.unregister()
    .then(function() {
      return self.clients.matchAll();
    })
    .then(function(clients) {
      clients.forEach(function(client) {
        if (client.navigate) {
          client.navigate(client.url);
        }
      });
    });
});

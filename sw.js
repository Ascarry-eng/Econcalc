// Bu adreste eskiden "önce önbellek" çalışan bir service worker vardı (EconCalc). Onu ziyaret etmiş
// tarayıcılar eski sayfayı sonsuza dek önbellekten gösterirdi. Bu dosya onun yerine geçer:
// önbelleği siler, kendini kaldırır ve açık sayfaları yeniler. Marjinal service worker kullanmaz.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (olay) => {
  olay.waitUntil((async () => {
    for (const ad of await caches.keys()) await caches.delete(ad);
    await self.registration.unregister();
    for (const pencere of await self.clients.matchAll({ type: "window" })) pencere.navigate(pencere.url);
  })());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "New Lyla update";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "A new update has been posted.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});

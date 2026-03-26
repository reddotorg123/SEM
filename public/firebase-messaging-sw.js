importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

// This file must exist at the root of your public folder
// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data,
    tag: payload.data?.tag || 'firebase-push-notification'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

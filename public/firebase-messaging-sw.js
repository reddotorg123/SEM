importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB0aNosXLTCmX3s4M-0Doh4lRPPMX2TRmU",
  authDomain: "eventmasterapp-2693e.firebaseapp.com",
  projectId: "eventmasterapp-2693e",
  storageBucket: "eventmasterapp-2693e.firebasestorage.app",
  messagingSenderId: "854191003395",
  appId: "1:854191003395:web:a878d82ba5c3b369437b36"
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

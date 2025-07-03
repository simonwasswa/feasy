// Import Firebase scripts
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js")

// Declare Firebase variable
const firebase = self.firebase

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAN-5uwnoJp6yPPwoO_1WvyUumtWYvnnhw",
  authDomain: "gas-station-app-nomard.firebaseapp.com",
  projectId: "gas-station-app-nomard",
  storageBucket: "gas-station-app-nomard.firebasestorage.app",
  messagingSenderId: "11390145105",
  appId: "1:11390145105:web:39344910ac97696ae55e70",
  measurementId: "G-P211Z9LNPG",
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload)

  const notificationTitle = payload.notification?.title || "New Message"
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message",
    icon: payload.notification?.icon || "/favicon.ico",
    badge: "/favicon.ico",
    tag: "smartconnect-notification",
    data: payload.data || {},
    actions: [
      {
        action: "open",
        title: "Open App",
      },
      {
        action: "close",
        title: "Close",
      },
    ],
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event)

  event.notification.close()

  if (event.action === "close") {
    return
  }

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus()
        }
      }

      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow("/")
      }
    }),
  )
})

// Handle push events (for additional processing if needed)
self.addEventListener("push", (event) => {
  console.log("Push event received:", event)
})

import { initializeApp, getApps } from "firebase/app"
import { getAnalytics } from "firebase/analytics"

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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize Analytics (only in browser)
let analytics: any = null
if (typeof window !== "undefined") {
  analytics = getAnalytics(app)
}

// Firebase Messaging - Dynamic import to avoid SSR issues
let messaging: any = null

export async function initializeMessaging() {
  if (typeof window === "undefined") {
    console.log("Messaging not available on server side")
    return null
  }

  try {
    const { getMessaging, isSupported } = await import("firebase/messaging")

    const supported = await isSupported()
    if (!supported) {
      console.log("Firebase Messaging is not supported in this browser")
      return null
    }

    if (!messaging) {
      messaging = getMessaging(app)
    }

    return messaging
  } catch (error) {
    console.error("Error initializing messaging:", error)
    return null
  }
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const messagingInstance = await initializeMessaging()
    if (!messagingInstance) return null

    const { getToken } = await import("firebase/messaging")

    const token = await getToken(messagingInstance, {
      vapidKey: "BNIUQjDSA49fZ4vYvg4btss-NHIVFX4aBj6-H4z7-dwiBxXP5Tw0FOt__fAamvlQBGe6yNK8vHYxRjVMyhq91SM",
    })

    console.log("FCM Token obtained:", token)
    return token
  } catch (error) {
    console.error("Error getting FCM token:", error)
    return null
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false

  try {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications")
      return false
    }

    if (Notification.permission === "granted") {
      return true
    }

    if (Notification.permission === "denied") {
      console.log("Notification permission denied")
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === "granted"
  } catch (error) {
    console.error("Error requesting notification permission:", error)
    return false
  }
}

export async function onMessageListener() {
  try {
    const messagingInstance = await initializeMessaging()
    if (!messagingInstance) return Promise.reject("Messaging not available")

    const { onMessage } = await import("firebase/messaging")

    return new Promise((resolve) => {
      onMessage(messagingInstance, (payload) => {
        console.log("Foreground message received:", payload)
        resolve(payload)
      })
    })
  } catch (error) {
    console.error("Error setting up message listener:", error)
    return Promise.reject(error)
  }
}

export { app, analytics }

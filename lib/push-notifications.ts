import { supabase } from "../db/supabase"

export interface PushSubscriptionData {
  id?: number
  user_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  user_agent?: string
  created_at?: string
  updated_at?: string
  is_active: boolean
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  image?: string
  badge?: string
  data?: {
    url?: string
    senderId?: string
    messageId?: string
    timestamp?: number
    [key: string]: any
  }
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  priority?: "low" | "normal" | "high" | "urgent"
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
}

// VAPID keys - In production, store these securely in environment variables
const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BEl62iUYgUivxIkv69yViEuiBIa40HI2wLsHw4XloDXA4wSjMVHLIBz7oUHH-QCBiehIHGv9-IPSehvDdKEKpZo"
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "aUeqiuDHDqfNNAQRBQX6VoMpUDnOtUxzU3lkGziHHfM"

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

// Check if service worker is supported
export function isServiceWorkerSupported(): boolean {
  return "serviceWorker" in navigator
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn("Service Worker not supported")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    })

    console.log("Service Worker registered successfully:", registration)

    // Handle service worker updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New service worker is available
            console.log("New service worker available")
            // You can show a notification to the user to refresh
          }
        })
      }
    })

    return registration
  } catch (error) {
    console.error("Service Worker registration failed:", error)
    return null
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported")
    return "denied"
  }

  if (Notification.permission === "granted") {
    return "granted"
  }

  if (Notification.permission === "denied") {
    return "denied"
  }

  // Request permission
  const permission = await Notification.requestPermission()
  console.log("Notification permission:", permission)
  return permission
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(userId: string): Promise<PushSubscriptionData | null> {
  try {
    // Check support
    if (!isPushNotificationSupported()) {
      throw new Error("Push notifications not supported")
    }

    // Request notification permission
    const permission = await requestNotificationPermission()
    if (permission !== "granted") {
      throw new Error("Notification permission denied")
    }

    // Register service worker
    const registration = await registerServiceWorker()
    if (!registration) {
      throw new Error("Service Worker registration failed")
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    console.log("Push subscription created:", subscription)

    // Extract subscription data
    const subscriptionData: PushSubscriptionData = {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))),
      auth_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))),
      user_agent: navigator.userAgent,
      is_active: true,
    }

    // Save subscription to database
    const savedSubscription = await savePushSubscription(subscriptionData)
    console.log("Push subscription saved:", savedSubscription)

    return savedSubscription
  } catch (error) {
    console.error("Error subscribing to push notifications:", error)
    throw error
  }
}

// Save push subscription to database
export async function savePushSubscription(subscriptionData: PushSubscriptionData): Promise<PushSubscriptionData> {
  try {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert([subscriptionData], {
        onConflict: "user_id,endpoint",
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving push subscription:", error)
      throw new Error(`Failed to save push subscription: ${error.message}`)
    }

    return data as PushSubscriptionData
  } catch (error) {
    console.error("Save push subscription error:", error)
    throw error
  }
}

// Get push subscriptions for a user
export async function getPushSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
  try {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)

    if (error) {
      console.error("Error getting push subscriptions:", error)
      throw new Error(`Failed to get push subscriptions: ${error.message}`)
    }

    return data as PushSubscriptionData[]
  } catch (error) {
    console.error("Get push subscriptions error:", error)
    throw error
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(userId: string): Promise<void> {
  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      console.warn("No service worker registration found")
      return
    }

    // Get push subscription
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      // Unsubscribe from push manager
      await subscription.unsubscribe()
      console.log("Unsubscribed from push notifications")
    }

    // Deactivate subscriptions in database
    const { error } = await supabase.from("push_subscriptions").update({ is_active: false }).eq("user_id", userId)

    if (error) {
      console.error("Error deactivating push subscriptions:", error)
      throw new Error(`Failed to deactivate push subscriptions: ${error.message}`)
    }

    console.log("Push subscriptions deactivated in database")
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    throw error
  }
}

// Check current push subscription status
export async function getPushSubscriptionStatus(userId: string): Promise<{
  isSupported: boolean
  isPermissionGranted: boolean
  isSubscribed: boolean
  subscription: PushSubscriptionData | null
}> {
  try {
    const isSupported = isPushNotificationSupported()
    const isPermissionGranted = Notification.permission === "granted"

    let isSubscribed = false
    let subscription: PushSubscriptionData | null = null

    if (isSupported && isPermissionGranted) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        const pushSubscription = await registration.pushManager.getSubscription()
        isSubscribed = !!pushSubscription

        if (isSubscribed) {
          // Get subscription from database
          const subscriptions = await getPushSubscriptions(userId)
          subscription = subscriptions.find((sub) => sub.endpoint === pushSubscription!.endpoint) || null
        }
      }
    }

    return {
      isSupported,
      isPermissionGranted,
      isSubscribed,
      subscription,
    }
  } catch (error) {
    console.error("Error checking push subscription status:", error)
    return {
      isSupported: false,
      isPermissionGranted: false,
      isSubscribed: false,
      subscription: null,
    }
  }
}

// Show local notification (fallback)
export function showLocalNotification(payload: PushNotificationPayload): void {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported")
    return
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted")
    return
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/favicon.ico",
      image: payload.image,
      badge: payload.badge || "/favicon.ico",
      tag: payload.tag || `local-${Date.now()}`,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      vibrate: payload.vibrate || [200, 100, 200],
      data: payload.data || {},
    })

    // Handle click
    notification.onclick = () => {
      window.focus()
      notification.close()

      // Navigate to chat if senderId is provided
      if (payload.data?.senderId) {
        // Dispatch custom event for navigation
        window.dispatchEvent(
          new CustomEvent("navigate", {
            detail: "chats",
            bubbles: true,
          }),
        )
      }
    }

    // Auto-close after 5 seconds for non-urgent notifications
    if (payload.priority !== "urgent") {
      setTimeout(() => {
        notification.close()
      }, 5000)
    }
  } catch (error) {
    console.error("Error showing local notification:", error)
  }
}

// Utility to create notification payload from chat message
export function createMessageNotificationPayload(
  message: any,
  senderName: string,
  senderAvatar?: string,
): PushNotificationPayload {
  // Truncate message to 100 characters
  const truncatedMessage = message.message.length > 100 ? message.message.substring(0, 100) + "..." : message.message

  return {
    title: "New Message Received",
    body: `${senderName}: ${truncatedMessage}`,
    icon: "/favicon.ico",
    image: senderAvatar,
    badge: "/favicon.ico",
    data: {
      url: "/",
      senderId: message.created_by,
      messageId: message.id,
      timestamp: Date.now(),
    },
    actions: [
      {
        action: "view",
        title: "View",
        icon: "/favicon.ico",
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/favicon.ico",
      },
    ],
    priority: "normal",
    tag: `message-${message.id}`,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
  }
}

import { getFCMToken, requestNotificationPermission, onMessageListener } from "./firebase"

export interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, any>
}

class FirebaseNotifications {
  private token: string | null = null
  private initialized = false

  async initialize(): Promise<boolean> {
    if (this.initialized) return true

    try {
      // Request notification permission
      const permissionGranted = await requestNotificationPermission()
      if (!permissionGranted) {
        console.log("Notification permission not granted")
        return false
      }

      // Get FCM token
      this.token = await getFCMToken()
      if (!this.token) {
        console.log("Failed to get FCM token")
        return false
      }

      this.initialized = true
      return true
    } catch (error) {
      console.error("Error initializing Firebase notifications:", error)
      return false
    }
  }

  async registerToken(userId: string): Promise<boolean> {
    if (!this.token) {
      console.log("No FCM token available")
      return false
    }

    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch("/api/fcm/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          token: this.token,
          deviceInfo,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to register token")
      }

      console.log("FCM token registered successfully:", result)
      return true
    } catch (error) {
      console.error("Error registering FCM token:", error)
      return false
    }
  }

  async sendNotification(userId: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch("/api/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title,
          body,
          data,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to send notification")
      }

      console.log("Notification sent successfully:", result)
      return true
    } catch (error) {
      console.error("Error sending notification:", error)
      return false
    }
  }

  async sendTestNotification(userId: string): Promise<boolean> {
    return this.sendNotification(
      userId,
      "Test Notification",
      "This is a test notification from SmartConnect Dashboard",
      { type: "test", timestamp: new Date().toISOString() },
    )
  }

  async sendMessageNotification(
    userId: string,
    senderName: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    return this.sendNotification(userId, `New message from ${senderName}`, message, { type: "message", ...data })
  }

  onMessage(callback: (payload: any) => void) {
    onMessageListener().then(callback).catch(console.error)
  }

  setupForegroundMessageListener(callback: (payload: any) => void) {
    this.onMessage(callback)
  }

  get isInitialized(): boolean {
    return this.initialized
  }

  get fcmToken(): string | null {
    return this.token
  }
}

// Export singleton instance
export const firebaseNotifications = new FirebaseNotifications()

// Export individual functions for convenience
export const {
  initialize,
  registerToken,
  sendNotification,
  sendTestNotification,
  sendMessageNotification,
  onMessage,
  setupForegroundMessageListener,
} = firebaseNotifications

// Export utility functions
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined") return "default"
  return Notification.permission
}

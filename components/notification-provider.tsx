"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "./auth-provider"
import {
  getAdminNotifications,
  getNotificationStats,
  markNotificationAsRead,
  markNotificationAsDismissed,
  markAllNotificationsAsRead,
  subscribeToNotifications,
  cleanupNotificationSubscriptions,
  BrowserNotificationManager,
  AudioNotificationManager,
  type AdminNotification,
  type NotificationStats,
} from "../db/notifications"
import { toast } from "@/hooks/use-toast"
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscriptionStatus,
  showLocalNotification,
  type PushSubscriptionData,
} from "../lib/push-notifications"

interface NotificationContextType {
  notifications: AdminNotification[]
  stats: NotificationStats
  isLoading: boolean
  error: string | null

  // Actions
  refreshNotifications: () => Promise<void>
  markAsRead: (notificationId: number) => Promise<void>
  markAsDismissed: (notificationId: number) => Promise<void>
  markAllAsRead: () => Promise<void>

  // Settings
  browserNotificationsEnabled: boolean
  audioNotificationsEnabled: boolean
  setBrowserNotificationsEnabled: (enabled: boolean) => void
  setAudioNotificationsEnabled: (enabled: boolean) => void
  requestBrowserPermission: () => Promise<boolean>

  // Real-time status
  isRealTimeConnected: boolean

  pushSubscriptionStatus: {
    isSupported: boolean
    isPermissionGranted: boolean
    isSubscribed: boolean
    subscription: PushSubscriptionData | null
  }
  isPushEnabled: boolean
  enablePushNotifications: () => Promise<boolean>
  disablePushNotifications: () => Promise<void>
  testPushNotification: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, high_priority: 0, today: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false)

  // Settings
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false)
  const [audioNotificationsEnabled, setAudioNotificationsEnabled] = useState(true)

  // Add these state variables after the existing ones
  const [pushSubscriptionStatus, setPushSubscriptionStatus] = useState<{
    isSupported: boolean
    isPermissionGranted: boolean
    isSubscribed: boolean
    subscription: PushSubscriptionData | null
  }>({
    isSupported: false,
    isPermissionGranted: false,
    isSubscribed: false,
    subscription: null,
  })

  const [isPushEnabled, setIsPushEnabled] = useState(false)

  // Managers
  const [browserManager] = useState(() => BrowserNotificationManager.getInstance())
  const [audioManager] = useState(() => new AudioNotificationManager())

  // Load notifications and stats
  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const [notificationsData, statsData] = await Promise.all([
        getAdminNotifications(user.id, { limit: 50 }),
        getNotificationStats(user.id),
      ])

      setNotifications(notificationsData)
      setStats(statsData)
    } catch (error: any) {
      console.error("Error refreshing notifications:", error)
      setError(error.message || "Failed to load notifications")
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Enable push notifications
  const enablePushNotifications = useCallback(async () => {
    if (!user?.id) return false

    try {
      setIsLoading(true)
      const subscription = await subscribeToPushNotifications(user.id)

      if (subscription) {
        setIsPushEnabled(true)
        await checkPushSubscriptionStatus()

        toast({
          title: "Push Notifications Enabled",
          description: "You'll receive notifications even when the dashboard is closed",
        })

        return true
      }

      return false
    } catch (error: any) {
      console.error("Error enabling push notifications:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to enable push notifications",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Disable push notifications
  const disablePushNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      await unsubscribeFromPushNotifications(user.id)
      setIsPushEnabled(false)
      await checkPushSubscriptionStatus()

      toast({
        title: "Push Notifications Disabled",
        description: "You'll only receive notifications when the dashboard is open",
      })
    } catch (error: any) {
      console.error("Error disabling push notifications:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to disable push notifications",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Test push notification
  const testPushNotification = useCallback(async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/push/send?userId=${user.id}`)
      const result = await response.json()

      if (result.sent > 0) {
        toast({
          title: "Test Notification Sent",
          description: "Check your browser or device for the notification",
        })
      } else {
        toast({
          title: "No Notifications Sent",
          description: "Make sure push notifications are enabled",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error sending test notification:", error)
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive",
      })
    }
  }, [user?.id])

  // Check push subscription status
  const checkPushSubscriptionStatus = useCallback(async () => {
    if (!user?.id) return

    try {
      const status = await getPushSubscriptionStatus(user.id)
      setPushSubscriptionStatus(status)
      setIsPushEnabled(status.isSubscribed)
    } catch (error) {
      console.error("Error checking push subscription status:", error)
    }
  }, [user?.id])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId)

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification,
        ),
      )

      // Update stats
      setStats((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
      }))
    } catch (error: any) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      })
    }
  }, [])

  // Mark notification as dismissed
  const markAsDismissed = useCallback(async (notificationId: number) => {
    try {
      await markNotificationAsDismissed(notificationId)

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_dismissed: true, dismissed_at: new Date().toISOString() }
            : notification,
        ),
      )
    } catch (error: any) {
      console.error("Error marking notification as dismissed:", error)
      toast({
        title: "Error",
        description: "Failed to dismiss notification",
        variant: "destructive",
      })
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return

    try {
      await markAllNotificationsAsRead(user.id)

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.is_read
            ? notification
            : {
                ...notification,
                is_read: true,
                read_at: new Date().toISOString(),
              },
        ),
      )

      // Update stats
      setStats((prev) => ({ ...prev, unread: 0 }))

      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      })
    }
  }, [user?.id])

  // Request browser notification permission
  const requestBrowserPermission = useCallback(async () => {
    const granted = await browserManager.requestPermission()
    setBrowserNotificationsEnabled(granted)
    return granted
  }, [browserManager])

  // Update the existing handleNewNotification function
  const handleNewNotification = useCallback(
    async (notification: AdminNotification) => {
      console.log("📨 New notification received:", notification)

      // Add to notifications list
      setNotifications((prev) => [notification, ...prev])

      // Update stats
      setStats((prev) => ({
        total: prev.total + 1,
        unread: prev.unread + 1,
        high_priority: ["high", "urgent"].includes(notification.priority) ? prev.high_priority + 1 : prev.high_priority,
        today: prev.today + 1,
      }))

      // Send push notification if it's a message notification
      if (notification.notification_type === "new_message" && user?.id) {
        try {
          await fetch("/api/push/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              payload: {
                title: notification.title,
                body: notification.message,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                data: {
                  url: "/",
                  senderId: notification.sender_id,
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
                priority: notification.priority,
                tag: `notification-${notification.id}`,
                requireInteraction: notification.priority === "urgent",
                silent: notification.priority === "low",
                vibrate: [200, 100, 200],
              },
            }),
          })
        } catch (error) {
          console.error("Error sending push notification:", error)

          // Fallback to local notification
          if (browserNotificationsEnabled) {
            showLocalNotification({
              title: notification.title,
              body: notification.message,
              icon: "/favicon.ico",
              data: {
                senderId: notification.sender_id,
              },
              priority: notification.priority,
            })
          }
        }
      }

      // Show browser notification (fallback)
      if (browserNotificationsEnabled && !isPushEnabled) {
        await browserManager.showNotification(notification)
      }

      // Play audio notification
      if (audioNotificationsEnabled) {
        await audioManager.playNotificationSound(notification.priority)
      }

      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        duration: notification.priority === "urgent" ? 10000 : 5000,
      })
    },
    [browserNotificationsEnabled, audioNotificationsEnabled, browserManager, audioManager, isPushEnabled, user?.id],
  )

  // Setup real-time subscription
  useEffect(() => {
    if (!user?.id) return

    console.log("🔔 Setting up notification subscription for admin:", user.id)

    const subscription = subscribeToNotifications(user.id, handleNewNotification, (error) => {
      console.error("❌ Notification subscription error:", error)
      setIsRealTimeConnected(false)
      setError("Real-time notifications disconnected")
    })

    if (subscription) {
      setIsRealTimeConnected(true)
      console.log("✅ Notification subscription active")
    }

    return () => {
      console.log("🧹 Cleaning up notification subscription...")
      cleanupNotificationSubscriptions()
      setIsRealTimeConnected(false)
    }
  }, [user?.id, handleNewNotification])

  // Load initial data
  useEffect(() => {
    if (user?.id) {
      refreshNotifications()
    }
  }, [user?.id, refreshNotifications])

  // Update audio manager settings
  useEffect(() => {
    audioManager.setEnabled(audioNotificationsEnabled)
  }, [audioNotificationsEnabled, audioManager])

  // Check browser notification permission on mount
  useEffect(() => {
    const permission = browserManager.getPermissionStatus()
    setBrowserNotificationsEnabled(permission === "granted")
  }, [browserManager])

  // Add this useEffect after the existing ones
  useEffect(() => {
    if (user?.id) {
      checkPushSubscriptionStatus()
    }
  }, [user?.id, checkPushSubscriptionStatus])

  // Update the value object to include the new properties
  const value: NotificationContextType = {
    notifications,
    stats,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAsDismissed,
    markAllAsRead,
    browserNotificationsEnabled,
    audioNotificationsEnabled,
    setBrowserNotificationsEnabled,
    setAudioNotificationsEnabled,
    requestBrowserPermission,
    isRealTimeConnected,
    pushSubscriptionStatus,
    isPushEnabled,
    enablePushNotifications,
    disablePushNotifications,
    testPushNotification,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

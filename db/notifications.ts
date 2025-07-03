import { supabase } from "./supabase"

export interface AdminNotification {
  id: number
  admin_id: string
  sender_id: string
  message_id?: number
  notification_type: string
  title: string
  message: string
  priority: "low" | "normal" | "high" | "urgent"
  is_read: boolean
  is_dismissed: boolean
  created_at: string
  read_at?: string
  dismissed_at?: string
  metadata: Record<string, any>
}

export interface NotificationStats {
  total: number
  unread: number
  high_priority: number
  today: number
}

// Store active notification subscriptions
const activeNotificationSubscriptions = new Map<string, any>()

// Get all notifications for an admin
export async function getAdminNotifications(
  adminId: string,
  options: {
    limit?: number
    offset?: number
    filter?: "all" | "unread" | "high_priority"
    search?: string
  } = {},
): Promise<AdminNotification[]> {
  try {
    let query = supabase
      .from("admin_notifications")
      .select("*")
      .eq("admin_id", adminId)
      .order("created_at", { ascending: false })

    // Apply filters
    if (options.filter === "unread") {
      query = query.eq("is_read", false)
    } else if (options.filter === "high_priority") {
      query = query.in("priority", ["high", "urgent"])
    }

    // Apply search
    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,message.ilike.%${options.search}%`)
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching admin notifications:", error)
      throw new Error(`Failed to fetch notifications: ${error.message}`)
    }

    return data as AdminNotification[]
  } catch (error) {
    console.error("Get admin notifications error:", error)
    throw error
  }
}

// Get notification statistics
export async function getNotificationStats(adminId: string): Promise<NotificationStats> {
  try {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("priority, is_read, created_at")
      .eq("admin_id", adminId)

    if (error) {
      console.error("Error fetching notification stats:", error)
      return { total: 0, unread: 0, high_priority: 0, today: 0 }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const stats = data.reduce(
      (acc, notification) => {
        acc.total++
        if (!notification.is_read) acc.unread++
        if (["high", "urgent"].includes(notification.priority)) acc.high_priority++
        if (new Date(notification.created_at) >= today) acc.today++
        return acc
      },
      { total: 0, unread: 0, high_priority: 0, today: 0 },
    )

    return stats
  } catch (error) {
    console.error("Get notification stats error:", error)
    return { total: 0, unread: 0, high_priority: 0, today: 0 }
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from("admin_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }
  } catch (error) {
    console.error("Mark notification as read error:", error)
    throw error
  }
}

// Mark notification as dismissed
export async function markNotificationAsDismissed(notificationId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from("admin_notifications")
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString(),
      })
      .eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as dismissed:", error)
      throw new Error(`Failed to mark notification as dismissed: ${error.message}`)
    }
  } catch (error) {
    console.error("Mark notification as dismissed error:", error)
    throw error
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(adminId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("admin_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("admin_id", adminId)
      .eq("is_read", false)

    if (error) {
      console.error("Error marking all notifications as read:", error)
      throw new Error(`Failed to mark all notifications as read: ${error.message}`)
    }
  } catch (error) {
    console.error("Mark all notifications as read error:", error)
    throw error
  }
}

// Create a manual notification
export async function createNotification(notification: {
  admin_id: string
  sender_id: string
  title: string
  message: string
  priority?: "low" | "normal" | "high" | "urgent"
  notification_type?: string
  metadata?: Record<string, any>
}): Promise<AdminNotification> {
  try {
    const { data, error } = await supabase
      .from("admin_notifications")
      .insert([
        {
          admin_id: notification.admin_id,
          sender_id: notification.sender_id,
          title: notification.title,
          message: notification.message,
          priority: notification.priority || "normal",
          notification_type: notification.notification_type || "manual",
          metadata: notification.metadata || {},
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating notification:", error)
      throw new Error(`Failed to create notification: ${error.message}`)
    }

    return data as AdminNotification
  } catch (error) {
    console.error("Create notification error:", error)
    throw error
  }
}

// Subscribe to real-time notifications
export function subscribeToNotifications(
  adminId: string,
  onNewNotification: (notification: AdminNotification) => void,
  onError?: (error: any) => void,
) {
  try {
    const channelName = `admin_notifications_${adminId}`

    // Clean up existing subscription
    const existingSubscription = activeNotificationSubscriptions.get(channelName)
    if (existingSubscription) {
      existingSubscription.unsubscribe()
    }

    console.log(`Setting up notification subscription for admin: ${adminId}`)

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
          filter: `admin_id=eq.${adminId}`,
        },
        (payload) => {
          console.log("🔔 New notification received:", payload.new)
          onNewNotification(payload.new as AdminNotification)
        },
      )
      .on("subscribe", (status) => {
        console.log("📡 Notification subscription status:", status)
      })
      .on("error", (error) => {
        console.error("❌ Notification subscription error:", error)
        if (onError) onError(error)
      })
      .subscribe()

    activeNotificationSubscriptions.set(channelName, subscription)
    return subscription
  } catch (error) {
    console.error("Error setting up notification subscription:", error)
    if (onError) onError(error)
    return null
  }
}

// Clean up notification subscriptions
export function cleanupNotificationSubscriptions() {
  console.log("Cleaning up notification subscriptions...")
  activeNotificationSubscriptions.forEach((subscription, channelName) => {
    try {
      subscription.unsubscribe()
      console.log(`Cleaned up notification subscription: ${channelName}`)
    } catch (error) {
      console.warn(`Error cleaning up notification subscription ${channelName}:`, error)
    }
  })
  activeNotificationSubscriptions.clear()
}

// Browser notification utilities
export class BrowserNotificationManager {
  private static instance: BrowserNotificationManager
  private permission: NotificationPermission = "default"

  private constructor() {
    this.checkPermission()
  }

  static getInstance(): BrowserNotificationManager {
    if (!BrowserNotificationManager.instance) {
      BrowserNotificationManager.instance = new BrowserNotificationManager()
    }
    return BrowserNotificationManager.instance
  }

  private checkPermission() {
    if ("Notification" in window) {
      this.permission = Notification.permission
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("Browser does not support notifications")
      return false
    }

    if (this.permission === "granted") {
      return true
    }

    const permission = await Notification.requestPermission()
    this.permission = permission
    return permission === "granted"
  }

  async showNotification(notification: AdminNotification): Promise<void> {
    if (this.permission !== "granted") {
      console.warn("Notification permission not granted")
      return
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `notification-${notification.id}`,
        requireInteraction: notification.priority === "urgent",
        silent: notification.priority === "low",
      })

      // Auto-close after 5 seconds for non-urgent notifications
      if (notification.priority !== "urgent") {
        setTimeout(() => {
          browserNotification.close()
        }, 5000)
      }

      browserNotification.onclick = () => {
        window.focus()
        browserNotification.close()
        // You can add navigation logic here
      }
    } catch (error) {
      console.error("Error showing browser notification:", error)
    }
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission
  }
}

// Audio notification manager
export class AudioNotificationManager {
  private audioContext: AudioContext | null = null
  private isEnabled = true

  constructor() {
    this.initAudioContext()
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn("Audio notifications not supported:", error)
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  async playNotificationSound(priority: "low" | "normal" | "high" | "urgent" = "normal") {
    if (!this.isEnabled || !this.audioContext) return

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume()
      }

      // Create different tones based on priority
      const frequency = this.getFrequencyForPriority(priority)
      const duration = this.getDurationForPriority(priority)

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + duration)
    } catch (error) {
      console.error("Error playing notification sound:", error)
    }
  }

  private getFrequencyForPriority(priority: string): number {
    switch (priority) {
      case "low":
        return 400
      case "normal":
        return 600
      case "high":
        return 800
      case "urgent":
        return 1000
      default:
        return 600
    }
  }

  private getDurationForPriority(priority: string): number {
    switch (priority) {
      case "low":
        return 0.2
      case "normal":
        return 0.3
      case "high":
        return 0.5
      case "urgent":
        return 0.8
      default:
        return 0.3
    }
  }
}

// Delete old notifications (cleanup utility)
export async function deleteOldNotifications(adminId: string, daysOld = 30): Promise<number> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { data, error } = await supabase
      .from("admin_notifications")
      .delete()
      .eq("admin_id", adminId)
      .lt("created_at", cutoffDate.toISOString())
      .select("id")

    if (error) {
      console.error("Error deleting old notifications:", error)
      throw new Error(`Failed to delete old notifications: ${error.message}`)
    }

    return data?.length || 0
  } catch (error) {
    console.error("Delete old notifications error:", error)
    throw error
  }
}

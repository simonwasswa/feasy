import { type NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { supabase } from "../../../../db/supabase"
import { getUserDisplayName, getUserAvatar } from "../../../../db/chart-message"
import { createMessageNotificationPayload, type PushNotificationPayload } from "../../../../lib/push-notifications"

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BEl62iUYgUivxIkv69yViEuiBIa40HI2wLsHw4XloDXA4wSjMVHLIBz7oUHH-QCBiehIHGv9-IPSehvDdKEKpZo"
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "aUeqiuDHDqfNNAQRBQX6VoMpUDnOtUxzU3lkGziHHfM"
const VAPID_EMAIL = process.env.VAPID_EMAIL || "admin@feasy.com"

webpush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

interface SendPushRequest {
  userId: string
  payload: PushNotificationPayload
  messageData?: any
}

export async function POST(request: NextRequest) {
  try {
    const body: SendPushRequest = await request.json()
    const { userId, payload, messageData } = body

    console.log("Sending push notification to user:", userId)

    // Get user's push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)

    if (subscriptionsError) {
      console.error("Error fetching push subscriptions:", subscriptionsError)
      return NextResponse.json({ error: "Failed to fetch push subscriptions" }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No active push subscriptions found for user:", userId)
      return NextResponse.json({ message: "No active push subscriptions found", sent: 0 }, { status: 200 })
    }

    console.log(`Found ${subscriptions.length} active subscriptions`)

    // If messageData is provided, enhance the payload with user info
    let enhancedPayload = payload
    if (messageData) {
      try {
        const senderName = await getUserDisplayName(messageData.created_by)
        const senderAvatar = await getUserAvatar(messageData.created_by)
        enhancedPayload = createMessageNotificationPayload(messageData, senderName, senderAvatar)
      } catch (error) {
        console.error("Error enhancing payload with user info:", error)
        // Continue with original payload
      }
    }

    // Send push notifications to all subscriptions
    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        }

        const pushPayload = JSON.stringify(enhancedPayload)

        console.log("Sending push to endpoint:", subscription.endpoint.substring(0, 50) + "...")

        const result = await webpush.sendNotification(pushSubscription, pushPayload, {
          TTL: 86400, // 24 hours
          urgency: enhancedPayload.priority === "urgent" ? "high" : "normal",
        })

        console.log("Push sent successfully:", result.statusCode)
        return { success: true, subscriptionId: subscription.id }
      } catch (error: any) {
        console.error("Error sending push to subscription:", subscription.id, error)

        // Handle expired/invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log("Subscription expired, deactivating:", subscription.id)

          // Deactivate expired subscription
          await supabase.from("push_subscriptions").update({ is_active: false }).eq("id", subscription.id)
        }

        return {
          success: false,
          subscriptionId: subscription.id,
          error: error.message,
          statusCode: error.statusCode,
        }
      }
    })

    // Wait for all push notifications to complete
    const results = await Promise.all(pushPromises)

    // Count successful sends
    const successCount = results.filter((result) => result.success).length
    const failureCount = results.filter((result) => !result.success).length

    console.log(`Push notification results: ${successCount} sent, ${failureCount} failed`)

    // Log results for debugging
    results.forEach((result) => {
      if (!result.success) {
        console.error("Failed push result:", result)
      }
    })

    return NextResponse.json({
      message: "Push notifications processed",
      sent: successCount,
      failed: failureCount,
      results: results,
    })
  } catch (error: any) {
    console.error("Error in push notification API:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

// GET endpoint to test push notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required" }, { status: 400 })
    }

    // Send a test notification
    const testPayload: PushNotificationPayload = {
      title: "Test Notification",
      body: "This is a test push notification from Feasy Admin Dashboard",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        url: "/",
        timestamp: Date.now(),
      },
      actions: [
        {
          action: "view",
          title: "View Dashboard",
          icon: "/favicon.ico",
        },
        {
          action: "dismiss",
          title: "Dismiss",
          icon: "/favicon.ico",
        },
      ],
      priority: "normal",
      tag: `test-${Date.now()}`,
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
    }

    // Use the POST logic to send the test notification
    const response = await fetch(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        payload: testPayload,
      }),
    })

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error in test push notification:", error)
    return NextResponse.json({ error: "Failed to send test notification", details: error.message }, { status: 500 })
  }
}

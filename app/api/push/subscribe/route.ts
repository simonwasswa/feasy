import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "../../../../db/supabase"

interface SubscribeRequest {
  userId: string
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
  userAgent?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SubscribeRequest = await request.json()
    const { userId, subscription, userAgent } = body

    console.log("Saving push subscription for user:", userId)

    // Validate required fields
    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Save subscription to database
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        [
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh_key: subscription.keys.p256dh,
            auth_key: subscription.keys.auth,
            user_agent: userAgent || null,
            is_active: true,
          },
        ],
        {
          onConflict: "user_id,endpoint",
          ignoreDuplicates: false,
        },
      )
      .select()
      .single()

    if (error) {
      console.error("Error saving push subscription:", error)
      return NextResponse.json({ error: "Failed to save push subscription", details: error.message }, { status: 500 })
    }

    console.log("Push subscription saved successfully:", data.id)

    return NextResponse.json({
      message: "Push subscription saved successfully",
      subscriptionId: data.id,
    })
  } catch (error: any) {
    console.error("Error in push subscription API:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const endpoint = searchParams.get("endpoint")

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required" }, { status: 400 })
    }

    let query = supabase.from("push_subscriptions").update({ is_active: false }).eq("user_id", userId)

    // If endpoint is provided, only deactivate that specific subscription
    if (endpoint) {
      query = query.eq("endpoint", endpoint)
    }

    const { error } = await query

    if (error) {
      console.error("Error deactivating push subscription:", error)
      return NextResponse.json(
        { error: "Failed to deactivate push subscription", details: error.message },
        { status: 500 },
      )
    }

    console.log("Push subscription(s) deactivated for user:", userId)

    return NextResponse.json({
      message: "Push subscription(s) deactivated successfully",
    })
  } catch (error: any) {
    console.error("Error in push unsubscribe API:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required" }, { status: 400 })
    }

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching push subscriptions:", error)
      return NextResponse.json({ error: "Failed to fetch push subscriptions", details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      subscriptions: subscriptions || [],
      count: subscriptions?.length || 0,
    })
  } catch (error: any) {
    console.error("Error in get push subscriptions API:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

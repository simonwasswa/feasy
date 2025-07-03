import { type NextRequest, NextResponse } from "next/server"
import { registerFCMToken } from "@/db/fcm-tokens"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, token, deviceInfo } = body

    if (!userId || !token) {
      return NextResponse.json({ error: "Missing required fields: userId and token" }, { status: 400 })
    }

    const result = await registerFCMToken(userId, token, deviceInfo)

    return NextResponse.json({
      success: true,
      data: result,
      message: "FCM token registered successfully",
    })
  } catch (error: any) {
    console.error("Error in FCM register API:", error)
    return NextResponse.json({ error: error.message || "Failed to register FCM token" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "FCM Register API is working",
    endpoints: {
      POST: "/api/fcm/register - Register FCM token",
    },
  })
}

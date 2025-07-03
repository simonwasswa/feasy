import { type NextRequest, NextResponse } from "next/server"
import { getFCMTokensForUser } from "@/db/fcm-tokens"

// Firebase Admin SDK configuration
const admin = require("firebase-admin")

// Your service account configuration
const serviceAccount = {
  type: "service_account",
  project_id: "gas-station-app-nomard",
  private_key_id: "3773b09d8cd4444007b299004b2046851827e7f5",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC1ew49FaWfphBH\nO5L2YiFLq9unYr1KhPRweqDPRu6haEir04PWPdHrtdTSI7BRJyE0+c4Z1+tFJoX1\nrOg8mkJB3eATwhVRR7NPrwj5e/2aNVwb8AAz+NI/tZqsbhJnxlC6oe/QjLckYWkZ\nWn7gteCPvYV2Y33L4s3/50wgJV5/KH+mPMVk+5jKhFEiG/jNz9/NiqQdxxuN0JTC\nQJehnU8IoI1Zi9A1A3FaHX3NOhAv87mgu/JBKxOn64LVo4QRSObcTnEzQCpz1/rF\nPQSI2o21oTVLswXHFNWRebBM+MZhR3iOCl+GivsdumCVTGHWTH2qrbIa+UUkhoNV\nJamb+F/lAgMBAAECggEAGZCMIO67thGemWo6+Zo5Nn+vIZU3NRgllvKvVIOZegNG\nuW3CVJvAxoOGx1Nfsw7gDqZh8iIIcmVK2aDR1jekvcKTnjTo69o92CvAB+T/hImf\nwA++95NFitP6Re/7h8LX/HJzZd1sryNJutiUpvL3/0ejVVoOjnoUqsfaYWziMuc0\n2CiHU9kXao0TCLIgQfY09bHe6Af+ks3VIVywPPVGCWcf2hWHjQxa6RtTQgiMG1vd\ndohWIv1kk8BFs8f8to/R8gQdzsr9MkKkFgM5ZqE6Ro50M/nOAgg6/Hsx/08LnbAc\n30z3pbp2opfbLZMmpzxb03pltTMrAjuN35qGQW9iwQKBgQDa8hWZlHNxEcIdTmIc\n5lcV8aJzDRTKaVRhvnIxRS912HEHDVr+t44gwJVwCUvzgjmhkW4dymcaYYzhrn/H\nlb1+xmdGT3vGHt+y4sZychI4jT5gplSL1A9yremWOLu3GvzOQ3zrLowMKjEZIHTr\nGJuR8fO3DYJCeSPouzTX98P3cwKBgQDUMckgYShz7sMoIatpxD4IFkhXY+p6/fwz\nexqq3PEXyHHRsE/UhjkyuNwCTZXfV+By8k3sG7bluLP/GXMj5h9bnJyimd+ROCKy\nkfSXI8xM9K2DYt+H0ZKOrpghVIrX5+hSBC3fMcgExeEwPBkCp2yCk0kIX73+FT3G\nqMrxsrCFRwKBgQCLsttFWwstof8RY+oGNpJqVfspHbeeTwagNzv1ZAecUbYMoeDl\nlYkCLN8s1UG45eaPyJNSPsr6cjPJ6+VsG4cFVOKgYia/iwOAyGGGtHIb00Nxt69K\naMxSh9T7HMfpVTbpBPa3uMNzH5ikR6lSOClLPe4bZmsurszSumBFTLmlMQKBgCE0\n6VS336zE4KWXH0wd+dcqJYgHitpUhPNJgJLcoJ4oMCewf82yc6EMbOGvYpThG67h\nXHBmpeitTv3M7cfga2faymhnzCTdtBBd5vkAESi54a19+501nsnVaNlOcav4DtNG\n9CbJk5Oro+H4hbF0ofaNNhCpawIoMNK194x7ekRhAoGBAI8GJp7D6u7BY3Pi/bs1\ns90M7YHDUqYGNTryudiIBWqtLxE4pGpf8iFU+bi39q0/8yAXzUdBCU2uYNTjcn8S\n0sI9+efar/WEtZqFS50A1P6axnr6rZG2diWj9RC361hzqrjI54xnkRc7sQxaVTTO\ny3k3uy3NAcEoT1RhUjJ/PcNq\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@gas-station-app-nomard.iam.gserviceaccount.com",
  client_id: "116104766812933667989",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gas-station-app-nomard.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "gas-station-app-nomard",
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, body: messageBody, data = {} } = body

    if (!userId || !title || !messageBody) {
      return NextResponse.json({ error: "Missing required fields: userId, title, and body" }, { status: 400 })
    }

    // Get FCM tokens for the user
    const tokens = await getFCMTokensForUser(userId)

    if (tokens.length === 0) {
      return NextResponse.json({ error: "No FCM tokens found for user" }, { status: 404 })
    }

    // Prepare the message
    const message = {
      notification: {
        title: title,
        body: messageBody,
        icon: "/favicon.ico",
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      tokens: tokens.map((token) => token.token),
    }

    // Send the message
    const response = await admin.messaging().sendEachForMulticast(message)

    // Handle failed tokens
    const failedTokens: string[] = []
    response.responses.forEach((resp: any, idx: number) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx].token)
        console.error("Failed to send to token:", tokens[idx].token, resp.error)
      }
    })

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens: failedTokens,
      message: "Notification sent successfully",
    })
  } catch (error: any) {
    console.error("Error sending FCM notification:", error)
    return NextResponse.json({ error: error.message || "Failed to send notification" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "FCM Send API is working",
    endpoints: {
      POST: "/api/fcm/send - Send FCM notification",
    },
  })
}

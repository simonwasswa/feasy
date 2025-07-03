import { supabase } from "./supabase"
import { createMessageNotificationPayload } from "../lib/push-notifications"
import { sendMessageNotification } from "../lib/firebase-notifications"

export interface ChartMessage {
  id: number
  chat_message_receiver: string
  message: string
  created_by: string
  created_at: string
  chat_room_id?: number | null
}

export interface ChatRoom {
  id: string
  name: string
  email: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isOnline: boolean
  created_by: string
  chat_message_receiver?: string
  chat_room_id?: number | null
  type?: "room" | "direct"
  description?: string
  members_count?: number
  gas_station_id?: number
}

export interface DatabaseChatRoom {
  chat_room_id: number // Updated to match your actual table
  user_id: string // Updated to match your actual table
  created_by: string
  created_at: string
  gas_station_id?: number // Added based on your table structure
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar_url?: string
  role: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface ChatSettings {
  auto_response_enabled: boolean
  response_delay_seconds: number
  custom_responses: Record<string, string>
}

// Store active subscriptions to prevent duplicates
const activeSubscriptions = new Map<string, any>()

// Send push notification for new message
export async function sendMessagePushNotification(message: ChartMessage) {
  try {
    console.log("Triggering push notification for message:", message.id)

    // Only send push notifications for messages received by admins
    if (!message.chat_message_receiver) {
      console.log("No receiver specified, skipping push notification")
      return
    }

    // Get receiver's user profile to check if they're an admin
    const receiverProfile = await getUserProfile(message.chat_message_receiver)
    if (!receiverProfile || receiverProfile.role !== "admin") {
      console.log("Receiver is not an admin, skipping push notification")
      return
    }

    // Get sender information
    const senderName = await getUserDisplayName(message.created_by)
    const senderAvatar = await getUserAvatar(message.created_by)

    // Create notification payload
    const payload = createMessageNotificationPayload(message, senderName, senderAvatar)

    // Send push notification via API
    const response = await fetch("/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: message.chat_message_receiver,
        payload: payload,
        messageData: message,
      }),
    })

    if (!response.ok) {
      throw new Error(`Push notification API returned ${response.status}`)
    }

    const result = await response.json()
    console.log("Push notification sent successfully:", result)

    return result
  } catch (error) {
    console.error("Error sending push notification:", error)
    // Don't throw error to avoid breaking message sending
    return null
  }
}

// Test database connection and get table structure
export async function testConnection() {
  try {
    console.log("🔍 Testing database connection...")

    // Check chat_message table
    const { data: messageTableInfo, error: messageTableError } = await supabase
      .from("chat_message")
      .select("*")
      .limit(1)

    if (messageTableError) {
      console.error("chat_message table error:", messageTableError)
      return { connected: false, columns: [], error: `chat_message table: ${messageTableError.message}` }
    }

    // Check chat_room table with correct column names
    const { data: roomTableInfo, error: roomTableError } = await supabase
      .from("chat_room")
      .select("chat_room_id, user_id, created_by, created_at, gas_station_id")
      .limit(1)

    if (roomTableError) {
      console.warn("chat_room table error:", roomTableError)
      if (roomTableError.code === "42P01" || roomTableError.message.includes("does not exist")) {
        console.log("⚠️ chat_room table doesn't exist - only direct messages will be available")
      }
    } else {
      console.log("✅ chat_room table exists with structure:", roomTableInfo?.[0] || "No records found")
    }

    // Get message count
    const { count, error: countError } = await supabase
      .from("chat_message")
      .select("count", { count: "exact", head: true })

    if (countError) {
      console.error("Count error:", countError)
      return { connected: false, columns: [], error: countError.message }
    }

    console.log("✅ Database connected successfully. Message count:", count)
    console.log("chat_message sample:", messageTableInfo?.[0] || "No records found")
    console.log("chat_room sample:", roomTableInfo?.[0] || "No records found")

    return { connected: true, columns: [], error: null }
  } catch (error) {
    console.error("Connection test failed:", error)
    return { connected: false, columns: [], error: String(error) }
  }
}

// Check if chat_room table exists and get chat rooms - Updated for your table structure
export async function getChatRoomsFromDatabase(): Promise<DatabaseChatRoom[]> {
  try {
    console.log("🏠 Fetching chat rooms from chat_room table...")

    // Fetch with your actual column names
    const { data, error } = await supabase
      .from("chat_room")
      .select("chat_room_id, user_id, created_by, created_at, gas_station_id")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching chat rooms:", error)
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        console.log("❌ chat_room table doesn't exist yet")
        return []
      }
      return []
    }

    console.log(`✅ Found ${data?.length || 0} chat rooms in database`)
    console.log("Chat rooms data:", data)

    return data as DatabaseChatRoom[]
  } catch (error) {
    console.error("Get chat rooms from database error:", error)
    return []
  }
}

// Get messages for a specific chat room - Updated to use chat_room_id
export async function getChatRoomMessages(chatRoomId: number): Promise<ChartMessage[]> {
  try {
    console.log(`💬 Fetching messages for chat room: ${chatRoomId}`)

    const { data, error } = await supabase
      .from("chat_message")
      .select("*")
      .eq("chat_room_id", chatRoomId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching chat room messages:", error)
      throw new Error(`Failed to fetch chat room messages: ${error.message}`)
    }

    console.log(`✅ Found ${data?.length || 0} messages in chat room ${chatRoomId}`)
    return data as ChartMessage[]
  } catch (error) {
    console.error("Get chat room messages error:", error)
    throw error
  }
}

// Get last message for a chat room
export async function getLastMessageForChatRoom(chatRoomId: number): Promise<ChartMessage | null> {
  try {
    const { data, error } = await supabase
      .from("chat_message")
      .select("*")
      .eq("chat_room_id", chatRoomId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error fetching last message for chat room:", error)
      return null
    }

    return (data?.[0] as ChartMessage) || null
  } catch (error) {
    console.error("Get last message for chat room error:", error)
    return null
  }
}

// Get message count for a chat room
export async function getChatRoomMessageCount(chatRoomId: number): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("chat_message")
      .select("count", { count: "exact", head: true })
      .eq("chat_room_id", chatRoomId)

    if (error) {
      console.error("Error getting chat room message count:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("Get chat room message count error:", error)
    return 0
  }
}

// Generate a simple numeric chat room ID based on user IDs
export function generateChatRoomId(user1: string, user2: string): number {
  try {
    // Create a consistent room identifier by sorting the user IDs
    const sortedUsers = [user1, user2].sort()
    const roomIdentifier = `${sortedUsers[0]}_${sortedUsers[1]}`

    // Use a simple hash-like approach to generate a consistent numeric ID
    let hash = 0
    for (let i = 0; i < roomIdentifier.length; i++) {
      const char = roomIdentifier.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    // Ensure positive number and make it reasonable size
    const roomId = Math.abs(hash) % 1000000000 // Keep it under 1 billion

    console.log(`Generated chat room ID: ${roomId} for users: ${user1.slice(-8)} and ${user2.slice(-8)}`)
    return roomId
  } catch (error) {
    console.error("Error generating chat room ID:", error)
    // Fallback: use timestamp-based ID
    return Math.floor(Date.now() / 1000) % 1000000000
  }
}

// Get or create chat room ID for two users
export async function getChatRoomId(user1: string, user2: string): Promise<number> {
  try {
    // First, try to find existing conversation
    const { data: existingRoom, error: searchError } = await supabase
      .from("chat_message")
      .select("chat_room_id")
      .or(
        `and(created_by.eq.${user1},chat_message_receiver.eq.${user2}),and(created_by.eq.${user2},chat_message_receiver.eq.${user1})`,
      )
      .not("chat_room_id", "is", null)
      .limit(1)

    if (!searchError && existingRoom && existingRoom.length > 0 && existingRoom[0].chat_room_id) {
      console.log(`Found existing chat room ID: ${existingRoom[0].chat_room_id}`)
      return existingRoom[0].chat_room_id
    }

    // Generate new room ID if none found
    const roomId = generateChatRoomId(user1, user2)
    console.log(`Generated new chat room ID: ${roomId} for users: ${user1} and ${user2}`)
    return roomId
  } catch (error) {
    console.error("Error getting chat room ID:", error)
    // Fallback: generate simple ID
    return generateChatRoomId(user1, user2)
  }
}

// Fetch all messages for a specific receiver (logged-in user's UUID)
export async function getMessagesForReceiver(receiverUUID: string) {
  try {
    const { data, error } = await supabase
      .from("chat_message")
      .select("*")
      .eq("chat_message_receiver", receiverUUID)
      .order("created_at", { ascending: true }) // Oldest first, newest at bottom

    if (error) {
      console.error("Error fetching messages for receiver:", error)
      throw new Error(`Failed to fetch messages: ${error.message}`)
    }

    console.log(`Fetched ${data?.length || 0} messages for receiver: ${receiverUUID}`)
    return data as ChartMessage[]
  } catch (error) {
    console.error("Get messages for receiver error:", error)
    throw error
  }
}

// Send a new message with improved error handling
export async function sendMessage(messageData: {
  chat_message_receiver: string
  message: string
}) {
  try {
    // Generate chat room ID
    const chatRoomId = await getChatRoomId(messageData.chat_message_receiver, messageData.chat_message_receiver)

    const messageToInsert = {
      chat_message_receiver: messageData.chat_message_receiver,
      message: messageData.message,
      chat_room_id: chatRoomId,
      // Removed created_by - let database handle automatically
      // Removed created_at - let database handle automatically
    }

    console.log("Inserting message:", messageToInsert)

    // Try to insert the message
    const { data, error } = await supabase.from("chat_message").insert([messageToInsert]).select()

    if (error) {
      console.error("Error sending message:", error)

      // If it's a foreign key constraint error, try without chat_room_id
      if (error.code === "23503" || error.message.includes("foreign key constraint")) {
        console.log("Retrying without chat_room_id due to foreign key constraint...")

        const messageWithoutRoomId = {
          chat_message_receiver: messageData.chat_message_receiver,
          message: messageData.message,
          chat_room_id: null, // Set to null to avoid constraint issues
          // Removed created_by - let database handle automatically
          // Removed created_at - let database handle automatically
        }

        const { data: retryData, error: retryError } = await supabase
          .from("chat_message")
          .insert([messageWithoutRoomId])
          .select()

        if (retryError) {
          console.error("Retry also failed:", retryError)
          throw new Error(`Failed to send message: ${retryError.message}`)
        }

        console.log("Message sent successfully (without room ID):", retryData)
        return retryData
      }

      throw new Error(`Failed to send message: ${error.message}`)
    }

    console.log("Message sent successfully:", data)
    // Add this after the successful message insertion, before the return statement
    // Trigger push notification for the receiver
    if (data && data[0]) {
      // Don't await this to avoid blocking the message sending
      sendMessagePushNotification(data[0]).catch((error) => {
        console.error("Failed to send push notification:", error)
      })
    }

    // Send Firebase push notification to receiver
    if (data && data[0]) {
      // Get sender display name
      const senderName = await getUserDisplayName(data[0].created_by || "Unknown User")

      // Send Firebase notification (don't await to avoid blocking)
      sendMessageNotification(messageData.chat_message_receiver, senderName, messageData.message, {
        senderId: data[0].created_by || "",
        messageId: data[0].id?.toString() || "",
        chatRoomId: data[0].chat_room_id?.toString() || "",
      }).catch((error) => {
        console.error("Failed to send Firebase notification:", error)
      })
    }
    return data
  } catch (error) {
    console.error("Send message error:", error)
    throw error
  }
}

// Get unique chat partners (people who sent messages to the user) - ENHANCED VERSION
export async function getChatRooms(currentUserUUID: string) {
  try {
    const connectionTest = await testConnection()
    if (!connectionTest.connected) {
      throw new Error(`Database connection failed: ${connectionTest.error}`)
    }

    console.log(`📋 Loading chat rooms for user: ${currentUserUUID}`)

    // First, get actual chat rooms from chat_room table
    const databaseChatRooms = await getChatRoomsFromDatabase()
    const chatRoomsList: ChatRoom[] = []

    // Convert database chat rooms to ChatRoom format - Updated for your table structure
    for (const dbRoom of databaseChatRooms) {
      const lastMessage = await getLastMessageForChatRoom(dbRoom.chat_room_id)
      const messageCount = await getChatRoomMessageCount(dbRoom.chat_room_id)

      // Create a meaningful name based on gas station or user
      const roomName = dbRoom.gas_station_id ? `Gas Station ${dbRoom.gas_station_id}` : `Room ${dbRoom.chat_room_id}`

      chatRoomsList.push({
        id: `room_${dbRoom.chat_room_id}`,
        name: roomName,
        email: `Chat Room #${dbRoom.chat_room_id}`,
        lastMessage: lastMessage?.message || "No messages yet",
        lastMessageTime: lastMessage ? formatTimeAgo(lastMessage.created_at) : formatTimeAgo(dbRoom.created_at),
        unreadCount: 0,
        isOnline: true, // Chat rooms are always "online"
        created_by: dbRoom.created_by,
        chat_room_id: dbRoom.chat_room_id,
        type: "room",
        description: `Gas Station ${dbRoom.gas_station_id || "Unknown"}`,
        members_count: messageCount,
        gas_station_id: dbRoom.gas_station_id,
      })
    }

    // Then get direct message conversations
    const { data, error } = await supabase
      .from("chat_message")
      .select("chat_message_receiver, message, created_by, created_at, chat_room_id")
      .or(`chat_message_receiver.eq.${currentUserUUID},created_by.eq.${currentUserUUID}`)
      .is("chat_room_id", null) // Only get direct messages (not chat room messages)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching direct messages:", error)
      // Return just chat rooms if direct messages fail
      return chatRoomsList
    }

    if (data && data.length > 0) {
      console.log(`Found ${data.length} direct messages for user`)

      // Group by conversation partner to create direct message rooms
      const chatPartnersMap = new Map<string, ChatRoom>()

      data.forEach((msg) => {
        // Determine who the conversation partner is
        const partnerId = msg.created_by === currentUserUUID ? msg.chat_message_receiver : msg.created_by

        if (partnerId && partnerId !== currentUserUUID && !chatPartnersMap.has(partnerId)) {
          // Create a display name from the UUID (you might want to join with a users table for real names)
          const partnerName = `User ${partnerId.slice(-8)}` // Use last 8 chars of UUID

          chatPartnersMap.set(partnerId, {
            id: partnerId,
            name: partnerName,
            email: partnerId, // Using UUID as identifier
            lastMessage: msg.message,
            lastMessageTime: formatTimeAgo(msg.created_at),
            unreadCount: 0,
            isOnline: Math.random() > 0.3, // Random online status for demo
            created_by: partnerId,
            chat_room_id: msg.chat_room_id,
            type: "direct",
          })
        }
      })

      const directMessageRooms = Array.from(chatPartnersMap.values())
      chatRoomsList.push(...directMessageRooms)
    }

    console.log(
      `✅ Total rooms loaded: ${chatRoomsList.length} (${databaseChatRooms.length} chat rooms, ${chatRoomsList.length - databaseChatRooms.length} direct messages)`,
    )
    return chatRoomsList
  } catch (error) {
    console.error("Get chat rooms error:", error)
    throw error
  }
}

// Get conversation between current user and a specific partner OR chat room messages
export async function getConversation(currentUserUUID: string, partnerUUID: string, chatRoomId?: number) {
  try {
    if (chatRoomId) {
      // Get chat room messages
      console.log(`💬 Loading chat room messages for room: ${chatRoomId}`)
      return await getChatRoomMessages(chatRoomId)
    } else {
      // Get direct messages between users
      console.log(`💬 Loading conversation between ${currentUserUUID.slice(-8)} and ${partnerUUID.slice(-8)}`)

      const { data, error } = await supabase
        .from("chat_message")
        .select("*")
        .or(
          `and(created_by.eq.${currentUserUUID},chat_message_receiver.eq.${partnerUUID}),and(created_by.eq.${partnerUUID},chat_message_receiver.eq.${currentUserUUID})`,
        )
        .is("chat_room_id", null) // Only get direct messages
        .order("created_at", { ascending: true }) // Oldest first for chat display

      if (error) {
        console.error("Error fetching conversation:", error)
        throw new Error(`Failed to fetch conversation: ${error.message}`)
      }

      console.log(`✅ Fetched ${data?.length || 0} messages in conversation`)
      return data as ChartMessage[]
    }
  } catch (error) {
    console.error("Get conversation error:", error)
    throw error
  }
}

// Get message count for statistics
export async function getMessageCount(userUUID?: string) {
  try {
    let query = supabase.from("chat_message").select("*", { count: "exact", head: true })

    // if (userUUID) {
    //   query = query.or(`chat_message_receiver.eq.${userUUID},created_by.eq.${userUUID}`)
    // }

    const { count, error } = await query

    if (error) {
      console.error("Error getting message count:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("Get message count error:", error)
    return 0
  }
}

// Get unique conversation partners count for a specific user
export async function getUniqueSendersCount(userUUID: string) {
  try {
    const { data, error } = await supabase
      .from("chat_message")
      .select("created_by, chat_message_receiver")
      .or(`chat_message_receiver.eq.${userUUID},created_by.eq.${userUUID}`)

    if (error) {
      console.error("Error getting conversation partners:", error)
      return 0
    }

    const uniquePartners = new Set<string>()
    data?.forEach((item) => {
      if (item.created_by !== userUUID) uniquePartners.add(item.created_by)
      if (item.chat_message_receiver !== userUUID) uniquePartners.add(item.chat_message_receiver)
    })

    return uniquePartners.size
  } catch (error) {
    console.error("Get unique conversation partners count error:", error)
    return 0
  }
}

// Clean up subscription by channel name
export function cleanupSubscription(channelName: string) {
  const existingSubscription = activeSubscriptions.get(channelName)
  if (existingSubscription) {
    try {
      existingSubscription.unsubscribe()
      console.log(`Cleaned up existing subscription: ${channelName}`)
    } catch (error) {
      console.warn(`Error cleaning up subscription ${channelName}:`, error)
    }
    activeSubscriptions.delete(channelName)
  }
}

// Enhanced real-time subscription for messages with duplicate prevention
export function subscribeToMessages(
  receiverUUID: string,
  onNewMessage: (message: ChartMessage) => void,
  onError?: (error: any) => void,
) {
  try {
    const channelName = `chat_messages_${receiverUUID}`

    // Clean up any existing subscription for this channel
    cleanupSubscription(channelName)

    console.log(`Setting up real-time subscription for receiver: ${receiverUUID}`)

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_message",
          filter: `chat_message_receiver=eq.${receiverUUID}`,
        },
        (payload) => {
          console.log("🔔 New message received via real-time:", payload.new)
          onNewMessage(payload.new as ChartMessage)
        },
      )
      .on("subscribe", (status) => {
        console.log("📡 Subscription status:", status)
      })
      .on("error", (error) => {
        console.error("❌ Subscription error:", error)
        if (onError) onError(error)
      })
      .subscribe()

    // Store the subscription to prevent duplicates
    activeSubscriptions.set(channelName, subscription)

    return subscription
  } catch (error) {
    console.error("Error setting up message subscription:", error)
    if (onError) onError(error)
    return null
  }
}

// Subscribe to all chat message changes (for admin dashboard notifications)
export function subscribeToAllMessages(onNewMessage: (message: ChartMessage) => void, onError?: (error: any) => void) {
  try {
    const channelName = "all_chat_messages"

    // Clean up any existing subscription for this channel
    cleanupSubscription(channelName)

    console.log("Setting up real-time subscription for all messages")

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_message",
        },
        (payload) => {
          console.log("🔔 New message in system:", payload.new)
          onNewMessage(payload.new as ChartMessage)
        },
      )
      .on("subscribe", (status) => {
        console.log("📡 All messages subscription status:", status)
      })
      .on("error", (error) => {
        console.error("❌ All messages subscription error:", error)
        if (onError) onError(error)
      })
      .subscribe()

    // Store the subscription to prevent duplicates
    activeSubscriptions.set(channelName, subscription)

    return subscription
  } catch (error) {
    console.error("Error setting up all messages subscription:", error)
    if (onError) onError(error)
    return null
  }
}

// Subscribe to messages sent by current user (for sent message confirmations)
export function subscribeToSentMessages(
  senderUUID: string,
  onMessageSent: (message: ChartMessage) => void,
  onError?: (error: any) => void,
) {
  try {
    const channelName = `sent_messages_${senderUUID}`

    // Clean up any existing subscription for this channel
    cleanupSubscription(channelName)

    console.log(`Setting up sent messages subscription for sender: ${senderUUID}`)

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_message",
          filter: `created_by=eq.${senderUUID}`,
        },
        (payload) => {
          console.log("✅ Message sent confirmation:", payload.new)
          onMessageSent(payload.new as ChartMessage)
        },
      )
      .subscribe()

    // Store the subscription to prevent duplicates
    activeSubscriptions.set(channelName, subscription)

    return subscription
  } catch (error) {
    console.error("Error setting up sent messages subscription:", error)
    if (onError) onError(error)
    return null
  }
}

// Send message to chat room - Updated to use chat_room_id
export async function sendMessageToChatRoom(messageData: {
  message: string
  chat_room_id: number
}) {
  try {
    console.log(`📤 Sending message to chat room: ${messageData.chat_room_id}`)

    const messageToInsert = {
      chat_message_receiver: null, // Use null for chat room messages
      message: messageData.message,
      chat_room_id: messageData.chat_room_id,
      created_at: new Date().toLocaleString(),
    }

    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", messageToInsert)

    const { data, error } = await supabase.from("chat_message").insert([messageToInsert]).select()

    if (error) {
      console.error("Error sending message to chat room:", error)
      throw new Error(`Failed to send message to chat room: ${error.message}`)
    }

    console.log("Message sent to chat room successfully:", data)

    // Send Firebase notifications to all chat room members
    if (data && data[0]) {
      // For chat rooms, you might want to notify all members
      // This is a simplified version - you may want to get actual room members
      const senderName = await getUserDisplayName(data[0].created_by || "Unknown User")

      // Note: You'll need to implement logic to get chat room members
      // For now, this is a placeholder
      console.log("Chat room message sent, Firebase notifications would be sent to room members")
    }
    return data
  } catch (error) {
    console.error("Send message to chat room error:", error)
    throw error
  }
}

// Subscribe to chat room messages
export function subscribeToChatRoomMessages(
  chatRoomId: number,
  onNewMessage: (message: ChartMessage) => void,
  onError?: (error: any) => void,
) {
  try {
    const channelName = `chat_room_${chatRoomId}`

    // Clean up any existing subscription for this channel
    cleanupSubscription(channelName)

    console.log(`Setting up real-time subscription for chat room: ${chatRoomId}`)

    const subscription = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_message",
          filter: `chat_room_id=eq.${chatRoomId}`,
        },
        (payload) => {
          console.log("🔔 New message in chat room:", payload.new)
          onNewMessage(payload.new as ChartMessage)
        },
      )
      .on("subscribe", (status) => {
        console.log("📡 Chat room subscription status:", status)
      })
      .on("error", (error) => {
        console.error("❌ Chat room subscription error:", error)
        if (onError) onError(error)
      })
      .subscribe()

    // Store the subscription to prevent duplicates
    activeSubscriptions.set(channelName, subscription)

    return subscription
  } catch (error) {
    console.error("Error setting up chat room subscription:", error)
    if (onError) onError(error)
    return null
  }
}

// Clean up all active subscriptions
export function cleanupAllSubscriptions() {
  console.log("Cleaning up all active subscriptions...")
  activeSubscriptions.forEach((subscription, channelName) => {
    try {
      subscription.unsubscribe()
      console.log(`Cleaned up subscription: ${channelName}`)
    } catch (error) {
      console.warn(`Error cleaning up subscription ${channelName}:`, error)
    }
  })
  activeSubscriptions.clear()
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  } catch (error) {
    console.error("Error formatting time:", error)
    return "Unknown"
  }
}

// Get all messages for debugging
export async function getAllMessages() {
  try {
    const { data, error } = await supabase.from("chat_message").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching all messages:", error)
      throw new Error(`Failed to fetch messages: ${error.message}`)
    }

    return data as ChartMessage[]
  } catch (error) {
    console.error("Get all messages error:", error)
    throw error
  }
}

// Check if user is online (you can enhance this with presence)
export async function checkUserOnlineStatus(userUUID: string): Promise<boolean> {
  // This is a placeholder - you can implement actual presence tracking
  // For now, return random status for demo purposes
  return Math.random() > 0.3
}

// Get recent activity for dashboard
export async function getRecentActivity(limit = 10) {
  try {
    const { data, error } = await supabase
      .from("chat_message")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching recent activity:", error)
      return []
    }

    return data as ChartMessage[]
  } catch (error) {
    console.error("Get recent activity error:", error)
    return []
  }
}

// Get all messages from chat_message table (for admin view)
export async function getAllChatMessages() {
  try {
    const { data, error } = await supabase.from("chat_message").select("*").order("created_at", { ascending: false }) // Newest first

    if (error) {
      console.error("Error fetching all chat messages:", error)
      throw new Error(`Failed to fetch all messages: ${error.message}`)
    }

    console.log(`Fetched ${data?.length || 0} total messages from chat_message table`)
    return data as ChartMessage[]
  } catch (error) {
    console.error("Get all chat messages error:", error)
    throw error
  }
}

// Get all unique users (both senders and receivers)
export async function getAllChatUsers() {
  try {
    const { data, error } = await supabase.from("chat_message").select("chat_message_receiver, created_by")

    if (error) {
      console.error("Error fetching chat users:", error)
      throw new Error(`Failed to fetch chat users: ${error.message}`)
    }

    // Get unique users from both sender and receiver fields
    const allUsers = new Set<string>()
    data?.forEach((msg) => {
      if (msg.chat_message_receiver) allUsers.add(msg.chat_message_receiver)
      if (msg.created_by) allUsers.add(msg.created_by)
    })

    return Array.from(allUsers).map((userId) => ({
      id: userId,
      name: `User ${userId.slice(-8)}`,
      email: userId,
    }))
  } catch (error) {
    console.error("Get all chat users error:", error)
    throw error
  }
}

// Get conversation between any two users
export async function getConversationBetweenUsers(user1UUID: string, user2UUID: string) {
  try {
    const { data, error } = await supabase
      .from("chat_message")
      .select("*")
      .or(
        `and(created_by.eq.${user1UUID},chat_message_receiver.eq.${user2UUID}),and(created_by.eq.${user2UUID},chat_message_receiver.eq.${user1UUID})`,
      )
      .order("created_at", { ascending: true }) // Oldest first for chat display

    if (error) {
      console.error("Error fetching conversation between users:", error)
      throw new Error(`Failed to fetch conversation: ${error.message}`)
    }

    console.log(`Fetched ${data?.length || 0} messages between ${user1UUID.slice(-8)} and ${user2UUID.slice(-8)}`)
    return data as ChartMessage[]
  } catch (error) {
    console.error("Get conversation between users error:", error)
    throw error
  }
}

// Get all chat rooms from all messages (admin view) - ENHANCED VERSION
export async function getAllChatRooms() {
  try {
    const connectionTest = await testConnection()
    if (!connectionTest.connected) {
      throw new Error(`Database connection failed: ${connectionTest.error}`)
    }

    console.log("Loading all chat rooms from database...")

    // First, get actual chat rooms from chat_room table
    const databaseChatRooms = await getChatRoomsFromDatabase()
    const allRoomsList: ChatRoom[] = []

    // Convert database chat rooms to ChatRoom format - Updated for your table structure
    for (const dbRoom of databaseChatRooms) {
      const lastMessage = await getLastMessageForChatRoom(dbRoom.chat_room_id)
      const messageCount = await getChatRoomMessageCount(dbRoom.chat_room_id)

      // Create a meaningful name based on gas station or user
      const roomName = dbRoom.gas_station_id ? `Gas Station ${dbRoom.gas_station_id}` : `Room ${dbRoom.chat_room_id}`

      allRoomsList.push({
        id: `room_${dbRoom.chat_room_id}`,
        name: roomName,
        email: `Chat Room #${dbRoom.chat_room_id}`,
        lastMessage: lastMessage?.message || "No messages yet",
        lastMessageTime: lastMessage ? formatTimeAgo(lastMessage.created_at) : formatTimeAgo(dbRoom.created_at),
        unreadCount: 0,
        isOnline: true, // Chat rooms are always "online"
        created_by: dbRoom.created_by,
        chat_room_id: dbRoom.chat_room_id,
        type: "room",
        description: `Gas Station ${dbRoom.gas_station_id || "Unknown"}`,
        members_count: messageCount,
        gas_station_id: dbRoom.gas_station_id,
      })
    }

    // Then get all direct message conversations
    const { data, error } = await supabase
      .from("chat_message")
      .select("chat_message_receiver, message, created_by, created_at, chat_room_id")
      .is("chat_room_id", null) // Only get direct messages
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching all direct messages:", error)
      // Return just chat rooms if direct messages fail
      return allRoomsList
    }

    if (data && data.length > 0) {
      console.log(`Processing ${data.length} messages to create direct message rooms`)

      // Group by unique conversation pairs
      const conversationsMap = new Map<string, ChatRoom>()

      data.forEach((msg) => {
        const sender = msg.created_by
        const receiver = msg.chat_message_receiver

        if (sender && receiver) {
          // Create a consistent conversation key (sorted to avoid duplicates)
          const conversationKey = [sender, receiver].sort().join("_")

          if (!conversationsMap.has(conversationKey)) {
            // Create a display name based on the participants
            const displayName = `${sender.slice(-8)} ↔ ${receiver.slice(-8)}`

            conversationsMap.set(conversationKey, {
              id: conversationKey,
              name: displayName,
              email: `${sender} - ${receiver}`,
              lastMessage: msg.message,
              lastMessageTime: formatTimeAgo(msg.created_at),
              unreadCount: 0,
              isOnline: Math.random() > 0.3, // Random online status for demo
              created_by: sender,
              chat_message_receiver: receiver,
              chat_room_id: msg.chat_room_id,
              type: "direct",
            })
          }
        }
      })

      const directMessageRooms = Array.from(conversationsMap.values())
      allRoomsList.push(...directMessageRooms)
    }

    console.log(
      `✅ All rooms loaded: ${allRoomsList.length} (${databaseChatRooms.length} chat rooms, ${allRoomsList.length - databaseChatRooms.length} direct messages)`,
    )
    return allRoomsList
  } catch (error) {
    console.error("Get all chat rooms error:", error)
    throw error
  }
}

// Get total message statistics
export async function getAllMessageStatistics() {
  try {
    const { data, error } = await supabase
      .from("chat_message")
      .select("chat_message_receiver, created_by, chat_room_id")

    if (error) {
      console.error("Error getting message statistics:", error)
      return {
        totalMessages: 0,
        uniqueUsers: 0,
        uniqueConversations: 0,
      }
    }

    const totalMessages = data?.length || 0
    const allUsers = new Set<string>()
    const conversations = new Set<string>()

    data?.forEach((msg) => {
      if (msg.chat_message_receiver) allUsers.add(msg.chat_message_receiver)
      if (msg.created_by) allUsers.add(msg.created_by)

      // Create conversation identifier
      if (msg.created_by && msg.chat_message_receiver) {
        const conversationKey = [msg.created_by, msg.chat_message_receiver].sort().join("_")
        conversations.add(conversationKey)
      }
    })

    return {
      totalMessages,
      uniqueUsers: allUsers.size,
      uniqueConversations: conversations.size,
    }
  } catch (error) {
    console.error("Get message statistics error:", error)
    return {
      totalMessages: 0,
      uniqueUsers: 0,
      uniqueConversations: 0,
    }
  }
}

// Send automated response back to user
export async function sendAutomatedResponse(originalMessage: ChartMessage, responseText: string) {
  try {
    const responseMessage = {
      chat_message_receiver: originalMessage.created_by, // Send back to original sender
      message: responseText,
      // Removed created_by - let database handle automatically (should be the system/admin)
      // Removed created_at - let database handle automatically
    }

    console.log("Sending automated response:", responseMessage)

    const { data, error } = await supabase.from("chat_message").insert([responseMessage]).select()

    if (error) {
      console.error("Error sending automated response:", error)
      throw new Error(`Failed to send automated response: ${error.message}`)
    }

    console.log("Automated response sent successfully:", data)
    return data[0] as ChartMessage
  } catch (error) {
    console.error("Send automated response error:", error)
    throw error
  }
}

// Generate automated responses based on message content
export function generateAutomatedResponse(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Simple keyword-based responses
  if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    return "Hello! 👋 How can I help you today?"
  }

  if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
    return "I'm here to help! What specific issue are you experiencing?"
  }

  if (lowerMessage.includes("fuel") || lowerMessage.includes("pump")) {
    return "I can help with fuel-related issues. Can you provide more details about the problem?"
  }

  if (lowerMessage.includes("station") || lowerMessage.includes("location")) {
    return "For station-related inquiries, I can check our system. Which station are you referring to?"
  }

  if (lowerMessage.includes("payment") || lowerMessage.includes("card")) {
    return "For payment issues, please check if your card is properly inserted and try again. If the problem persists, contact your bank."
  }

  if (lowerMessage.includes("thank") || lowerMessage.includes("thanks")) {
    return "You're welcome! Is there anything else I can help you with? 😊"
  }

  if (lowerMessage.includes("bye") || lowerMessage.includes("goodbye")) {
    return "Goodbye! Have a great day and safe travels! 🚗"
  }

  // Default response
  return "Thank you for your message. I've received your inquiry and will get back to you shortly. If this is urgent, please call our support line."
}

// User Profile Management Functions

// Get user profile by user ID
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase.from("user_profile").select("*").eq("user_id", userId).single()

    if (error) {
      if (error.code === "PGRST116") {
        // No profile found, return null
        return null
      }
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        // Table doesn't exist yet, return null
        console.log("user_profile table doesn't exist yet")
        return null
      }
      console.error("Error fetching user profile:", error)
      return null // Return null instead of throwing error
    }

    return data as UserProfile
  } catch (error) {
    console.error("Get user profile error:", error)
    return null
  }
}

// Create or update user profile
export async function upsertUserProfile(
  profile: Partial<UserProfile> & { user_id: string },
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profile")
      .upsert([profile], { onConflict: "user_id" })
      .select()
      .single()

    if (error) {
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        console.log("user_profile table doesn't exist yet. Please run the create-user-profiles-table.sql script.")
        return null
      }
      console.error("Error upserting user profile:", error)
      throw new Error(`Failed to save user profile: ${error.message}`)
    }

    console.log("User profile saved successfully:", data)
    return data as UserProfile
  } catch (error) {
    console.error("Upsert user profile error:", error)
    throw error
  }
}

// Get all user profiles
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase.from("user_profile").select("*").order("name", { ascending: true })

    if (error) {
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        console.log("user_profile table doesn't exist yet")
        return []
      }
      console.error("Error fetching all user profiles:", error)
      return []
    }

    return data as UserProfile[]
  } catch (error) {
    console.error("Get all user profiles error:", error)
    return []
  }
}

// Get user profile by email
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase.from("user_profile").select("*").eq("email", email).single()

    if (error) {
      if (error.code === "PGRST116") {
        return null
      }
      console.error("Error fetching user profile by email:", error)
      throw new Error(`Failed to fetch user profile: ${error.message}`)
    }

    return data as UserProfile
  } catch (error) {
    console.error("Get user profile by email error:", error)
    return null
  }
}

// Enhanced function to get display name for a user
export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const profile = await getUserProfile(userId)
    if (profile) {
      return profile.name
    }
    // Fallback to UUID slice if no profile found
    return `User ${userId.slice(-8)}`
  } catch (error) {
    console.error("Error getting user display name:", error)
    return `User ${userId.slice(-8)}`
  }
}

// Enhanced function to get user avatar
export async function getUserAvatar(userId: string): Promise<string> {
  try {
    const profile = await getUserProfile(userId)
    if (profile && profile.avatar_url) {
      return profile.avatar_url
    }
    // Fallback to placeholder
    return "/placeholder.svg?height=40&width=40"
  } catch (error) {
    console.error("Error getting user avatar:", error)
    return "/placeholder.svg?height=40&width=40"
  }
}

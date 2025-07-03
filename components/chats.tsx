"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "./auth-provider"
import {
  MessageCircle,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Users,
  Search,
  Phone,
  Video,
  Info,
  AlertCircle,
  Plus,
  Database,
  Wifi,
  WifiOff,
  User,
  RefreshCw,
  Hash,
  Fuel,
  Check,
  CheckCheck,
  Clock,
  Bell,
  BellOff,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { UserProfileDialog } from "./user-profile-dialog"
import { getUserProfile, type UserProfile } from "../db/chart-message"
import {
  registerToken,
  sendTestNotification,
  sendMessageNotification,
  isNotificationSupported,
  getNotificationPermission,
  setupForegroundMessageListener,
} from "../lib/firebase-notifications"
import {
  getChatRooms,
  getAllChatRooms,
  getAllChatMessages,
  getAllMessageStatistics,
  getConversation,
  getConversationBetweenUsers,
  sendMessage,
  sendMessageToChatRoom,
  subscribeToAllMessages,
  subscribeToMessages,
  subscribeToChatRoomMessages,
  testConnection,
  getMessageCount,
  getUniqueSendersCount,
  getMessagesForReceiver,
  cleanupAllSubscriptions,
  generateAutomatedResponse,
  sendAutomatedResponse,
  type ChartMessage,
  type ChatRoom,
} from "../db/chart-message"
import { toast } from "@/hooks/use-toast"

export function Chats() {
  const { user } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChartMessage[]>([])
  const [allUserMessages, setAllUserMessages] = useState<ChartMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbConnected, setDbConnected] = useState<boolean | null>(null)
  const [totalMessages, setTotalMessages] = useState(0)
  const [uniqueSenders, setUniqueSenders] = useState(0)
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [newSenderUUID, setNewSenderUUID] = useState("")
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false)
  const [lastMessageTime, setLastMessageTime] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<"user" | "all">("user")
  const [allMessages, setAllMessages] = useState<ChartMessage[]>([])
  const [globalStats, setGlobalStats] = useState({
    totalMessages: 0,
    uniqueUsers: 0,
    uniqueConversations: 0,
  })

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map())

  // Firebase notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")
  const [fcmTokenRegistered, setFcmTokenRegistered] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, allUserMessages])

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up all subscriptions...")
      cleanupAllSubscriptions()
    }
  }, [])

  // Initialize Firebase notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!user?.id) return

      console.log("🔥 Initializing Firebase notifications...")

      // Check if notifications are supported
      if (!isNotificationSupported()) {
        console.log("❌ Notifications not supported in this browser")
        return
      }

      // Check current permission status
      const permission = getNotificationPermission()
      setNotificationPermission(permission)

      if (permission === "granted") {
        // Register FCM token
        const registered = await registerToken(user.id)
        setFcmTokenRegistered(registered)
        setNotificationsEnabled(registered)

        if (registered) {
          console.log("✅ Firebase notifications initialized successfully")
          toast({
            title: "Notifications Enabled",
            description: "You'll receive push notifications for new messages",
          })

          // Setup foreground message listener
          setupForegroundMessageListener((payload: any) => {
            console.log("📱 Foreground notification received:", payload)
            toast({
              title: payload.notification?.title || "New Message",
              description: payload.notification?.body || "You have a new message",
            })
          })
        }
      }
    }

    initializeNotifications()
  }, [user?.id])

  // Test database connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true)
        const connectionTest = await testConnection()
        setDbConnected(connectionTest.connected)

        if (!connectionTest.connected) {
          setError(`Database connection failed: ${connectionTest.error}`)
        } else {
          console.log("✅ Database connection successful")
        }
      } catch (error) {
        console.error("Connection check failed:", error)
        setDbConnected(false)
        setError("Failed to connect to database. Please check your Supabase configuration.")
      } finally {
        setIsLoading(false)
      }
    }

    checkConnection()
  }, [])

  // Load data when database is connected and user is available
  useEffect(() => {
    if (dbConnected && user?.id) {
      console.log(`🚀 Loading data for user: ${user.id} in ${viewMode} mode`)
      loadChatRooms()
      if (viewMode === "all") {
        loadAllMessages()
      } else {
        loadAllUserMessages()
      }
      loadStatistics()
      loadUserProfiles()
      setupRealTimeSubscriptions()
    }
  }, [dbConnected, user, viewMode])

  // Load conversation when room is selected
  useEffect(() => {
    if (selectedRoom && dbConnected && user?.id) {
      console.log(`Loading conversation for room: ${selectedRoom.id}`)
      if (selectedRoom.type === "room" && selectedRoom.chat_room_id) {
        // Load chat room messages
        loadConversation(selectedRoom.created_by, undefined, selectedRoom.chat_room_id)
      } else if (viewMode === "all" && selectedRoom.chat_message_receiver) {
        // Load direct messages between two users (admin view)
        loadConversation(selectedRoom.created_by, selectedRoom.chat_message_receiver)
      } else {
        // Load direct messages between current user and partner
        loadConversation(selectedRoom.created_by)
      }
    }
  }, [selectedRoom, dbConnected, user, viewMode])

  // Setup real-time subscriptions with automated responses
  const setupRealTimeSubscriptions = useCallback(() => {
    if (!user?.id || !dbConnected) return

    console.log("🚀 Setting up real-time subscriptions...")

    // Clean up any existing subscriptions first
    cleanupAllSubscriptions()

    if (selectedRoom?.type === "room" && selectedRoom.chat_room_id) {
      // Subscribe to chat room messages
      const chatRoomSubscription = subscribeToChatRoomMessages(
        selectedRoom.chat_room_id,
        (newMessage) => {
          console.log("📨 New message in chat room:", newMessage)
          setLastMessageTime(new Date().toISOString())

          // Add message to current conversation
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === newMessage.id)
            if (exists) return prev
            return [...prev, newMessage]
          })

          // Refresh chat rooms and statistics
          loadChatRooms()
          loadStatistics()

          // Show toast notification
          toast({
            title: "New Message",
            description: `New message in ${selectedRoom.name}`,
          })
        },
        (error) => {
          console.error("❌ Chat room subscription error:", error)
          setIsRealTimeConnected(false)
        },
      )

      if (chatRoomSubscription) {
        setIsRealTimeConnected(true)
        console.log("✅ Chat room real-time subscription active")
      }
    } else if (viewMode === "user") {
      // Subscribe to messages for current user
      const messageSubscription = subscribeToMessages(
        user.id,
        async (newMessage) => {
          console.log("📨 New message received:", newMessage)
          setLastMessageTime(new Date().toISOString())

          // Add message to all user messages
          setAllUserMessages((prev) => {
            const exists = prev.some((msg) => msg.id === newMessage.id)
            if (exists) return prev
            return [...prev, newMessage]
          })

          // Add message to current conversation if it's from the selected sender
          if (selectedRoom && newMessage.created_by === selectedRoom.created_by) {
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMessage.id)
              if (exists) return prev
              return [...prev, newMessage]
            })
          }

          // Send automated response after a short delay
          setTimeout(async () => {
            try {
              const responseText = generateAutomatedResponse(newMessage.message)
              await sendAutomatedResponse(newMessage, responseText)

              toast({
                title: "Auto-response sent",
                description: "Automated response has been sent to the user",
              })
            } catch (error) {
              console.error("Failed to send automated response:", error)
            }
          }, 2000) // 2 second delay

          // Refresh chat rooms and statistics
          loadChatRooms()
          loadStatistics()

          // Show toast notification
          toast({
            title: "New Message",
            description: `New message from User ${newMessage.created_by.slice(-8)}`,
          })
        },
        (error) => {
          console.error("❌ Real-time subscription error:", error)
          setIsRealTimeConnected(false)
          toast({
            title: "Connection Error",
            description: "Real-time updates disconnected",
            variant: "destructive",
          })
        },
      )

      if (messageSubscription) {
        setIsRealTimeConnected(true)
        console.log("✅ User real-time subscription active")
      }
    } else {
      // Subscribe to all messages for admin view
      const allMessagesSubscription = subscribeToAllMessages(
        async (newMessage) => {
          console.log("📨 New message in system:", newMessage)
          setLastMessageTime(new Date().toISOString())

          // Update all messages list
          setAllMessages((prev) => {
            const exists = prev.some((msg) => msg.id === newMessage.id)
            if (exists) return prev
            return [newMessage, ...prev] // Add to beginning for newest first
          })

          // Add message to current conversation if relevant
          if (
            selectedRoom &&
            (newMessage.created_by === selectedRoom.created_by ||
              newMessage.chat_message_receiver === selectedRoom.created_by ||
              (selectedRoom.chat_message_receiver &&
                (newMessage.created_by === selectedRoom.chat_message_receiver ||
                  newMessage.chat_message_receiver === selectedRoom.chat_message_receiver)))
          ) {
            setMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMessage.id)
              if (exists) return prev
              return [...prev, newMessage]
            })
          }

          // Refresh chat rooms and statistics
          loadChatRooms()
          loadStatistics()

          // Show toast notification
          toast({
            title: "New Message",
            description: `New message from User ${newMessage.created_by.slice(-8)}`,
          })
        },
        (error) => {
          console.error("❌ Real-time subscription error:", error)
          setIsRealTimeConnected(false)
          toast({
            title: "Connection Error",
            description: "Real-time updates disconnected",
            variant: "destructive",
          })
        },
      )

      if (allMessagesSubscription) {
        setIsRealTimeConnected(true)
        console.log("✅ Admin real-time subscription active")
      }
    }
  }, [user?.id, dbConnected, selectedRoom, viewMode])

  const loadChatRooms = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      console.log(`📋 Loading chat rooms for user: ${user.id} in ${viewMode} mode`)

      let rooms: ChatRoom[] = []
      if (viewMode === "all") {
        // For admin view, get all conversations
        rooms = await getAllChatRooms()
      } else {
        // For user view, get conversations where user is involved
        rooms = await getChatRooms(user.id)
      }

      console.log(`✅ Loaded ${rooms.length} chat rooms`)

      // Enhance rooms with user profile information (if available)
      const enhancedRooms = await Promise.all(
        rooms.map(async (room) => {
          try {
            if (room.type === "room") {
              // For chat rooms, keep the gas station name
              return room
            } else {
              // For direct messages, try to get user profile
              const profile = await getUserProfile(room.created_by)
              return {
                ...room,
                name: profile?.name || `User ${room.created_by.slice(-8)}`,
                email: profile?.email || room.created_by,
              }
            }
          } catch (error) {
            // If profile fetch fails, use fallback values
            return room
          }
        }),
      )

      setChatRooms(enhancedRooms)

      // Select first room if none selected and rooms exist
      if (!selectedRoom && enhancedRooms.length > 0) {
        setSelectedRoom(enhancedRooms[0])
      }
    } catch (error: any) {
      console.error("❌ Error loading chat rooms:", error)
      setError(error.message || "Failed to load chat rooms")
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllUserMessages = async () => {
    if (!user?.id) return

    try {
      console.log(`📨 Loading all messages for user: ${user.id}`)
      const userMessages = await getMessagesForReceiver(user.id)
      setAllUserMessages(userMessages)
      console.log(`✅ Loaded ${userMessages.length} user messages`)
    } catch (error: any) {
      console.error("❌ Error loading all user messages:", error)
    }
  }

  const loadConversation = async (partnerUUID: string, secondPartnerUUID?: string, chatRoomId?: number) => {
    if (!user?.id) return

    try {
      console.log(`💬 Loading conversation with: ${partnerUUID.slice(-8)}${chatRoomId ? ` in room ${chatRoomId}` : ""}`)

      let conversation: ChartMessage[] = []

      if (chatRoomId) {
        // Load chat room messages
        conversation = await getConversation(user.id, partnerUUID, chatRoomId)
      } else if (viewMode === "all" && secondPartnerUUID) {
        // For admin view, show conversation between two specific users
        conversation = await getConversationBetweenUsers(partnerUUID, secondPartnerUUID)
      } else {
        // For user view, show messages between current user and partner
        conversation = await getConversation(user.id, partnerUUID)
      }

      setMessages(conversation)
      console.log(`✅ Loaded ${conversation.length} messages in conversation`)
    } catch (error: any) {
      console.error("❌ Error loading conversation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load conversation",
        variant: "destructive",
      })
    }
  }

  const loadStatistics = async () => {
    if (!user?.id) return

    try {
      console.log(`📊 Loading statistics in ${viewMode} mode`)

      if (viewMode === "all") {
        const stats = await getAllMessageStatistics()
        setGlobalStats(stats)
        setTotalMessages(stats.totalMessages)
        setUniqueSenders(stats.uniqueUsers)
      } else {
        const [messageCount, sendersCount] = await Promise.all([
          getMessageCount(user.id),
          getUniqueSendersCount(user.id),
        ])
        setTotalMessages(messageCount)
        setUniqueSenders(sendersCount)
      }

      console.log(`✅ Statistics loaded - Messages: ${totalMessages}, Users: ${uniqueSenders}`)
    } catch (error) {
      console.error("❌ Error loading statistics:", error)
    }
  }

  // Load user profiles for better display
  const loadUserProfiles = async () => {
    try {
      console.log("👤 Loading user profiles...")
      const profiles = new Map<string, UserProfile>()

      // Get profiles for all users in chat rooms
      for (const room of chatRooms) {
        try {
          const profile = await getUserProfile(room.created_by)
          if (profile) {
            profiles.set(room.created_by, profile)
          }
        } catch (error) {
          // Continue if individual profile fetch fails
          console.log(`Could not load profile for user ${room.created_by}`)
        }
      }

      setUserProfiles(profiles)
      console.log(`✅ Loaded ${profiles.size} user profiles`)
    } catch (error) {
      console.error("❌ Error loading user profiles:", error)
      // Don't throw error, just continue without profiles
    }
  }

  // Enhanced function to get user display info
  const getUserDisplayInfo = (userId: string) => {
    const profile = userProfiles.get(userId)
    return {
      name: profile?.name || (userId ? `User ${userId.slice(-8)}` : "Unknown User"),
      avatar: profile?.avatar_url || "/placeholder.svg?height=40&width=40",
      role: profile?.role || "User",
      email: profile?.email || userId,
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedRoom || !dbConnected || !user?.id) return

    try {
      setIsSending(true)

      if (selectedRoom.type === "room" && selectedRoom.chat_room_id) {
        // Send message to chat room
        console.log(`📤 Sending message to chat room: ${selectedRoom.chat_room_id}`)

        await sendMessageToChatRoom({
          message: newMessage.trim(),
          chat_room_id: selectedRoom.chat_room_id,
        })
      } else {
        // Send direct message
        let receiverId = selectedRoom.created_by
        if (viewMode === "all" && selectedRoom.chat_message_receiver) {
          // In admin view, we might want to send to either participant
          receiverId = selectedRoom.chat_message_receiver
        }

        console.log(`📤 Sending message to: ${receiverId.slice(-8)}`)

        const sentMessage = await sendMessage({
          chat_message_receiver: receiverId,
          message: newMessage.trim(),
        })

        // Send Firebase push notification
        if (sentMessage && sentMessage[0] && notificationsEnabled) {
          const senderName = getUserDisplayInfo(user.id).name
          await sendMessageNotification(receiverId, senderName, newMessage.trim(), {
            senderId: user.id,
            messageId: sentMessage[0].id?.toString() || "",
          })
        }
      }

      setNewMessage("")
      toast({
        title: "Message sent",
        description: "Your message has been delivered",
      })
    } catch (error: any) {
      console.error("❌ Error sending message:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleNewChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSenderUUID.trim() || !dbConnected || !user?.id) return

    try {
      setIsSending(true)
      console.log(`🆕 Creating test message from: ${newSenderUUID.trim()}`)

      await sendMessage({
        chat_message_receiver: user.id,
        message: "Hello! 👋 This is a test message to start our conversation.",
      })

      setNewSenderUUID("")
      setIsNewChatOpen(false)

      // Refresh data
      await loadChatRooms()
      await loadStatistics()

      toast({
        title: "Test message created",
        description: `Created test message from ${newSenderUUID.slice(-8)}`,
      })
    } catch (error: any) {
      console.error("❌ Error creating test message:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create test message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleRefresh = async () => {
    if (!user?.id || !dbConnected) return

    console.log("🔄 Refreshing chat data...")
    await loadChatRooms()
    await loadStatistics()

    toast({
      title: "Refreshed",
      description: "Chat data has been refreshed",
    })
  }

  const handleEnableNotifications = async () => {
    if (!user?.id) return

    try {
      const registered = await registerToken(user.id)
      setFcmTokenRegistered(registered)
      setNotificationsEnabled(registered)

      if (registered) {
        setNotificationPermission("granted")
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications for new messages",
        })
      } else {
        toast({
          title: "Failed to Enable Notifications",
          description: "Please check your browser settings and try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error enabling notifications:", error)
      toast({
        title: "Error",
        description: "Failed to enable notifications",
        variant: "destructive",
      })
    }
  }

  const handleTestNotification = async () => {
    if (!user?.id) return

    try {
      const sent = await sendTestNotification(user.id)
      if (sent) {
        toast({
          title: "Test Notification Sent",
          description: "Check your device for the test notification",
        })
      } else {
        toast({
          title: "Test Failed",
          description: "Failed to send test notification",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending test notification:", error)
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive",
      })
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const loadAllMessages = async () => {
    try {
      console.log("📨 Loading all messages from database...")
      const messages = await getAllChatMessages()
      setAllMessages(messages)
      console.log(`✅ Loaded ${messages.length} total messages`)
    } catch (error: any) {
      console.error("❌ Error loading all messages:", error)
    }
  }

  // Function to get message status icon
  const getMessageStatusIcon = (message: ChartMessage, isFromCurrentUser: boolean) => {
    if (!isFromCurrentUser) return null

    // For demo purposes, we'll show different statuses based on message age
    const messageAge = Date.now() - new Date(message.created_at).getTime()
    const minutes = messageAge / (1000 * 60)

    if (minutes < 1) {
      return <Clock className="w-3 h-3 text-gray-400" />
    } else if (minutes < 5) {
      return <Check className="w-3 h-3 text-gray-400" />
    } else {
      return <CheckCheck className="w-3 h-3 text-blue-500" />
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to access chats</p>
      </div>
    )
  }

  if (dbConnected === false || error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500">Real-time communication and support</p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Database connection failed. Please ensure the required tables exist."}
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Your Database Structure
            </h3>
            <div className="space-y-6 text-sm">
              <div>
                <p className="font-medium text-green-700">✅ Required Table (Primary):</p>
                <code className="bg-gray-100 px-2 py-1 rounded">chat_message</code>
                <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                  <li>
                    <code>id</code> (SERIAL PRIMARY KEY)
                  </li>
                  <li>
                    <code>chat_message_receiver</code> (UUID) - Who receives the message
                  </li>
                  <li>
                    <code>message</code> (TEXT) - The message content
                  </li>
                  <li>
                    <code>created_by</code> (UUID) - Who sent the message
                  </li>
                  <li>
                    <code>created_at</code> (TIMESTAMP) - When message was created
                  </li>
                  <li>
                    <code>chat_room_id</code> (INTEGER) - Optional: Link to chat room
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-blue-700">🏠 Chat Room Table (Detected):</p>
                <code className="bg-gray-100 px-2 py-1 rounded">chat_room</code>
                <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                  <li>
                    <code>chat_room_id</code> (SERIAL PRIMARY KEY)
                  </li>
                  <li>
                    <code>user_id</code> (UUID) - Associated user
                  </li>
                  <li>
                    <code>created_by</code> (UUID) - Who created the room
                  </li>
                  <li>
                    <code>created_at</code> (TIMESTAMP) - When room was created
                  </li>
                  <li>
                    <code>gas_station_id</code> (INTEGER) - Associated gas station
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-medium text-blue-800 mb-2">💡 Status:</p>
                <p className="text-blue-700 text-sm">
                  The system has been updated to work with your existing table structure. Chat rooms will be displayed
                  as "Gas Station X" based on the gas_station_id.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Messages
            {isRealTimeConnected ? (
              <Badge className="bg-green-100 text-green-700 text-xs">
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 text-xs">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
            {notificationsEnabled ? (
              <Badge className="bg-orange-100 text-orange-700 text-xs hidden sm:flex">
                <Bell className="w-3 h-3 mr-1" />
                FCM
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-700 text-xs hidden sm:flex">
                <BellOff className="w-3 h-3 mr-1" />
                No FCM
              </Badge>
            )}
          </h1>
          <p className="text-gray-500">
            {viewMode === "all"
              ? "Viewing all conversations in database"
              : `Your conversations (User: ${user.id.slice(-8)})`}
            {lastMessageTime && (
              <span className="ml-2 text-xs text-green-600">
                Last update: {new Date(lastMessageTime).toLocaleTimeString()}
              </span>
            )}
          </p>
          {userProfiles.size === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              💡 Run the create-user-profiles-table.sql script to enable user profiles and custom names
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === "user" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("user")}
              className="text-xs"
            >
              My Chats
            </Button>
            <Button
              variant={viewMode === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("all")}
              className="text-xs"
            >
              All Chats
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-transparent"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button variant="outline" onClick={() => setIsProfileDialogOpen(true)} className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </Button>

          {/* Notification Controls */}
          {!notificationsEnabled && notificationPermission !== "denied" && (
            <Button
              variant="outline"
              onClick={handleEnableNotifications}
              className="flex items-center gap-2 bg-transparent"
            >
              <Bell className="w-4 h-4" />
              Enable
            </Button>
          )}

          {notificationsEnabled && (
            <Button
              variant="outline"
              onClick={handleTestNotification}
              className="flex items-center gap-2 bg-transparent"
            >
              <Bell className="w-4 h-4" />
              Test
            </Button>
          )}

          <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Test Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Test Message</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleNewChat} className="space-y-4">
                <div>
                  <Label htmlFor="sender">Sender UUID</Label>
                  <Input
                    id="sender"
                    placeholder="Enter sender UUID (e.g., test-user-123)..."
                    value={newSenderUUID}
                    onChange={(e) => setNewSenderUUID(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">This will create a test message from this UUID to you</p>
                </div>
                <Button type="submit" disabled={isSending} className="w-full">
                  {isSending ? "Creating..." : "Create Test Message"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Notification Status Alert */}
      {!notificationsEnabled && isNotificationSupported() && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Push notifications are disabled. Click "Enable" to receive notifications for new messages.
            {notificationPermission === "denied" && " You may need to enable notifications in your browser settings."}
          </AlertDescription>
        </Alert>
      )}

      {/* Chat Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{viewMode === "all" ? "Total Messages" : "Your Messages"}</p>
                <p className="text-xl font-bold text-gray-900">{totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{viewMode === "all" ? "Unique Users" : "Chat Partners"}</p>
                <p className="text-xl font-bold text-gray-900">{uniqueSenders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Conversations</p>
                <p className="text-xl font-bold text-gray-900">{chatRooms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  notificationsEnabled ? "bg-orange-600" : "bg-gray-600"
                }`}
              >
                {notificationsEnabled ? (
                  <Bell className="w-5 h-5 text-white" />
                ) : (
                  <BellOff className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Push Notifications</p>
                <p className="text-sm font-bold text-gray-900">{notificationsEnabled ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-300px)]">
        {/* Chat List Sidebar */}
        <Card className="border-purple-100 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Conversations ({chatRooms.length})
              {isRealTimeConnected && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search chats..."
                className="pl-10 h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading chats...
              </div>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {chatRooms
                  .filter((room) => room.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`w-full text-left p-3 hover:bg-purple-50 transition-colors ${
                        selectedRoom?.id === room.id ? "bg-purple-100 border-r-2 border-purple-600" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback
                              className={`text-sm ${
                                room.type === "room" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {room.type === "room" ? (
                                room.gas_station_id ? (
                                  <Fuel className="w-4 h-4" />
                                ) : (
                                  <Hash className="w-4 h-4" />
                                )
                              ) : (
                                room.name.charAt(0).toUpperCase()
                              )}
                            </AvatarFallback>
                          </Avatar>
                          {room.isOnline && room.type !== "room" && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-sm truncate">{room.name}</p>
                              {room.type === "room" && (
                                <Badge variant="outline" className="text-xs">
                                  {room.gas_station_id ? "Station" : "Room"}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">{room.lastMessageTime}</span>
                          </div>
                          <p className="text-xs text-gray-600 truncate">
                            {room.type === "room" ? `${room.members_count || 0} messages` : room.created_by.slice(-12)}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-1">{room.lastMessage}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                {chatRooms.length === 0 && !isLoading && (
                  <div className="p-4 text-center text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium mb-1">No conversations yet</p>
                    <p className="text-sm">
                      {viewMode === "all"
                        ? "No messages found in the database"
                        : "Use 'Create Test Message' to start a conversation!"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modern Chat Messages Area */}
        <Card className="border-purple-100 lg:col-span-3 flex flex-col">
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b border-gray-200 pb-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback
                          className={`${
                            selectedRoom.type === "room" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {selectedRoom.type === "room" ? (
                            selectedRoom.gas_station_id ? (
                              <Fuel className="w-5 h-5" />
                            ) : (
                              <Hash className="w-5 h-5" />
                            )
                          ) : (
                            selectedRoom.name.charAt(0).toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {selectedRoom.isOnline && selectedRoom.type !== "room" && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {selectedRoom.name}
                        {selectedRoom.type === "room" && (
                          <Badge variant="outline" className="text-xs">
                            {selectedRoom.gas_station_id ? "Gas Station" : "Chat Room"}
                          </Badge>
                        )}
                        {isRealTimeConnected && <Badge className="bg-green-100 text-green-700 text-xs">Live</Badge>}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedRoom.type === "room"
                          ? selectedRoom.description || `Chat Room #${selectedRoom.chat_room_id}`
                          : viewMode === "all"
                            ? `Conversation: ${selectedRoom.email}`
                            : `UUID: ${selectedRoom.created_by.slice(-12)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Video className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Info className="w-4 h-4 mr-2" />
                          Chat Info
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Search className="w-4 h-4 mr-2" />
                          Search Messages
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              {/* Messages Area - Modern Chat Style */}
              <CardContent className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="font-medium mb-1">No messages in this conversation yet</p>
                      <p className="text-sm">Start the conversation by sending a message!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const showDate =
                        index === 0 || formatDate(message.created_at) !== formatDate(messages[index - 1].created_at)
                      const isFromCurrentUser = message.created_by === user.id
                      const userInfo = getUserDisplayInfo(message.created_by)

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="text-center my-6">
                              <span className="bg-white text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm border">
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div className={`flex gap-2 ${isFromCurrentUser ? "justify-end" : "justify-start"}`}>
                            {!isFromCurrentUser && (
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={userInfo.avatar || "/placeholder.svg"} alt={userInfo.name} />
                                <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                                  {userInfo.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div className={`max-w-[70%] ${isFromCurrentUser ? "text-right" : "text-left"}`}>
                              {/* Message Bubble */}
                              <div
                                className={`inline-block px-4 py-2 rounded-2xl shadow-sm ${
                                  isFromCurrentUser
                                    ? "bg-blue-500 text-white rounded-br-md"
                                    : "bg-white text-gray-900 border rounded-bl-md"
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{message.message}</p>
                              </div>

                              {/* Timestamp and Status */}
                              <div
                                className={`flex items-center gap-1 mt-1 ${isFromCurrentUser ? "justify-end" : "justify-start"}`}
                              >
                                <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
                                {getMessageStatusIcon(message, isFromCurrentUser)}
                              </div>
                            </div>

                            {isFromCurrentUser && (
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                  {user?.name?.charAt(0)?.toUpperCase() || "A"}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardContent>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4 bg-white">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" className="flex-shrink-0 bg-transparent">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      placeholder={`Message ${selectedRoom.name}...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="pr-10 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      disabled={isSending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 rounded-full w-10 h-10 p-0 flex-shrink-0"
                    disabled={!newMessage.trim() || isSending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                {!isRealTimeConnected && (
                  <p className="text-xs text-red-500 mt-2">Real-time connection lost. Messages may not send.</p>
                )}
                {notificationsEnabled && (
                  <p className="text-xs text-green-600 mt-2">
                    Push notifications enabled - recipients will be notified
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-2">Select a conversation to start messaging</p>
                <p className="text-sm text-gray-400">
                  {viewMode === "all"
                    ? "Showing all conversations from the database"
                    : `Showing your conversations (User: ${user.id.slice(-8)})`}
                </p>
                {isRealTimeConnected && (
                  <Badge className="bg-green-100 text-green-700 text-xs mt-3">
                    <Wifi className="w-3 h-3 mr-1" />
                    Real-time updates active
                  </Badge>
                )}
                {notificationsEnabled && (
                  <Badge className="bg-orange-100 text-orange-700 text-xs mt-2">
                    <Bell className="w-3 h-3 mr-1" />
                    Push notifications enabled
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* User Profile Dialog */}
      <UserProfileDialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen} />
    </div>
  )
}

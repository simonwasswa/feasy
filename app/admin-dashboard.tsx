"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AdminSidebar } from "../components/admin-sidebar"
import { DashboardOverview } from "../components/dashboard-overview"
import { StationsManagement } from "../components/stations-management"
import { OrdersManagement } from "../components/orders-management"
import { ServicesManagement } from "../components/services-management"
import { ProductsManagement } from "../components/products-management"
import { UsersManagement } from "../components/users-management"
import { Chats } from "../components/chats"
import { useAuth } from "../components/auth-provider"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, User, MessageCircle, Wifi, Shield, WifiOff, Bell } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { LocationsManagement } from "../components/locations-management"
import { Badge } from "@/components/ui/badge"
import { getMessageCount, getUniqueSendersCount, subscribeToAllMessages, getUserDisplayName } from "../db/chart-message"
import toast from "react-hot-toast"

export default function AdminDashboard() {
  const [currentView, setCurrentView] = useState("overview")
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [totalChats, setTotalChats] = useState(0)
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "connecting",
  )
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(true)

  const { user, logout } = useAuth()

  // Refs to prevent memory leaks and manage subscriptions
  const subscriptionRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isComponentMountedRef = useRef(true)
  const processedMessageIdsRef = useRef<Set<number>>(new Set()) // Use Set to track multiple message IDs

  // Memoized function to load chat statistics
  const loadChatStats = useCallback(async () => {
    if (!user?.id || !isComponentMountedRef.current) return

    try {
      console.log("📊 Loading chat statistics...")
      const [messageCount, sendersCount] = await Promise.all([getMessageCount(user.id), getUniqueSendersCount(user.id)])

      if (isComponentMountedRef.current) {
        setUnreadMessages(messageCount)
        setTotalChats(sendersCount)
        setLastUpdate(new Date())
        console.log(`✅ Stats updated: ${messageCount} messages, ${sendersCount} chats`)
      }
    } catch (error) {
      console.error("❌ Error loading chat stats:", error)
      if (isComponentMountedRef.current) {
        setConnectionStatus("error")
      }
    }
  }, [user?.id])

  // Enhanced function to show toast notification for new messages
  const showNewMessageToast = useCallback(
    async (message: any) => {
      if (!toastNotificationsEnabled || !isComponentMountedRef.current) return

      try {
        // Get sender display name
        const senderName = await getUserDisplayName(message.created_by || "Unknown User")

        // Determine the context (direct message or chat room)
        const context = message.chat_room_id ? `Chat Room #${message.chat_room_id}` : "Direct Message"

        // Truncate long messages for toast
        const truncatedMessage =
          message.message?.length > 50 ? `${message.message.substring(0, 50)}...` : message.message || "New message"

        console.log(`🔔 Showing toast for ${context} from ${senderName}`)

        // Show toast notification with react-hot-toast
        toast.success(
          (t) => (
            <div className="flex flex-col gap-2">
              <div className="font-semibold text-sm">📨 New Message from {senderName}</div>
              <div className="text-xs text-purple-600 font-medium">{context}</div>
              <div className="text-xs text-gray-600">{truncatedMessage}</div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setCurrentView("chats")
                    toast.dismiss(t.id)
                    // Dispatch custom event to navigate to specific chat if needed
                    window.dispatchEvent(new CustomEvent("navigate", { detail: "chats" }))
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1"
                >
                  View Chat
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.dismiss(t.id)} className="text-xs px-2 py-1">
                  Dismiss
                </Button>
              </div>
            </div>
          ),
          {
            duration: 6000,
            style: {
              background: "#fff",
              color: "#333",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "16px",
              maxWidth: "400px",
            },
          },
        )

        // Play notification sound (optional)
        try {
          const audio = new Audio("/notification-sound.mp3")
          audio.volume = 0.3
          audio.play().catch(() => {
            // Ignore audio play errors (user interaction required)
          })
        } catch (error) {
          // Ignore audio errors
        }

        console.log(`🔔 Toast notification shown for message from ${senderName} in ${context}`)
      } catch (error) {
        console.error("Error showing toast notification:", error)
      }
    },
    [toastNotificationsEnabled],
  )

  // Memoized function to setup real-time subscription
  const setupRealTimeSubscription = useCallback(() => {
    if (!user?.id || !isComponentMountedRef.current) return

    // Clean up existing subscription
    if (subscriptionRef.current) {
      console.log("🧹 Cleaning up existing subscription...")
      try {
        subscriptionRef.current.unsubscribe()
      } catch (error) {
        console.warn("Warning cleaning up subscription:", error)
      }
      subscriptionRef.current = null
    }

    console.log("🔔 Setting up admin dashboard real-time notifications...")
    setConnectionStatus("connecting")

    try {
      const subscription = subscribeToAllMessages(
        async (newMessage: any) => {
          if (!isComponentMountedRef.current) return

          console.log("📨 New message received via real-time:", newMessage)

          // Get the correct message ID - handle both possible property names
          const messageId = newMessage.id || (newMessage as any).chat_message_id

          if (!messageId) {
            console.warn("⚠️ Message received without ID:", newMessage)
            return
          }

          console.log(`🔍 Processing message ID: ${messageId}`)

          // Check if we've already processed this message
          if (processedMessageIdsRef.current.has(messageId)) {
            console.log("🔄 Duplicate message detected, skipping notification")
            return
          }

          // Add message ID to processed set
          processedMessageIdsRef.current.add(messageId)
          console.log(
            `✅ Added message ID ${messageId} to processed set. Total processed: ${processedMessageIdsRef.current.size}`,
          )

          // Keep only the last 100 message IDs to prevent memory issues
          if (processedMessageIdsRef.current.size > 100) {
            const idsArray = Array.from(processedMessageIdsRef.current)
            processedMessageIdsRef.current = new Set(idsArray.slice(-50)) // Keep last 50
            console.log("🧹 Cleaned up processed messages, keeping last 50")
          }

          // Update stats immediately when new message arrives
          loadChatStats()

          // Show toast notification for ALL messages (both direct and chat room)
          console.log("📨 Processing message for toast notification...")

          // For direct messages sent TO the admin
          if (newMessage.chat_message_receiver === user.id) {
            console.log("📨 Direct message for admin, showing toast notification")
            await showNewMessageToast(newMessage)
          }
          // For chat room messages (chat_message_receiver is null)
          else if (newMessage.chat_room_id && newMessage.created_by !== user.id) {
            console.log("📨 Chat room message detected, showing toast notification")
            await showNewMessageToast(newMessage)
          }
          // For system monitoring (admin sees all activity)
          else if ((user.role === "admin" || user.role === "super_admin") && newMessage.created_by !== user.id) {
            console.log("📨 System message for admin monitoring")
            if (toastNotificationsEnabled) {
              const senderName = await getUserDisplayName(newMessage.created_by || "Unknown User")
              const receiverName = newMessage.chat_message_receiver
                ? await getUserDisplayName(newMessage.chat_message_receiver)
                : `Chat Room #${newMessage.chat_room_id}`

              toast(
                (t) => (
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-sm">💬 New System Message</div>
                    <div className="text-xs text-gray-600">
                      {senderName} → {receiverName}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCurrentView("chats")
                        toast.dismiss(t.id)
                      }}
                      className="text-xs px-2 py-1 mt-1"
                    >
                      Monitor
                    </Button>
                  </div>
                ),
                {
                  duration: 4000,
                  style: {
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "12px",
                  },
                },
              )
            }
          } else {
            console.log("📨 Message not eligible for toast notification:", {
              isDirectToAdmin: newMessage.chat_message_receiver === user.id,
              isChatRoom: !!newMessage.chat_room_id,
              isFromCurrentUser: newMessage.created_by === user.id,
              userRole: user.role,
            })
          }
        },
        (error) => {
          console.error("❌ Admin real-time subscription error:", error)
          if (isComponentMountedRef.current) {
            setIsRealTimeActive(false)
            setConnectionStatus("error")

            // Show error toast
            toast.error("Connection Error: Real-time notifications disconnected. Attempting to reconnect...", {
              duration: 4000,
            })

            // Attempt to reconnect after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isComponentMountedRef.current) {
                console.log("🔄 Attempting to reconnect...")
                setupRealTimeSubscription()
              }
            }, 5000)
          }
        },
      )

      if (subscription && isComponentMountedRef.current) {
        subscriptionRef.current = subscription
        setIsRealTimeActive(true)
        setConnectionStatus("connected")
        console.log("✅ Admin real-time notifications active")

        // Show success toast
        toast.success("🟢 Connected: Real-time notifications are now active", {
          duration: 3000,
        })
      } else if (isComponentMountedRef.current) {
        setConnectionStatus("disconnected")
        console.log("❌ Failed to setup subscription")
      }
    } catch (error) {
      console.error("❌ Error setting up subscription:", error)
      if (isComponentMountedRef.current) {
        setConnectionStatus("error")
      }
    }
  }, [user?.id, user?.role, loadChatStats, showNewMessageToast, toastNotificationsEnabled])

  // Add useEffect to handle navigation events
  useEffect(() => {
    const handleNavigation = (event: CustomEvent) => {
      setCurrentView(event.detail)
    }

    window.addEventListener("navigate", handleNavigation as EventListener)
    return () => window.removeEventListener("navigate", handleNavigation as EventListener)
  }, [])

  // Main useEffect for setting up continuous updates
  useEffect(() => {
    if (!user?.id) return

    console.log("🚀 Initializing admin dashboard real-time system...")
    isComponentMountedRef.current = true

    // Clear processed messages when component mounts
    processedMessageIdsRef.current.clear()
    console.log("🧹 Cleared processed messages on component mount")

    // Initial load of chat statistics
    loadChatStats()

    // Setup real-time subscription
    setupRealTimeSubscription()

    // Setup periodic refresh as fallback (every 30 seconds)
    intervalRef.current = setInterval(() => {
      if (isComponentMountedRef.current) {
        console.log("🔄 Periodic stats refresh...")
        loadChatStats()
      }
    }, 30000) // 30 seconds instead of 100ms

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up admin dashboard subscriptions...")
      isComponentMountedRef.current = false

      // Clean up subscription
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe()
        } catch (error) {
          console.warn("Warning cleaning up subscription:", error)
        }
        subscriptionRef.current = null
      }

      // Clean up interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      // Clean up reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Clear processed messages
      processedMessageIdsRef.current.clear()

      setIsRealTimeActive(false)
    }
  }, [user?.id, loadChatStats, setupRealTimeSubscription])

  // Effect to handle view changes and refresh stats when switching to chats
  useEffect(() => {
    if (currentView === "chats" && user?.id) {
      console.log("📱 Switched to chats view, refreshing stats...")
      loadChatStats()
    }
  }, [currentView, user?.id, loadChatStats])

  // Redirect to login if no user
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-purple-600 mx-auto" />
          <p className="text-gray-600">Access denied. Please log in.</p>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      // Clean up before logout
      isComponentMountedRef.current = false
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Logout Error: There was an error logging out. Please try again.")
    }
  }

  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh triggered...")
    loadChatStats()
    if (!isRealTimeActive) {
      setupRealTimeSubscription()
    }

    toast.loading("🔄 Refreshing connection and updating stats...", {
      duration: 2000,
    })
  }

  const toggleToastNotifications = () => {
    setToastNotificationsEnabled(!toastNotificationsEnabled)
    if (toastNotificationsEnabled) {
      toast("🔕 Notifications Disabled: Toast notifications have been turned off", {
        duration: 3000,
      })
    } else {
      toast.success("🔔 Notifications Enabled: Toast notifications have been turned on", {
        duration: 3000,
      })
    }
  }

  // Debug function to clear processed messages
  const clearProcessedMessages = () => {
    processedMessageIdsRef.current.clear()
    console.log("🧹 Manually cleared processed messages")
    toast.success("Cleared processed messages cache", { duration: 2000 })
  }

  const renderContent = () => {
    switch (currentView) {
      case "overview":
        return <DashboardOverview />
      case "stations":
        return <StationsManagement />
      case "orders":
        return <OrdersManagement />
      case "services":
        return <ServicesManagement />
      case "products":
        return <ProductsManagement />
      case "users":
        return <UsersManagement />
      case "chats":
        return <Chats />
      case "locations":
        return <LocationsManagement />
      default:
        return <DashboardOverview />
    }
  }

  const getBreadcrumbs = () => {
    switch (currentView) {
      case "overview":
        return ["Dashboard", "Overview"]
      case "stations":
        return ["Dashboard", "Gas Stations"]
      case "orders":
        return ["Dashboard", "Orders"]
      case "services":
        return ["Dashboard", "Services"]
      case "products":
        return ["Dashboard", "Products"]
      case "users":
        return ["Dashboard", "Users"]
      case "chats":
        return ["Dashboard", "Chats"]
      case "locations":
        return ["Dashboard", "Locations"]
      default:
        return ["Dashboard", "Overview"]
    }
  }

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge className="bg-green-100 text-green-700 text-xs hidden sm:flex">
            <Wifi className="w-3 h-3 mr-1" />
            Live
          </Badge>
        )
      case "connecting":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 text-xs hidden sm:flex">
            <Wifi className="w-3 h-3 mr-1 animate-pulse" />
            Connecting
          </Badge>
        )
      case "disconnected":
        return (
          <Badge className="bg-gray-100 text-gray-700 text-xs hidden sm:flex">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        )
      case "error":
        return (
          <Badge
            className="bg-red-100 text-red-700 text-xs hidden sm:flex cursor-pointer hover:bg-red-200"
            onClick={handleManualRefresh}
            title="Click to retry connection"
          >
            <WifiOff className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar currentView={currentView} />
      <SidebarInset>
        {/* Responsive Header */}
        <header className="flex h-12 xs:h-14 md:h-16 lg:h-18 xl:h-20 shrink-0 items-center gap-1 xs:gap-2 border-b border-purple-100 px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 bg-white sticky top-0 z-10">
          <SidebarTrigger className="-ml-1 h-6 w-6 xs:h-7 xs:w-7" />
          <Separator orientation="vertical" className="mr-1 xs:mr-2 h-3 xs:h-4" />

          {/* Breadcrumb - Hidden on mobile, shown on larger screens */}
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#" className="text-purple-600 text-sm lg:text-base">
                  {getBreadcrumbs()[0]}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-gray-900 text-sm lg:text-base">{getBreadcrumbs()[1]}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Mobile title when breadcrumb is hidden */}
          <div className="sm:hidden flex-1">
            <h1 className="text-sm xs:text-base font-semibold text-gray-900 truncate">{getBreadcrumbs()[1]}</h1>
          </div>

          {/* Real-time Status Indicator */}
          <div className="ml-auto flex items-center gap-2">
            {/* User Status Badge */}
            <Badge className="bg-purple-100 text-purple-700 text-xs hidden lg:flex">
              <Shield className="w-3 h-3 mr-1" />
              {user.role}
            </Badge>

            {/* Notification Status Badge */}
            <Badge
              className={`text-xs hidden md:flex cursor-pointer ${
                toastNotificationsEnabled
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={toggleToastNotifications}
              title={toastNotificationsEnabled ? "Click to disable notifications" : "Click to enable notifications"}
            >
              <Bell className="w-3 h-3 mr-1" />
              {toastNotificationsEnabled ? "Alerts On" : "Alerts Off"}
            </Badge>

            {/* Test Toast Button - for debugging */}
            {/* <Button
              size="sm"
              variant="outline"
              onClick={() => {
                toast.success("🧪 Test Toast: This is working!", {
                  duration: 3000,
                })
              }}
              className="hidden lg:flex text-xs"
              title="Test toast notifications"
            >
              Test Toast
            </Button> */}

            {/* Clear Cache Button - for debugging */}
            {/* <Button
              size="sm"
              variant="outline"
              onClick={clearProcessedMessages}
              className="hidden xl:flex text-xs bg-transparent"
              title="Clear processed messages cache"
            >
              Clear Cache
            </Button> */}

            {/* Connection Status Badge */}
            {getConnectionStatusBadge()}

            {/* Chat Notification Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView("chats")}
              className="relative hidden sm:flex"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chats
              {unreadMessages > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center animate-pulse">
                  {unreadMessages}
                </Badge>
              )}
            </Button>

            {/* Mobile Chat Button */}
            <Button variant="outline" size="sm" onClick={() => setCurrentView("chats")} className="relative sm:hidden">
              <MessageCircle className="w-4 h-4" />
              {unreadMessages > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[16px] h-4 flex items-center justify-center animate-pulse">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </Badge>
              )}
            </Button>
          </div>

          {/* User Menu - Responsive sizing */}
          <div className="ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-6 w-6 xs:h-8 xs:w-8 lg:h-10 lg:w-10 rounded-full">
                  <Avatar className="h-6 w-6 xs:h-8 xs:w-8 lg:h-10 lg:w-10">
                    <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                    <AvatarFallback className="bg-purple-100 text-purple-700 text-2xs xs:text-xs lg:text-sm">
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {unreadMessages > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 xs:w-56 lg:w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs xs:text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-2xs xs:text-xs leading-none text-muted-foreground">{user?.email}</p>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-700 text-xs w-fit">
                        <Shield className="w-3 h-3 mr-1" />
                        {user?.role}
                      </Badge>
                      {getConnectionStatusBadge()}
                    </div>
                    <p className="text-2xs text-muted-foreground">Last update: {lastUpdate.toLocaleTimeString()}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs xs:text-sm">
                  <User className="mr-2 h-3 w-3 xs:h-4 xs:w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView("chats")} className="text-xs xs:text-sm">
                  <MessageCircle className="mr-2 h-3 w-3 xs:h-4 xs:w-4" />
                  <span>Messages</span>
                  {totalChats > 0 && (
                    <Badge className="ml-auto bg-purple-100 text-purple-700 text-xs">{totalChats}</Badge>
                  )}
                  {unreadMessages > 0 && <div className="ml-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleToastNotifications} className="text-xs xs:text-sm">
                  <Bell className="mr-2 h-3 w-3 xs:h-4 xs:w-4" />
                  <span>{toastNotificationsEnabled ? "Disable" : "Enable"} Notifications</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleManualRefresh} className="text-xs xs:text-sm">
                  <Wifi className="mr-2 h-3 w-3 xs:h-4 xs:w-4" />
                  <span>Refresh Connection</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={clearProcessedMessages} className="text-xs xs:text-sm">
                  <Shield className="mr-2 h-3 w-3 xs:h-4 xs:w-4" />
                  <span>Clear Message Cache</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 text-xs xs:text-sm">
                  <LogOut className="mr-2 h-3 w-3 xs:h-4 xs:w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area - Fully responsive */}
        <div className="flex flex-1 flex-col gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12 bg-purple-50/30 min-h-screen overflow-auto">
          <div className="w-full max-w-full">{renderContent()}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

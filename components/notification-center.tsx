"use client"

import { useState } from "react"
import { Bell, Search, Check, X, Settings, Volume2, VolumeX, Smartphone, SmartphoneNfc } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNotifications } from "./notification-provider"
import { cn } from "@/lib/utils"

interface NotificationBellProps {
  onNavigateToChat?: (senderId: string) => void
}

export function NotificationBell({ onNavigateToChat }: NotificationBellProps) {
  const {
    notifications,
    stats,
    isLoading,
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
  } = useNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "unread" | "high_priority">("all")

  // Filter notifications based on current filter and search
  const filteredNotifications = notifications.filter((notification) => {
    // Apply filter
    if (filter === "unread" && notification.is_read) return false
    if (filter === "high_priority" && !["high", "urgent"].includes(notification.priority)) return false

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return notification.title.toLowerCase().includes(query) || notification.message.toLowerCase().includes(query)
    }

    return true
  })

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Navigate to chat if it's a message notification
    if (notification.notification_type === "new_message" && onNavigateToChat) {
      onNavigateToChat(notification.sender_id)
      setIsOpen(false)
    }
  }

  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestBrowserPermission()
      setBrowserNotificationsEnabled(granted)
    } else {
      setBrowserNotificationsEnabled(false)
    }
  }

  const handlePushNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      await enablePushNotifications()
    } else {
      await disablePushNotifications()
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "normal":
        return "bg-blue-500"
      case "low":
        return "bg-gray-500"
      default:
        return "bg-blue-500"
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "Urgent"
      case "high":
        return "High"
      case "normal":
        return "Normal"
      case "low":
        return "Low"
      default:
        return "Normal"
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative bg-transparent">
          <Bell className="w-4 h-4" />
          {stats.unread > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center animate-pulse">
              {stats.unread > 99 ? "99+" : stats.unread}
            </Badge>
          )}
          {!isRealTimeConnected && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-lg">Notifications</h3>
            <p className="text-sm text-gray-500">
              {stats.unread} unread • {stats.today} today
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notification Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <div className="p-3 space-y-4">
                  {/* Push Notifications */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <Label htmlFor="push-notifications" className="text-sm font-medium">
                          Push Notifications
                        </Label>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={isPushEnabled}
                        onCheckedChange={handlePushNotificationToggle}
                        disabled={!pushSubscriptionStatus.isSupported}
                      />
                    </div>
                    <p className="text-xs text-gray-500 ml-6">
                      {!pushSubscriptionStatus.isSupported
                        ? "Not supported in this browser"
                        : isPushEnabled
                          ? "Receive notifications even when dashboard is closed"
                          : "Enable to receive background notifications"}
                    </p>

                    {/* Push notification status indicators */}
                    <div className="ml-6 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <div
                          className={`w-2 h-2 rounded-full ${pushSubscriptionStatus.isSupported ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <span className={pushSubscriptionStatus.isSupported ? "text-green-600" : "text-red-600"}>
                          {pushSubscriptionStatus.isSupported ? "Supported" : "Not Supported"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div
                          className={`w-2 h-2 rounded-full ${pushSubscriptionStatus.isPermissionGranted ? "bg-green-500" : "bg-yellow-500"}`}
                        ></div>
                        <span
                          className={pushSubscriptionStatus.isPermissionGranted ? "text-green-600" : "text-yellow-600"}
                        >
                          {pushSubscriptionStatus.isPermissionGranted ? "Permission Granted" : "Permission Needed"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div
                          className={`w-2 h-2 rounded-full ${pushSubscriptionStatus.isSubscribed ? "bg-green-500" : "bg-gray-500"}`}
                        ></div>
                        <span className={pushSubscriptionStatus.isSubscribed ? "text-green-600" : "text-gray-600"}>
                          {pushSubscriptionStatus.isSubscribed ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  {/* Browser Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {browserNotificationsEnabled ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <SmartphoneNfc className="w-4 h-4" />
                      )}
                      <Label htmlFor="browser-notifications" className="text-sm">
                        Browser Notifications
                      </Label>
                    </div>
                    <Switch
                      id="browser-notifications"
                      checked={browserNotificationsEnabled}
                      onCheckedChange={handleBrowserNotificationToggle}
                    />
                  </div>

                  {/* Audio Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {audioNotificationsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      <Label htmlFor="audio-notifications" className="text-sm">
                        Sound Notifications
                      </Label>
                    </div>
                    <Switch
                      id="audio-notifications"
                      checked={audioNotificationsEnabled}
                      onCheckedChange={setAudioNotificationsEnabled}
                    />
                  </div>

                  {/* Test Notification Button */}
                  {(isPushEnabled || browserNotificationsEnabled) && (
                    <>
                      <DropdownMenuSeparator />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={testPushNotification}
                        className="w-full bg-transparent"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Test Notification
                      </Button>
                    </>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mark All Read Button */}
            {stats.unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="p-4 space-y-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search notifications..."
              className="pl-10 h-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Unread
              </TabsTrigger>
              <TabsTrigger value="high_priority" className="text-xs">
                Priority
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">No notifications</p>
              <p className="text-sm">
                {filter === "unread"
                  ? "You're all caught up!"
                  : filter === "high_priority"
                    ? "No high priority notifications"
                    : "No notifications to show"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                    !notification.is_read && "bg-blue-50",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                          {notification.sender_id.slice(-2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "absolute -top-1 -right-1 w-3 h-3 rounded-full",
                          getPriorityColor(notification.priority),
                        )}
                      ></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{formatTimeAgo(notification.created_at)}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <X className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!notification.is_read && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsDismissed(notification.id)
                                }}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Dismiss
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{notification.message}</p>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {getPriorityLabel(notification.priority)}
                        </Badge>
                        {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {isRealTimeConnected ? (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live updates active
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Offline
                </span>
              )}
            </span>
            <span>{stats.total} total notifications</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

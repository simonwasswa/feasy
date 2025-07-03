"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, AlertTriangle, Smartphone, Wifi, WifiOff } from "lucide-react"
import { isPushNotificationSupported, isServiceWorkerSupported } from "../lib/push-notifications"

interface NotificationFallbackProps {
  onEnableFallback?: () => void
}

export function NotificationFallback({ onEnableFallback }: NotificationFallbackProps) {
  const [browserSupport, setBrowserSupport] = useState({
    serviceWorker: false,
    pushManager: false,
    notifications: false,
    isOnline: true,
  })

  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    // Check browser support
    const support = {
      serviceWorker: isServiceWorkerSupported(),
      pushManager: isPushNotificationSupported(),
      notifications: "Notification" in window,
      isOnline: navigator.onLine,
    }

    setBrowserSupport(support)

    // Show fallback if any critical features are missing
    const needsFallback = !support.serviceWorker || !support.pushManager || !support.notifications
    setShowFallback(needsFallback)

    // Listen for online/offline events
    const handleOnline = () => setBrowserSupport((prev) => ({ ...prev, isOnline: true }))
    const handleOffline = () => setBrowserSupport((prev) => ({ ...prev, isOnline: false }))

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!showFallback && browserSupport.isOnline) {
    return null
  }

  const getSupportLevel = () => {
    const { serviceWorker, pushManager, notifications } = browserSupport

    if (serviceWorker && pushManager && notifications) {
      return { level: "full", color: "green", text: "Full Support" }
    } else if (notifications) {
      return { level: "partial", color: "yellow", text: "Partial Support" }
    } else {
      return { level: "none", color: "red", text: "No Support" }
    }
  }

  const supportLevel = getSupportLevel()

  return (
    <div className="space-y-4">
      {/* Browser Support Status */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Browser Notification Support</span>
              <Badge
                variant="outline"
                className={`
                  ${supportLevel.color === "green" ? "border-green-500 text-green-700 bg-green-50" : ""}
                  ${supportLevel.color === "yellow" ? "border-yellow-500 text-yellow-700 bg-yellow-50" : ""}
                  ${supportLevel.color === "red" ? "border-red-500 text-red-700 bg-red-50" : ""}
                `}
              >
                {supportLevel.text}
              </Badge>
            </div>

            {/* Feature Support Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${browserSupport.serviceWorker ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span>Service Worker</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${browserSupport.pushManager ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span>Push Manager</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${browserSupport.notifications ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span>Notifications API</span>
              </div>
              <div className="flex items-center gap-2">
                {browserSupport.isOnline ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
                <span>Network Status</span>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Fallback Options */}
      {showFallback && (
        <Alert className="border-blue-200 bg-blue-50">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Alternative Notification Methods</h4>
                <p className="text-sm mb-3">
                  Your browser has limited notification support. Here are alternative ways to stay updated:
                </p>
              </div>

              <div className="space-y-2 text-sm">
                {browserSupport.notifications && (
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Basic browser notifications (when dashboard is open)</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span>Audio alerts and visual indicators</span>
                </div>

                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-600" />
                  <span>Real-time updates when dashboard is active</span>
                </div>
              </div>

              {onEnableFallback && (
                <Button onClick={onEnableFallback} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Enable Available Features
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Browser Recommendations */}
      {supportLevel.level !== "full" && (
        <Alert className="border-gray-200 bg-gray-50">
          <Smartphone className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-700">
            <div className="space-y-2">
              <h4 className="font-medium">For the best experience, we recommend:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Chrome 42+ or Firefox 44+ for full push notification support</li>
                <li>• Edge 17+ or Safari 16+ for modern notification features</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

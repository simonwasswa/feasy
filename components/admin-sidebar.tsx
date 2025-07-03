"use client"

import { Building2, Home, Package, Settings, ShoppingCart, Users, Wrench, MessageCircle, MapPin } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"

import { FeasyLogo } from "./feasy-logo"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { useAuth } from "./auth-provider"
import { getMessageCount } from "../db/chart-message"

const navigationItems = [
  {
    title: "Overview",
    url: "/admin",
    icon: Home,
    key: "overview",
  },
  {
    title: "Gas Stations",
    url: "/admin/stations",
    icon: Building2,
    key: "stations",
  },
  {
    title: "Services",
    url: "/admin/services",
    icon: Wrench,
    key: "services",
  },
  {
    title: "Products",
    url: "/admin/products",
    icon: Package,
    key: "products",
  },
  {
    title: "Orders",
    url: "/admin/orders",
    icon: ShoppingCart,
    key: "orders",
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    key: "users",
  },
  {
    title: "Chats",
    url: "/admin/chats",
    icon: MessageCircle,
    key: "chats",
    hasNotification: true,
  },
  {
    title: "Locations",
    url: "/admin/locations",
    icon: MapPin,
    key: "locations",
  },
]

interface AdminSidebarProps {
  currentView: string
}

export function AdminSidebar({ currentView }: AdminSidebarProps) {
  const { user } = useAuth()
  const [chatNotificationCount, setChatNotificationCount] = useState(0)

  const handleNavigation = (view: string) => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: view }))
  }

  // Load chat notification count
  useEffect(() => {
    const loadChatCount = async () => {
      if (user?.id) {
        try {
          const count = await getMessageCount(user.id)
          setChatNotificationCount(count)
        } catch (error) {
          console.error("Error loading chat count:", error)
        }
      }
    }

    loadChatCount()

    // Refresh count every 30 seconds
    const interval = setInterval(loadChatCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <Sidebar className="border-r border-purple-100">
      {/* Responsive Header */}
      <SidebarHeader className="border-b border-purple-100 p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6">
        <div className="flex items-center gap-2 xs:gap-3">
          <div className="w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-purple-600 rounded-lg flex items-center justify-center">
            <FeasyLogo size={16} className="xs:hidden" />
            <FeasyLogo size={20} className="hidden xs:block sm:hidden" />
            <FeasyLogo size={24} className="hidden sm:block md:hidden" />
            <FeasyLogo size={28} className="hidden md:block" />
          </div>
          <div className="hidden sm:block">
            <h2 className="font-bold text-base sm:text-lg md:text-xl lg:text-2xl text-gray-900">Feasy</h2>
            <p className="text-2xs xs:text-xs sm:text-sm md:text-base text-purple-600">Fuel Made Easy</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="bg-purple-50/30">
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-700 font-medium text-2xs xs:text-xs sm:text-sm px-2 xs:px-3">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = currentView === item.key
                const showNotification = item.hasNotification && chatNotificationCount > 0 && !isActive

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className={`hover:bg-purple-100 cursor-pointer transition-colors text-2xs xs:text-xs sm:text-sm md:text-base p-2 xs:p-2.5 sm:p-3 relative ${
                        isActive
                          ? "bg-purple-600 text-white hover:bg-purple-700"
                          : "text-gray-700 hover:text-purple-700"
                      }`}
                      onClick={() => handleNavigation(item.key)}
                      isActive={isActive}
                    >
                      <item.icon className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      <span className="truncate">{item.title}</span>
                      {showNotification && (
                        <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[16px] h-4 flex items-center justify-center p-0">
                          {chatNotificationCount > 99 ? "99+" : chatNotificationCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Responsive Footer */}
      <SidebarFooter className="border-t border-purple-100 p-2 xs:p-3 sm:p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:bg-purple-100 text-gray-700 hover:text-purple-700 text-2xs xs:text-xs sm:text-sm md:text-base p-2 xs:p-2.5 sm:p-3">
              <Settings className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

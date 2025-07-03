"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  ArrowLeft,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const chatRooms = [
  { id: 1, name: "General Support", type: "Support" },
  { id: 2, name: "Station Managers", type: "Internal" },
  { id: 3, name: "Technical Issues", type: "Support" },
  { id: 4, name: "Fuel Delivery Updates", type: "Operations" },
]

const initialMessages = [
  {
    id: 1,
    roomId: 1,
    senderId: "user1",
    senderName: "John Customer",
    senderAvatar: "/placeholder.svg?height=40&width=40",
    content: "Hi, I'm having trouble with the fuel pump at Station #3. It's not dispensing properly.",
    timestamp: "2024-01-16 09:30:00",
    type: "text",
    isOwn: false,
  },
  {
    id: 2,
    roomId: 1,
    senderId: "admin",
    senderName: "Support Agent",
    senderAvatar: "/placeholder.svg?height=40&width=40",
    content: "Hello John! I'm sorry to hear about the issue. Let me check the status of that pump for you.",
    timestamp: "2024-01-16 09:32:00",
    type: "text",
    isOwn: true,
  },
  {
    id: 3,
    roomId: 1,
    senderId: "admin",
    senderName: "Support Agent",
    senderAvatar: "/placeholder.svg?height=40&width=40",
    content: "I can see that pump #2 at Station #3 is currently under maintenance. Please use pump #1 or #3 instead.",
    timestamp: "2024-01-16 09:33:00",
    type: "text",
    isOwn: true,
  },
  {
    id: 4,
    roomId: 1,
    senderId: "user1",
    senderName: "John Customer",
    senderAvatar: "/placeholder.svg?height=40&width=40",
    content: "Thank you! Pump #1 is working fine. When will pump #2 be fixed?",
    timestamp: "2024-01-16 09:35:00",
    type: "text",
    isOwn: false,
  },
  {
    id: 5,
    roomId: 1,
    senderId: "admin",
    senderName: "Support Agent",
    senderAvatar: "/placeholder.svg?height=40&width=40",
    content:
      "Our technician is scheduled to fix it by 2 PM today. You'll receive a notification once it's operational again.",
    timestamp: "2024-01-16 09:37:00",
    type: "text",
    isOwn: true,
  },
  {
    id: 6,
    roomId: 2,
    senderId: "manager1",
    senderName: "Station Manager A",
    senderAvatar: "/placeholder.svg?height=40&width=40",
    content: "Good morning everyone! Just wanted to update that our fuel delivery arrived early today.",
    timestamp: "2024-01-16 08:15:00",
    type: "text",
    isOwn: false,
  },
  {
    id: 7,
    roomId: 2,
    senderId: "manager2",
    senderName: "Station Manager B",
    senderAvatar: "/placeholder.svg?height=40&width=40",
    content: "That's great! We're expecting ours around noon. Any issues with the quality check?",
    timestamp: "2024-01-16 08:20:00",
    type: "text",
    isOwn: false,
  },
]

export function ChatMessages() {
  const { user } = useAuth()
  const [selectedRoomId, setSelectedRoomId] = useState(1)
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedRoom = chatRooms.find((room) => room.id === selectedRoomId)
  const roomMessages = messages.filter((msg) => msg.roomId === selectedRoomId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [roomMessages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const message = {
      id: messages.length + 1,
      roomId: selectedRoomId,
      senderId: user?.id || "current-user",
      senderName: user?.name || "You",
      senderAvatar: user?.avatar || "/placeholder.svg?height=40&width=40",
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: "text" as const,
      isOwn: true,
    }

    setMessages([...messages, message])
    setNewMessage("")
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const handleBackToRooms = () => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "chat-rooms" }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBackToRooms} className="lg:hidden">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Messages</h1>
            <p className="text-gray-500">Real-time communication and support</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Rooms Sidebar */}
        <Card className="border-purple-100 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Rooms
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search rooms..."
                className="pl-10 h-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {chatRooms
                .filter((room) => room.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full text-left p-3 hover:bg-purple-50 transition-colors ${
                      selectedRoomId === room.id ? "bg-purple-100 border-r-2 border-purple-600" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                          {room.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{room.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {room.type}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Messages Area */}
        <Card className="border-purple-100 lg:col-span-3 flex flex-col">
          {/* Chat Header */}
          <CardHeader className="border-b border-purple-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-purple-100 text-purple-700">
                    {selectedRoom?.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedRoom?.name}</h3>
                  <p className="text-sm text-gray-500">{roomMessages.length} messages</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4" />
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
                      Room Info
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

          {/* Messages Area */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {roomMessages.map((message, index) => {
              const showDate =
                index === 0 || formatDate(message.timestamp) !== formatDate(roomMessages[index - 1].timestamp)

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center my-4">
                      <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {formatDate(message.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className={`flex gap-3 ${message.isOwn ? "flex-row-reverse" : ""}`}>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={message.senderAvatar || "/placeholder.svg"} alt={message.senderName} />
                      <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                        {message.senderName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[70%] ${message.isOwn ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{message.senderName}</span>
                        <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                      </div>
                      <div
                        className={`inline-block p-3 rounded-lg ${
                          message.isOwn ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Message Input */}
          <div className="border-t border-purple-100 p-4">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm">
                <Paperclip className="w-4 h-4" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="pr-10"
                />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2">
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}

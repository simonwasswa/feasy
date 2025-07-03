"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "./auth-provider"
import { getUserProfile, upsertUserProfile, type UserProfile } from "../db/chart-message"
import { toast } from "@/hooks/use-toast"
import { User, Camera, Save, X } from "lucide-react"

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string // If provided, edit this user's profile (admin feature)
}

export function UserProfileDialog({ open, onOpenChange, userId }: UserProfileDialogProps) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: "",
    email: "",
    role: "User",
    phone: "",
    bio: "",
    avatar_url: "/placeholder.svg?height=40&width=40",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const targetUserId = userId || user?.id
  const isEditingOwnProfile = !userId || userId === user?.id

  useEffect(() => {
    if (open && targetUserId) {
      loadUserProfile()
    }
  }, [open, targetUserId])

  const loadUserProfile = async () => {
    if (!targetUserId) return

    try {
      setIsLoading(true)
      const existingProfile = await getUserProfile(targetUserId)

      if (existingProfile) {
        setProfile(existingProfile)
      } else {
        // Set defaults for new profile
        setProfile({
          name: user?.name || "",
          email: user?.email || "",
          role: user?.role || "User",
          phone: "",
          bio: "",
          avatar_url: user?.avatar || "/placeholder.svg?height=40&width=40",
        })
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!targetUserId) return

    try {
      setIsSaving(true)

      const profileData = {
        ...profile,
        user_id: targetUserId,
      }

      await upsertUserProfile(profileData)

      toast({
        title: "Profile saved",
        description: "User profile has been updated successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save user profile",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real app, you'd upload this to storage
      // For now, we'll use a placeholder
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfile((prev) => ({
          ...prev,
          avatar_url: e.target?.result as string,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {isEditingOwnProfile ? "Edit Your Profile" : "Edit User Profile"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading profile...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.name} />
                  <AvatarFallback className="bg-purple-100 text-purple-700 text-xl">
                    {profile.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-700 transition-colors">
                  <Camera className="w-3 h-3 text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{profile.name || "New User"}</h3>
                <p className="text-sm text-gray-500">{profile.email}</p>
                <p className="text-xs text-purple-600">{profile.role}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={profile.name || ""}
                  onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={profile.role || "User"}
                    onValueChange={(value) => setProfile((prev) => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="User">User</SelectItem>
                      <SelectItem value="Customer">Customer</SelectItem>
                      <SelectItem value="Support Agent">Support Agent</SelectItem>
                      <SelectItem value="Station Manager">Station Manager</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !profile.name || !profile.email}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

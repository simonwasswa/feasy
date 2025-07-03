"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Users,
  Search,
  Calendar,
  Phone,
  Mail,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Database,
  UserPlus,
  Wifi,
  WifiOff,
  AlertTriangle,
  UserCheck,
  Shield,
  Tag,
} from "lucide-react"
import {
  getAllUserProfiles,
  getAllUserRoles,
  getAllUserTypes,
  getUserStatistics,
  updateUserProfile,
  deleteUserProfile,
  createUserProfile,
  subscribeToUserProfiles,
  detectUserTableStructure,
  assignUserRoleAndType,
  bulkAssignRoles,
  bulkAssignTypes,
  type EnhancedUserProfile,
  type UserRole,
  type UserType,
} from "../db/users"
import { toast } from "@/hooks/use-toast"

export function UsersManagement() {
  const [users, setUsers] = useState<EnhancedUserProfile[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [userTypes, setUserTypes] = useState<UserType[]>([])
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    maleUsers: 0,
    femaleUsers: 0,
    otherUsers: 0,
    recentUsers: 0,
    totalRoles: 0,
    totalTypes: 0,
    usersWithRoles: 0,
    usersWithTypes: 0,
    usersWithoutRoles: 0,
    usersWithoutTypes: 0,
  })
  const [tableStructure, setTableStructure] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [viewingUser, setViewingUser] = useState<EnhancedUserProfile | null>(null)
  const [editingUser, setEditingUser] = useState<EnhancedUserProfile | null>(null)
  const [assigningUser, setAssigningUser] = useState<EnhancedUserProfile | null>(null)
  const [roleFilter, setRoleFilter] = useState("All Roles")
  const [typeFilter, setTypeFilter] = useState("All Types")
  const [genderFilter, setGenderFilter] = useState("All Genders")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [bulkAssignMode, setBulkAssignMode] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; user: EnhancedUserProfile | null }>({
    isOpen: false,
    user: null,
  })

  // Load all data with better error handling
  const loadUserData = async () => {
    try {
      setLoading(true)
      console.log("🔄 Loading user management data...")

      // Detect table structure first
      const structure = await detectUserTableStructure()
      setTableStructure(structure)

      // Load all data in parallel with individual error handling
      const results = await Promise.allSettled([
        getAllUserProfiles(),
        getAllUserRoles(),
        getAllUserTypes(),
        getUserStatistics(),
      ])

      // Process results with fallbacks
      if (results[0].status === "fulfilled") {
        setUsers(results[0].value)
        console.log(`✅ Loaded ${results[0].value.length} users`)
      } else {
        console.error("Failed to load users:", results[0].reason)
        setUsers([])
      }

      if (results[1].status === "fulfilled") {
        setUserRoles(results[1].value)
        console.log(`✅ Loaded ${results[1].value.length} user roles`)
      } else {
        console.error("Failed to load user roles:", results[1].reason)
        setUserRoles([])
      }

      if (results[2].status === "fulfilled") {
        setUserTypes(results[2].value)
        console.log(`✅ Loaded ${results[2].value.length} user types`)
      } else {
        console.error("Failed to load user types:", results[2].reason)
        setUserTypes([])
      }

      if (results[3].status === "fulfilled") {
        setStatistics(results[3].value)
        console.log("✅ Loaded user statistics")
      } else {
        console.error("Failed to load statistics:", results[3].reason)
      }

      console.log("✅ User management data loading completed")
    } catch (error) {
      console.error("❌ Error loading user data:", error)
      toast({
        title: "Error",
        description: "Failed to load user data. Please check your database connection.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Setup real-time subscription
  useEffect(() => {
    const subscription = subscribeToUserProfiles(
      (updatedUser) => {
        console.log("📨 User profile updated:", updatedUser)
        loadUserData() // Refresh data when changes occur
        toast({
          title: "User Updated",
          description: `User profile has been updated`,
        })
      },
      (error) => {
        console.error("❌ User subscription error:", error)
        setIsRealTimeActive(false)
      },
    )

    if (subscription) {
      setIsRealTimeActive(true)
      return () => {
        subscription.unsubscribe()
        setIsRealTimeActive(false)
      }
    }
  }, [])

  // Load data on component mount
  useEffect(() => {
    loadUserData()
  }, [])

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    // Role filter
    if (roleFilter !== "All Roles") {
      const userRoleName = user.user_role?.role_name || user.user_role?.name || "No Role"
      if (userRoleName !== roleFilter) return false
    }

    // Type filter
    if (typeFilter !== "All Types") {
      const userTypeName = user.user_type?.type_name || user.user_type?.name || "No Type"
      if (userTypeName !== typeFilter) return false
    }

    // Gender filter
    if (genderFilter !== "All Genders") {
      const userGender = user.gender || "Unknown"
      if (userGender.toLowerCase() !== genderFilter.toLowerCase()) return false
    }

    // Search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      return (
        user.full_name.toLowerCase().includes(searchLower) ||
        user.display_name.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  // Get unique filter options with safe access
  const roleOptions = [
    "All Roles",
    ...Array.from(new Set(userRoles.map((role) => role.role_name || role.name || "Unknown Role"))),
  ]
  const typeOptions = [
    "All Types",
    ...Array.from(new Set(userTypes.map((type) => type.type_name || type.name || "Unknown Type"))),
  ]
  const genderOptions = ["All Genders", ...Array.from(new Set(users.map((user) => user.gender).filter(Boolean)))]

  // Handle user selection for bulk operations
  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((user) => user.user_id))
    } else {
      setSelectedUsers([])
    }
  }

  // Handle bulk role assignment
  const handleBulkRoleAssignment = async (roleId: number | null) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to assign roles to.",
        variant: "destructive",
      })
      return
    }

    try {
      await bulkAssignRoles(selectedUsers, roleId)
      toast({
        title: "Success",
        description: `Role assigned to ${selectedUsers.length} users successfully`,
      })
      setSelectedUsers([])
      setBulkAssignMode(false)
      loadUserData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign roles to users",
        variant: "destructive",
      })
    }
  }

  // Handle bulk type assignment
  const handleBulkTypeAssignment = async (typeId: number | null) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to assign types to.",
        variant: "destructive",
      })
      return
    }

    try {
      await bulkAssignTypes(selectedUsers, typeId)
      toast({
        title: "Success",
        description: `Type assigned to ${selectedUsers.length} users successfully`,
      })
      setSelectedUsers([])
      setBulkAssignMode(false)
      loadUserData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign types to users",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = (user: EnhancedUserProfile) => {
    setDeleteConfirmation({
      isOpen: true,
      user,
    })
  }

  const confirmDeleteUser = async () => {
    if (deleteConfirmation.user) {
      try {
        await deleteUserProfile(deleteConfirmation.user.user_id)
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
        loadUserData() // Refresh data
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        })
      }
    }
    setDeleteConfirmation({ isOpen: false, user: null })
  }

  const getGenderIcon = (gender: string | null) => {
    switch (gender?.toLowerCase()) {
      case "male":
        return "👨"
      case "female":
        return "👩"
      default:
        return "👤"
    }
  }

  const getRoleColor = (role: string | undefined) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-red-100 text-red-700"
      case "manager":
        return "bg-blue-100 text-blue-700"
      case "user":
        return "bg-green-100 text-green-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
            {isRealTimeActive ? (
              <Badge className="bg-green-100 text-green-700">
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-700">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
          <p className="text-gray-500">Manage user profiles, assign roles and types</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadUserData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant={bulkAssignMode ? "default" : "outline"}
            onClick={() => {
              setBulkAssignMode(!bulkAssignMode)
              setSelectedUsers([])
            }}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            {bulkAssignMode ? "Exit Bulk Mode" : "Bulk Assign"}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <UserForm
                userRoles={userRoles}
                userTypes={userTypes}
                onClose={() => setIsAddDialogOpen(false)}
                onSave={loadUserData}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Assignment Controls */}
      {bulkAssignMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Bulk Assignment Mode ({selectedUsers.length} users selected)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select onValueChange={(value) => handleBulkRoleAssignment(value === "null" ? null : Number(value))}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Assign Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Remove Role</SelectItem>
                    {userRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id?.toString() || ""}>
                        {role.role_name || role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(value) => handleBulkTypeAssignment(value === "null" ? null : Number(value))}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Assign Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Remove Type</SelectItem>
                    {userTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id?.toString() || ""}>
                        {type.type_name || type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Structure Debug Info */}
      {tableStructure && (
        <Alert className="border-blue-200 bg-blue-50">
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Database Structure Detected:</strong>
            <br />• user_profile:{" "}
            {tableStructure.user_profile.exists
              ? `✅ (${tableStructure.user_profile.columns.length} columns: ${tableStructure.user_profile.columns.slice(0, 5).join(", ")}${tableStructure.user_profile.columns.length > 5 ? "..." : ""})`
              : "❌ Not found"}
            <br />• user_role:{" "}
            {tableStructure.user_role.exists
              ? `✅ (${tableStructure.user_role.columns.length} columns: ${tableStructure.user_role.columns.join(", ")})`
              : "❌ Not found"}
            <br />• user_type:{" "}
            {tableStructure.user_type.exists
              ? `✅ (${tableStructure.user_type.columns.length} columns: ${tableStructure.user_type.columns.join(", ")})`
              : "❌ Not found"}
          </AlertDescription>
        </Alert>
      )}

      {/* Show warning if no data */}
      {!loading && users.length === 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>No users found.</strong> This could mean:
            <br />• Your user_profile table is empty
            <br />• There's a connection issue with your database
            <br />• The table structure doesn't match expected format
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-xl font-bold text-gray-900">{statistics.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">With Roles</p>
                <p className="text-xl font-bold text-gray-900">{statistics.usersWithRoles}</p>
                <p className="text-xs text-gray-400">{statistics.usersWithoutRoles} without roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">With Types</p>
                <p className="text-xl font-bold text-gray-900">{statistics.usersWithTypes}</p>
                <p className="text-xs text-gray-400">{statistics.usersWithoutTypes} without types</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Recent Users</p>
                <p className="text-xl font-bold text-gray-900">{statistics.recentUsers}</p>
                <p className="text-xs text-gray-400">Last 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search users by name, email, or phone"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by gender" />
            </SelectTrigger>
            <SelectContent>
              {genderOptions.map((gender) => (
                <SelectItem key={gender} value={gender}>
                  {gender}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-gray-900">
              All Users ({filteredUsers.length} of {users.length})
            </span>
            {bulkAssignMode && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {bulkAssignMode && <TableHead className="w-12">Select</TableHead>}
                  <TableHead className="min-w-[200px]">User</TableHead>
                  <TableHead className="min-w-[120px]">Contact</TableHead>
                  <TableHead className="min-w-[100px]">Gender</TableHead>
                  <TableHead className="min-w-[120px]">Role</TableHead>
                  <TableHead className="min-w-[120px]">Type</TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">Join Date</TableHead>
                  <TableHead className="min-w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      {bulkAssignMode && (
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.user_id)}
                            onCheckedChange={(checked) => handleUserSelection(user.user_id, checked as boolean)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <Avatar className="flex-shrink-0">
                            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.full_name} />
                            <AvatarFallback className="bg-purple-100 text-purple-700">
                              {user.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                            <p className="text-sm text-gray-500 truncate">@{user.display_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="space-y-1">
                          {user.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="truncate">{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <div className="flex items-center gap-1">
                          <span>{getGenderIcon(user.gender)}</span>
                          <span className="text-sm">{user.gender || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <Badge className={getRoleColor(user.user_role?.role_name || user.user_role?.name)}>
                          {user.user_role?.role_name || user.user_role?.name || "No Role"}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <Badge className="bg-blue-100 text-blue-700">
                          {user.user_type?.type_name || user.user_type?.name || "No Type"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 min-w-[120px] hidden md:table-cell">
                        {user.join_date}
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => setViewingUser(user)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => setAssigningUser(user)}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hidden sm:flex"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={bulkAssignMode ? 8 : 7} className="h-24 text-center">
                      No users found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View User Dialog */}
      {viewingUser && (
        <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
          <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details - {viewingUser.full_name}</DialogTitle>
            </DialogHeader>
            <UserDetails user={viewingUser} />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User - {editingUser.full_name}</DialogTitle>
            </DialogHeader>
            <UserForm
              user={editingUser}
              userRoles={userRoles}
              userTypes={userTypes}
              onClose={() => setEditingUser(null)}
              onSave={loadUserData}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Assign Role/Type Dialog */}
      {assigningUser && (
        <Dialog open={!!assigningUser} onOpenChange={() => setAssigningUser(null)}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>Assign Role & Type - {assigningUser.full_name}</DialogTitle>
            </DialogHeader>
            <AssignmentForm
              user={assigningUser}
              userRoles={userRoles}
              userTypes={userTypes}
              onClose={() => setAssigningUser(null)}
              onSave={loadUserData}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, user: null })}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone and all associated data will be permanently removed."
        itemName={deleteConfirmation.user?.full_name}
      />
    </div>
  )
}

function UserDetails({ user }: { user: EnhancedUserProfile }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.full_name} />
          <AvatarFallback className="bg-purple-100 text-purple-700 text-xl">
            {user.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{user.full_name}</h3>
          <p className="text-gray-500">@{user.display_name}</p>
          <div className="flex gap-2 mt-2">
            <Badge className="bg-purple-100 text-purple-700">
              {user.user_role?.role_name || user.user_role?.name || "No Role"}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700">
              {user.user_type?.type_name || user.user_type?.name || "No Type"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Personal Information</h4>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{user.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Username</p>
              <p className="font-medium">@{user.display_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium">{user.gender || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Join Date</p>
              <p className="font-medium">{user.join_date}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Contact Information</h4>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{user.email || "Not provided"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{user.phone || "Not provided"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Role & Type Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-500">User Role</p>
            <p className="font-medium text-purple-700">
              {user.user_role?.role_name || user.user_role?.name || "No Role Assigned"}
            </p>
            {user.user_role?.description && <p className="text-sm text-gray-600 mt-1">{user.user_role.description}</p>}
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-500">User Type</p>
            <p className="font-medium text-blue-700">
              {user.user_type?.type_name || user.user_type?.name || "No Type Assigned"}
            </p>
            {user.user_type?.description && <p className="text-sm text-gray-600 mt-1">{user.user_type.description}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function AssignmentForm({
  user,
  userRoles,
  userTypes,
  onClose,
  onSave,
}: {
  user: EnhancedUserProfile
  userRoles: UserRole[]
  userTypes: UserType[]
  onClose: () => void
  onSave: () => void
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(user.user_role_id || null)
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(user.user_type_id || null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await assignUserRoleAndType(user.user_id, selectedRoleId, selectedTypeId)
      toast({
        title: "Success",
        description: "Role and type assigned successfully",
      })
      onSave()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign role and type",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="role">User Role</Label>
          <Select
            value={selectedRoleId?.toString() || ""}
            onValueChange={(value) => setSelectedRoleId(value === "null" ? null : Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">No Role</SelectItem>
              {userRoles.map((role) => (
                <SelectItem key={role.id} value={role.id?.toString() || ""}>
                  {role.role_name || role.name || "Unknown Role"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type">User Type</Label>
          <Select
            value={selectedTypeId?.toString() || ""}
            onValueChange={(value) => setSelectedTypeId(value === "null" ? null : Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">No Type</SelectItem>
              {userTypes.map((type) => (
                <SelectItem key={type.id} value={type.id?.toString() || ""}>
                  {type.type_name || type.name || "Unknown Type"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2" />
              Assign Role & Type
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

function UserForm({
  user,
  userRoles,
  userTypes,
  onClose,
  onSave,
}: {
  user?: EnhancedUserProfile
  userRoles: UserRole[]
  userTypes: UserType[]
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    other_name: user?.other_name || "",
    "user-name": user?.["user-name"] || "",
    email: user?.email || "",
    phone: user?.phone || "",
    gender: user?.gender || "",
    avatar: user?.avatar || "",
    user_role_id: user?.user_role_id || null,
    user_type_id: user?.user_type_id || null,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (user) {
        // Update existing user
        await updateUserProfile(user.user_id, formData)
        toast({
          title: "Success",
          description: "User updated successfully",
        })
      } else {
        // Create new user
        await createUserProfile(formData)
        toast({
          title: "Success",
          description: "User created successfully",
        })
      }
      onSave()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: user ? "Failed to update user" : "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder="Enter first name"
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            placeholder="Enter last name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="other_name">Other Name</Label>
          <Input
            id="other_name"
            value={formData.other_name}
            onChange={(e) => setFormData({ ...formData, other_name: e.target.value })}
            placeholder="Enter other name (optional)"
          />
        </div>
        <div>
          <Label htmlFor="user-name">Username</Label>
          <Input
            id="user-name"
            value={formData["user-name"]}
            onChange={(e) => setFormData({ ...formData, "user-name": e.target.value })}
            placeholder="Enter username"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="avatar">Avatar URL</Label>
          <Input
            id="avatar"
            value={formData.avatar}
            onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
            placeholder="Enter avatar image URL"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="user_role_id">User Role</Label>
          <Select
            value={formData.user_role_id?.toString() || ""}
            onValueChange={(value) => setFormData({ ...formData, user_role_id: value ? Number.parseInt(value) : null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No Role</SelectItem>
              {userRoles.map((role) => (
                <SelectItem key={role.id} value={role.id?.toString() || ""}>
                  {role.role_name || role.name || "Unknown Role"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="user_type_id">User Type</Label>
          <Select
            value={formData.user_type_id?.toString() || ""}
            onValueChange={(value) => setFormData({ ...formData, user_type_id: value ? Number.parseInt(value) : null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No Type</SelectItem>
              {userTypes.map((type) => (
                <SelectItem key={type.id} value={type.id?.toString() || ""}>
                  {type.type_name || type.name || "Unknown Type"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {user ? "Updating..." : "Creating..."}
            </>
          ) : user ? (
            "Update User"
          ) : (
            "Create User"
          )}
        </Button>
      </div>
    </form>
  )
}

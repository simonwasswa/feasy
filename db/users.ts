import { supabase } from "./supabase"

export interface UserProfile {
  user_id: string
  first_name: string | null
  last_name: string | null
  other_name: string | null
  email: string | null
  phone: string | null
  gender: string | null
  avatar: string | null
  "user-name": string | null
  user_role_id?: number | null
  user_type_id?: number | null
  created_at?: string
  updated_at?: string
}

export interface UserRole {
  id?: number
  role_name?: string
  name?: string
  description?: string | null
  created_at?: string
  [key: string]: any
}

export interface UserType {
  id?: number
  type_name?: string
  name?: string
  description?: string | null
  created_at?: string
  [key: string]: any
}

export interface EnhancedUserProfile extends UserProfile {
  user_role?: UserRole
  user_type?: UserType
  full_name: string
  display_name: string
  status: string
  join_date: string
}

// Test database connection and detect table structure
export async function detectUserTableStructure() {
  const results = {
    user_profile: { exists: false, columns: [] as string[], sample: null as any },
    user_role: { exists: false, columns: [] as string[], sample: null as any },
    user_type: { exists: false, columns: [] as string[], sample: null as any },
  }

  try {
    // Test user_profile table
    const { data: profileData, error: profileError } = await supabase.from("user_profile").select("*").limit(1)

    if (!profileError && profileData) {
      results.user_profile.exists = true
      results.user_profile.sample = profileData[0] || null
      if (profileData[0]) {
        results.user_profile.columns = Object.keys(profileData[0])
      }
    } else if (profileError) {
      console.log("user_profile table error:", profileError.message)
    }

    // Test user_role table
    const { data: roleData, error: roleError } = await supabase.from("user_role").select("*").limit(1)

    if (!roleError && roleData) {
      results.user_role.exists = true
      results.user_role.sample = roleData[0] || null
      if (roleData[0]) {
        results.user_role.columns = Object.keys(roleData[0])
      }
    } else if (roleError) {
      console.log("user_role table error:", roleError.message)
    }

    // Test user_type table
    const { data: typeData, error: typeError } = await supabase.from("user_type").select("*").limit(1)

    if (!typeError && typeData) {
      results.user_type.exists = true
      results.user_type.sample = typeData[0] || null
      if (typeData[0]) {
        results.user_type.columns = Object.keys(typeData[0])
      }
    } else if (typeError) {
      console.log("user_type table error:", typeError.message)
    }

    console.log("🔍 User table structure detected:", results)
    return results
  } catch (error) {
    console.error("❌ Error detecting user table structure:", error)
    return results
  }
}

// Get all user profiles with roles and types
export async function getAllUserProfiles(): Promise<EnhancedUserProfile[]> {
  try {
    console.log("📊 Fetching all user profiles...")

    // Try complex join first
    let users: any[] = []
    let joinSuccessful = false

    try {
      const { data: joinedUsers, error: joinError } = await supabase
        .from("user_profile")
        .select(`
          *,
          user_role:user_role_id(*),
          user_type:user_type_id(*)
        `)
        .order("created_at", { ascending: false })

      if (!joinError && joinedUsers) {
        users = joinedUsers
        joinSuccessful = true
        console.log("✅ Complex join successful")
      }
    } catch (joinError) {
      console.log("⚠️ Complex join failed, trying simple query")
    }

    // If join fails, try simple query
    if (!joinSuccessful) {
      const { data: simpleUsers, error: simpleError } = await supabase
        .from("user_profile")
        .select("*")
        .order("created_at", { ascending: false })

      if (simpleError) {
        throw simpleError
      }
      users = simpleUsers || []
    }

    if (!users || users.length === 0) {
      console.log("ℹ️ No users found")
      return []
    }

    // Enhance user data
    const enhancedUsers: EnhancedUserProfile[] = users.map((user) => {
      const fullName = [user.first_name, user.other_name, user.last_name].filter(Boolean).join(" ") || "Unknown User"

      const displayName = user["user-name"] || fullName

      return {
        ...user,
        full_name: fullName,
        display_name: displayName,
        status: "Active", // Default status
        join_date: user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown",
      }
    })

    console.log(`✅ Fetched ${enhancedUsers.length} user profiles`)
    return enhancedUsers
  } catch (error) {
    console.error("❌ Error fetching user profiles:", error)
    return []
  }
}

// Get all user roles with flexible column handling
export async function getAllUserRoles(): Promise<UserRole[]> {
  try {
    console.log("📊 Fetching user roles...")

    const { data: roles, error } = await supabase.from("user_role").select("*")

    if (error) {
      console.error("❌ Error fetching user roles:", error)
      return []
    }

    if (!roles || roles.length === 0) {
      console.log("ℹ️ No user roles found")
      return []
    }

    // Normalize role data to handle different column names
    const normalizedRoles = roles.map((role) => ({
      ...role,
      role_name: role.role_name || role.name || `Role ${role.id}`,
      name: role.name || role.role_name || `Role ${role.id}`,
    }))

    console.log(`✅ Fetched ${normalizedRoles.length} user roles`)
    return normalizedRoles
  } catch (error) {
    console.error("❌ Error fetching user roles:", error)
    return []
  }
}

// Get all user types with flexible column handling
export async function getAllUserTypes(): Promise<UserType[]> {
  try {
    console.log("📊 Fetching user types...")

    const { data: types, error } = await supabase.from("user_type").select("*")

    if (error) {
      console.error("❌ Error fetching user types:", error)
      return []
    }

    if (!types || types.length === 0) {
      console.log("ℹ️ No user types found")
      return []
    }

    // Normalize type data to handle different column names
    const normalizedTypes = types.map((type) => ({
      ...type,
      type_name: type.type_name || type.name || `Type ${type.id}`,
      name: type.name || type.type_name || `Type ${type.id}`,
    }))

    console.log(`✅ Fetched ${normalizedTypes.length} user types`)
    return normalizedTypes
  } catch (error) {
    console.error("❌ Error fetching user types:", error)
    return []
  }
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    console.log("📝 Updating user profile:", userId, updates)

    const { data, error } = await supabase
      .from("user_profile")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    console.log("✅ User profile updated successfully")
    return data
  } catch (error) {
    console.error("❌ Error updating user profile:", error)
    throw error
  }
}

// Assign role to user
export async function assignUserRole(userId: string, roleId: number | null): Promise<boolean> {
  try {
    console.log("👤 Assigning role to user:", userId, "Role ID:", roleId)

    const { error } = await supabase
      .from("user_profile")
      .update({
        user_role_id: roleId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (error) {
      throw error
    }

    console.log("✅ User role assigned successfully")
    return true
  } catch (error) {
    console.error("❌ Error assigning user role:", error)
    throw error
  }
}

// Assign type to user
export async function assignUserType(userId: string, typeId: number | null): Promise<boolean> {
  try {
    console.log("🏷️ Assigning type to user:", userId, "Type ID:", typeId)

    const { error } = await supabase
      .from("user_profile")
      .update({
        user_type_id: typeId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (error) {
      throw error
    }

    console.log("✅ User type assigned successfully")
    return true
  } catch (error) {
    console.error("❌ Error assigning user type:", error)
    throw error
  }
}

// Assign both role and type to user
export async function assignUserRoleAndType(
  userId: string,
  roleId: number | null,
  typeId: number | null,
): Promise<boolean> {
  try {
    console.log("🎯 Assigning role and type to user:", userId, "Role ID:", roleId, "Type ID:", typeId)

    const { error } = await supabase
      .from("user_profile")
      .update({
        user_role_id: roleId,
        user_type_id: typeId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (error) {
      throw error
    }

    console.log("✅ User role and type assigned successfully")
    return true
  } catch (error) {
    console.error("❌ Error assigning user role and type:", error)
    throw error
  }
}

// Bulk assign roles to multiple users
export async function bulkAssignRoles(userIds: string[], roleId: number | null): Promise<boolean> {
  try {
    console.log("📋 Bulk assigning role to users:", userIds, "Role ID:", roleId)

    const { error } = await supabase
      .from("user_profile")
      .update({
        user_role_id: roleId,
        updated_at: new Date().toISOString(),
      })
      .in("user_id", userIds)

    if (error) {
      throw error
    }

    console.log("✅ Bulk role assignment successful")
    return true
  } catch (error) {
    console.error("❌ Error in bulk role assignment:", error)
    throw error
  }
}

// Bulk assign types to multiple users
export async function bulkAssignTypes(userIds: string[], typeId: number | null): Promise<boolean> {
  try {
    console.log("📋 Bulk assigning type to users:", userIds, "Type ID:", typeId)

    const { error } = await supabase
      .from("user_profile")
      .update({
        user_type_id: typeId,
        updated_at: new Date().toISOString(),
      })
      .in("user_id", userIds)

    if (error) {
      throw error
    }

    console.log("✅ Bulk type assignment successful")
    return true
  } catch (error) {
    console.error("❌ Error in bulk type assignment:", error)
    throw error
  }
}

// Get user statistics with role/type breakdown
export async function getUserStatistics() {
  try {
    console.log("📊 Calculating user statistics...")

    const results = await Promise.allSettled([
      supabase.from("user_profile").select("user_id", { count: "exact", head: true }),
      supabase.from("user_profile").select("gender, user_role_id, user_type_id"),
      supabase.from("user_role").select("id", { count: "exact", head: true }),
      supabase.from("user_type").select("id", { count: "exact", head: true }),
    ])

    const totalUsers = results[0].status === "fulfilled" ? results[0].value.count || 0 : 0
    const userData = results[1].status === "fulfilled" ? results[1].value.data || [] : []
    const totalRoles = results[2].status === "fulfilled" ? results[2].value.count || 0 : 0
    const totalTypes = results[3].status === "fulfilled" ? results[3].value.count || 0 : 0

    // Calculate gender breakdown
    const maleCount = userData.filter((u) => u.gender?.toLowerCase() === "male").length
    const femaleCount = userData.filter((u) => u.gender?.toLowerCase() === "female").length
    const otherCount = totalUsers - maleCount - femaleCount

    // Calculate role/type assignments
    const usersWithRoles = userData.filter((u) => u.user_role_id !== null).length
    const usersWithTypes = userData.filter((u) => u.user_type_id !== null).length
    const usersWithoutRoles = totalUsers - usersWithRoles
    const usersWithoutTypes = totalUsers - usersWithTypes

    // Calculate recent users (last 30 days) with error handling
    let recentUsers = 0
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count } = await supabase
        .from("user_profile")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString())

      recentUsers = count || 0
    } catch (error) {
      console.log("⚠️ Could not calculate recent users:", error)
    }

    const stats = {
      totalUsers,
      maleUsers: maleCount,
      femaleUsers: femaleCount,
      otherUsers: otherCount,
      recentUsers,
      totalRoles,
      totalTypes,
      usersWithRoles,
      usersWithTypes,
      usersWithoutRoles,
      usersWithoutTypes,
    }

    console.log("✅ User statistics calculated:", stats)
    return stats
  } catch (error) {
    console.error("❌ Error calculating user statistics:", error)
    return {
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
    }
  }
}

// Subscribe to user profile changes
export function subscribeToUserProfiles(onUpdate: (user: UserProfile) => void, onError: (error: any) => void) {
  try {
    console.log("🔔 Setting up user profile subscription...")

    const subscription = supabase
      .channel("user_profile_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_profile",
        },
        (payload) => {
          console.log("📨 User profile change detected:", payload)

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            onUpdate(payload.new as UserProfile)
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ User profile subscription active")
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ User profile subscription error")
          onError(new Error("Subscription failed"))
        }
      })

    return subscription
  } catch (error) {
    console.error("❌ Error setting up user profile subscription:", error)
    onError(error)
    return null
  }
}

// Create new user profile
export async function createUserProfile(
  profileData: Omit<UserProfile, "user_id"> & { user_id?: string },
): Promise<UserProfile | null> {
  try {
    console.log("➕ Creating new user profile:", profileData)

    const { data, error } = await supabase
      .from("user_profile")
      .insert([
        {
          ...profileData,
          user_id: profileData.user_id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    console.log("✅ User profile created successfully")
    return data
  } catch (error) {
    console.error("❌ Error creating user profile:", error)
    throw error
  }
}

// Delete user profile
export async function deleteUserProfile(userId: string): Promise<boolean> {
  try {
    console.log("🗑️ Deleting user profile:", userId)

    const { error } = await supabase.from("user_profile").delete().eq("user_id", userId)

    if (error) {
      throw error
    }

    console.log("✅ User profile deleted successfully")
    return true
  } catch (error) {
    console.error("❌ Error deleting user profile:", error)
    throw error
  }
}

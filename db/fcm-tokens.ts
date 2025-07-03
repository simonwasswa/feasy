import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export interface FCMToken {
  id?: number
  user_id: string
  token: string
  device_info?: any
  created_at?: string
  updated_at?: string
  is_active?: boolean
}

export interface CreateFCMTokenData {
  user_id: string
  token: string
  device_info?: Record<string, any>
}

export interface UpdateFCMTokenData {
  device_info?: Record<string, any>
  last_used_at?: string
  is_active?: boolean
}

export class FCMTokensService {
  // Create a new FCM token
  static async create(data: CreateFCMTokenData): Promise<FCMToken | null> {
    try {
      const { data: token, error } = await supabase
        .from("fcm_tokens")
        .insert({
          user_id: data.user_id,
          token: data.token,
          device_info: data.device_info || {},
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating FCM token:", error)
        return null
      }

      return token
    } catch (error) {
      console.error("Error in FCMTokensService.create:", error)
      return null
    }
  }

  // Get all active tokens for a user
  static async getByUserId(userId: string): Promise<FCMToken[]> {
    try {
      const { data: tokens, error } = await supabase
        .from("fcm_tokens")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching FCM tokens:", error)
        return []
      }

      return tokens || []
    } catch (error) {
      console.error("Error in FCMTokensService.getByUserId:", error)
      return []
    }
  }

  // Get a specific token
  static async getByToken(token: string): Promise<FCMToken | null> {
    try {
      const { data: fcmToken, error } = await supabase.from("fcm_tokens").select("*").eq("token", token).single()

      if (error) {
        console.error("Error fetching FCM token:", error)
        return null
      }

      return fcmToken
    } catch (error) {
      console.error("Error in FCMTokensService.getByToken:", error)
      return null
    }
  }

  // Update an existing token
  static async update(token: string, data: UpdateFCMTokenData): Promise<FCMToken | null> {
    try {
      const { data: updatedToken, error } = await supabase
        .from("fcm_tokens")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("token", token)
        .select()
        .single()

      if (error) {
        console.error("Error updating FCM token:", error)
        return null
      }

      return updatedToken
    } catch (error) {
      console.error("Error in FCMTokensService.update:", error)
      return null
    }
  }

  // Update last used timestamp
  static async updateLastUsed(token: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("fcm_tokens")
        .update({
          last_used_at: new Date().toISOString(),
        })
        .eq("token", token)

      if (error) {
        console.error("Error updating last used:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in FCMTokensService.updateLastUsed:", error)
      return false
    }
  }

  // Deactivate a token
  static async deactivate(token: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("fcm_tokens")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("token", token)

      if (error) {
        console.error("Error deactivating FCM token:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in FCMTokensService.deactivate:", error)
      return false
    }
  }

  // Deactivate multiple tokens
  static async deactivateMultiple(tokens: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("fcm_tokens")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .in("token", tokens)

      if (error) {
        console.error("Error deactivating multiple FCM tokens:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in FCMTokensService.deactivateMultiple:", error)
      return false
    }
  }

  // Delete a token permanently
  static async delete(token: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("fcm_tokens").delete().eq("token", token)

      if (error) {
        console.error("Error deleting FCM token:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in FCMTokensService.delete:", error)
      return false
    }
  }

  // Clean up old inactive tokens (older than 30 days)
  static async cleanupOldTokens(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data, error } = await supabase
        .from("fcm_tokens")
        .delete()
        .eq("is_active", false)
        .lt("updated_at", thirtyDaysAgo.toISOString())
        .select("id")

      if (error) {
        console.error("Error cleaning up old FCM tokens:", error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error("Error in FCMTokensService.cleanupOldTokens:", error)
      return 0
    }
  }

  // Get token statistics for a user
  static async getTokenStats(userId: string): Promise<{
    total: number
    active: number
    inactive: number
  }> {
    try {
      const { data: allTokens, error: allError } = await supabase
        .from("fcm_tokens")
        .select("is_active")
        .eq("user_id", userId)

      if (allError) {
        console.error("Error fetching token stats:", allError)
        return { total: 0, active: 0, inactive: 0 }
      }

      const total = allTokens?.length || 0
      const active = allTokens?.filter((t) => t.is_active).length || 0
      const inactive = total - active

      return { total, active, inactive }
    } catch (error) {
      console.error("Error in FCMTokensService.getTokenStats:", error)
      return { total: 0, active: 0, inactive: 0 }
    }
  }
}

export default FCMTokensService

export async function registerFCMToken(userId: string, token: string, deviceInfo: any = {}) {
  try {
    // First, try to update existing token
    const { data: existingToken, error: fetchError } = await supabase
      .from("fcm_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("token", token)
      .single()

    if (existingToken) {
      // Token already exists, update it
      const { data, error } = await supabase
        .from("fcm_tokens")
        .update({
          device_info: deviceInfo,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingToken.id)
        .select()

      if (error) throw error
      return data[0]
    } else {
      // Insert new token
      const { data, error } = await supabase
        .from("fcm_tokens")
        .insert({
          user_id: userId,
          token: token,
          device_info: deviceInfo,
          is_active: true,
        })
        .select()

      if (error) throw error
      return data[0]
    }
  } catch (error) {
    console.error("Error registering FCM token:", error)
    throw error
  }
}

export async function getFCMTokensForUser(userId: string) {
  try {
    const { data, error } = await supabase.from("fcm_tokens").select("*").eq("user_id", userId).eq("is_active", true)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching FCM tokens:", error)
    throw error
  }
}

export async function deactivateFCMToken(token: string) {
  try {
    const { data, error } = await supabase.from("fcm_tokens").update({ is_active: false }).eq("token", token).select()

    if (error) throw error
    return data[0]
  } catch (error) {
    console.error("Error deactivating FCM token:", error)
    throw error
  }
}

export async function deleteFCMToken(token: string) {
  try {
    const { data, error } = await supabase.from("fcm_tokens").delete().eq("token", token).select()

    if (error) throw error
    return data[0]
  } catch (error) {
    console.error("Error deleting FCM token:", error)
    throw error
  }
}

export async function getAllActiveFCMTokens() {
  try {
    const { data, error } = await supabase.from("fcm_tokens").select("*").eq("is_active", true)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching all FCM tokens:", error)
    throw error
  }
}

import { createClient } from "@supabase/supabase-js"

// Use your existing Supabase credentials
const supabaseUrl = "https://acmatccnqjbjaeboxwgy.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjbWF0Y2NucWpiamFlYm94d2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1Nzc2NjEsImV4cCI6MjA2MzE1MzY2MX0.MEo_H1x-PwgTU5CV54pprTIhaQReIogDDeeZIQCr5FA"

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Log successful initialization
console.log("Supabase client initialized successfully")
console.log("Supabase URL:", supabaseUrl)

// Test connection function
export async function testSupabaseConnection() {
  try {
    console.log("🔍 Testing Supabase connection...")

    // Test basic connection
    const { data, error } = await supabase.from("chat_message").select("count").limit(1)

    if (error) {
      console.error("Supabase connection test failed:", error)
      return {
        connected: false,
        error: error.message,
        url: supabaseUrl,
      }
    }

    console.log("✅ Supabase connection test successful")
    return {
      connected: true,
      error: null,
      url: supabaseUrl,
      data: data,
    }
  } catch (err) {
    console.error("Supabase connection error:", err)
    return {
      connected: false,
      error: String(err),
      url: supabaseUrl,
    }
  }
}

// Initialize connection test
testSupabaseConnection().then((result) => {
  if (result.connected) {
    console.log("🎉 Successfully connected to Supabase database")
  } else {
    console.error("❌ Failed to connect to Supabase:", result.error)
  }
})

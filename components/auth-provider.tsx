"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "../db/supabase"
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo users database for fallback
const DEMO_USERS: Record<string, User> = {
  "simonwasswa33@gmail.com": {
    id: "1",
    name: "John Doe",
    email: "simonwasswa33@gmail.com",
    role: "Super Admin",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  "manager@feasy.com": {
    id: "2",
    name: "Jane Smith",
    email: "manager@feasy.com",
    role: "Station Manager",
    avatar: "/placeholder.svg?height=40&width=40",
  },
}

const DEMO_PASSWORDS: Record<string, string> = {
  "simonwasswa33@gmail.com": "jesuschristcares",
  "manager@feasy.com": "manager123",
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First check localStorage for demo user session
        const savedUser = localStorage.getItem("feasy-user")
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser)
            setUser(parsedUser)
            setIsLoading(false)
            return
          } catch (error) {
            localStorage.removeItem("feasy-user")
          }
        }

        // Then check Supabase session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (session?.user && !error) {
          const { id, email, user_metadata } = session.user
          setUser({
            id,
            email: email || "",
            name: user_metadata?.name || "Unnamed User",
            role: user_metadata?.role || "User",
            avatar: user_metadata?.avatar_url || "/placeholder.svg?height=40&width=40",
          })
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { id, email, user_metadata } = session.user
        const user = {
          id,
          email: email || "",
          name: user_metadata?.name || "Unnamed User",
          role: user_metadata?.role || "User",
          avatar: user_metadata?.avatar_url || "/placeholder.svg?height=40&width=40",
        }
        setUser(user)
        toast.success(`Welcome back, ${user.name}!`)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        localStorage.removeItem("feasy-user")
        toast.info("You have been logged out")
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async ({
    email,
    password,
  }: {
    email: string
    password: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      // First try demo credentials
      if (DEMO_USERS[email] && DEMO_PASSWORDS[email] === password) {
        const demoUser = DEMO_USERS[email]
        setUser(demoUser)
        localStorage.setItem("feasy-user", JSON.stringify(demoUser))
        toast.success(`Welcome, ${demoUser.name}!`)
        setIsLoading(false)
        return
      }

      // Then try Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const errorMessage = "Invalid email or password. Please check your credentials or use the demo accounts."
        setError(errorMessage)
        toast.error(errorMessage)
        setUser(null)
      } else if (data.user) {
        const sessionUser = data.user
        const user = {
          id: sessionUser.id,
          email: sessionUser.email || "",
          name: sessionUser.user_metadata?.name || "Unnamed User",
          role: sessionUser.user_metadata?.role || "User",
          avatar: sessionUser.user_metadata?.avatar_url || "/placeholder.svg?height=40&width=40",
        }
        setUser(user)
        toast.success(`Welcome, ${user.name}!`)
      }
    } catch (error) {
      console.error("Login error:", error)
      const errorMessage = "An error occurred during login. Please try again."
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear local storage
      localStorage.removeItem("feasy-user")

      // Clear user state
      setUser(null)
      setError(null)

      toast.success("Logged out successfully")
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Error logging out")
    } finally {
      setIsLoading(false)
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

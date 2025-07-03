"use client"
import { LoginForm } from "@/components/login-form"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import AdminDashboard from "./admin-dashboard"

function HomeContent() {
  const { user, login, isLoading, error } = useAuth()

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      await login(credentials)
      // Navigation will happen automatically when user state changes
    } catch (error) {
      console.error("Login failed:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoginForm onLogin={handleLogin} isLoading={isLoading} error={error} />
      </div>
    )
  }

  return <AdminDashboard />
}

export default function Page() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  )
}

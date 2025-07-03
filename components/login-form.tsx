"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"
import { FeasyLogo } from "./feasy-logo"

interface LoginFormProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

// Demo credentials for testing
const DEMO_CREDENTIALS = [
  {
    email: "simonwasswa33@gmail.com",
    password: "jesuschristcares",
    role: "Super Admin",
    name: "John Doe",
  },
  {
    email: "manager@feasy.com",
    password: "manager123",
    role: "Station Manager",
    name: "Jane Smith",
  },
]

export function LoginForm({ onLogin, isLoading = false, error }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      return
    }

    setFormLoading(true)

    try {
      await onLogin({ email, password })
    } catch (error) {
      console.error("Login submission error:", error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDemoLogin = async (credentials: {
    email: string
    password: string
  }) => {
    setEmail(credentials.email)
    setPassword(credentials.password)

    setFormLoading(true)

    try {
      await onLogin(credentials)
    } catch (error) {
      console.error("Demo login error:", error)
    } finally {
      setFormLoading(false)
    }
  }

  const isSubmitting = isLoading || formLoading

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100 p-2 xs:p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg space-y-4 xs:space-y-6">
        {/* Logo and Header - Responsive */}
        <div className="text-center space-y-3 xs:space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FeasyLogo size={24} className="xs:hidden" />
              <FeasyLogo size={28} className="hidden xs:block sm:hidden" />
              <FeasyLogo size={32} className="hidden sm:block md:hidden" />
              <FeasyLogo size={40} className="hidden md:block" />
            </div>
          </div>
          <div>
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Welcome to Feasy</h1>
            <p className="text-xs xs:text-sm sm:text-base text-gray-600 mt-1 xs:mt-2">Fuel Made Easy - Admin Portal</p>
          </div>
        </div>

        {/* Login Card - Responsive */}
        <Card className="border-purple-100 shadow-xl">
          <CardHeader className="space-y-1 pb-3 xs:pb-4">
            <CardTitle className="text-base xs:text-lg sm:text-xl text-center text-gray-900">
              Sign in to your account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 xs:space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="border-red-200">
                <AlertCircle className="h-3 w-3 xs:h-4 xs:w-4" />
                <AlertDescription className="text-xs xs:text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* Demo Credentials Toggle */}
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDemo(!showDemo)}
                className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs xs:text-sm"
                disabled={isSubmitting}
              >
                {showDemo ? "Hide" : "Show"} Demo Credentials
              </Button>
            </div>

            {/* Demo Credentials Display */}
            {showDemo && (
              <div className="space-y-2 xs:space-y-3 p-3 xs:p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs xs:text-sm font-medium text-purple-800">Demo Accounts:</p>
                {DEMO_CREDENTIALS.map((cred, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-2xs xs:text-xs space-y-1">
                        <p className="font-medium text-purple-700">{cred.role}</p>
                        <p className="text-purple-600">Email: {cred.email}</p>
                        <p className="text-purple-600">Password: {cred.password}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDemoLogin(cred)}
                        className="text-2xs xs:text-xs"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Use This"}
                      </Button>
                    </div>
                    {index < DEMO_CREDENTIALS.length - 1 && <hr className="border-purple-200" />}
                  </div>
                ))}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3 xs:space-y-4">
              <div className="space-y-1 xs:space-y-2">
                <Label htmlFor="email" className="text-gray-700 text-xs xs:text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 text-xs xs:text-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1 xs:space-y-2">
                <Label htmlFor="password" className="text-gray-700 text-xs xs:text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 pr-8 xs:pr-10 text-xs xs:text-sm"
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2 xs:px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3 w-3 xs:h-4 xs:w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-3 w-3 xs:h-4 xs:w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="remember" className="text-xs xs:text-sm text-gray-600">
                    Remember me
                  </Label>
                </div>
                <Button
                  variant="link"
                  className="text-xs xs:text-sm text-purple-600 hover:text-purple-800 p-0"
                  disabled={isSubmitting}
                >
                  Forgot password?
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs xs:text-sm"
                disabled={isSubmitting || !email || !password}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 xs:w-4 xs:h-4 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center pt-3 xs:pt-4 border-t border-purple-100">
              <p className="text-xs xs:text-sm text-gray-600">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="text-purple-600 hover:text-purple-800 p-0 text-xs xs:text-sm"
                  disabled={isSubmitting}
                >
                  Contact Administrator
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center text-2xs xs:text-xs text-gray-500">
          <p>© 2024 Feasy. All rights reserved.</p>
          <p className="mt-1">Secure admin portal for fuel management</p>
        </div>
      </div>
    </div>
  )
}

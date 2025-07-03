"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "../db/supabase"
import { toast } from "sonner"

interface Location {
  id?: number
  gas_station_location_latitude: number
  gas_station_location_longitude: number
  gas_station_location_address: string
  gas_station_location_place_id: string
}

interface LocationFormProps {
  location?: Location | null
  onClose: () => void
  onSave: () => void
}

export function LocationForm({ location, onClose, onSave }: LocationFormProps) {
  const [formData, setFormData] = useState({
    gas_station_location_latitude: 0,
    gas_station_location_longitude: 0,
    gas_station_location_address: "",
    gas_station_location_place_id: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when location prop changes
  useEffect(() => {
    if (location) {
      setFormData({
        gas_station_location_latitude: location.gas_station_location_latitude,
        gas_station_location_longitude: location.gas_station_location_longitude,
        gas_station_location_address: location.gas_station_location_address,
        gas_station_location_place_id: location.gas_station_location_place_id,
      })
    } else {
      setFormData({
        gas_station_location_latitude: 0,
        gas_station_location_longitude: 0,
        gas_station_location_address: "",
        gas_station_location_place_id: "",
      })
    }
    setErrors({})
  }, [location])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.gas_station_location_address.trim()) {
      newErrors.gas_station_location_address = "Address is required"
    }

    if (!formData.gas_station_location_place_id.trim()) {
      newErrors.gas_station_location_place_id = "Place ID is required"
    }

    if (formData.gas_station_location_latitude === 0) {
      newErrors.gas_station_location_latitude = "Latitude is required"
    } else if (formData.gas_station_location_latitude < -90 || formData.gas_station_location_latitude > 90) {
      newErrors.gas_station_location_latitude = "Latitude must be between -90 and 90"
    }

    if (formData.gas_station_location_longitude === 0) {
      newErrors.gas_station_location_longitude = "Longitude is required"
    } else if (formData.gas_station_location_longitude < -180 || formData.gas_station_location_longitude > 180) {
      newErrors.gas_station_location_longitude = "Longitude must be between -180 and 180"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkPlaceIdExists = async (placeId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("gas_station_location")
        .select("gas_station_location_place_id")
        .eq("gas_station_location_place_id", placeId)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is what we want
        console.error("Error checking place ID:", error)
        return false
      }

      return !!data
    } catch (error) {
      console.error("Error checking place ID:", error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      if (location?.id) {
        // Update existing location
        const { error } = await supabase.from("gas_station_location").update(formData).eq("id", location.id)

        if (error) {
          console.error("Error updating location:", error)
          handleDatabaseError(error)
          return
        }

        toast.success("Location updated successfully")
      } else {
        // Check if place ID already exists
        const placeIdExists = await checkPlaceIdExists(formData.gas_station_location_place_id)
        if (placeIdExists) {
          setErrors({
            gas_station_location_place_id: "A location with this Place ID already exists",
          })
          toast.error("Place ID already exists")
          setIsLoading(false)
          return
        }

        // Create new location
        const { error } = await supabase.from("gas_station_location").insert([formData])

        if (error) {
          console.error("Error creating location:", error)
          handleDatabaseError(error)
          return
        }

        toast.success("Location created successfully")
      }

      onSave()
    } catch (error) {
      console.error("Error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDatabaseError = (error: any) => {
    if (error.code === "23505") {
      // Unique constraint violation
      if (error.message.includes("gas_station_location_place_id_key")) {
        setErrors({
          gas_station_location_place_id: "A location with this Place ID already exists",
        })
        toast.error("Place ID already exists. Please use a different Place ID.")
      } else {
        toast.error("A location with these details already exists")
      }
    } else if (error.code === "23502") {
      // Not null constraint violation
      toast.error("Please fill in all required fields")
    } else if (error.code === "23514") {
      // Check constraint violation
      toast.error("Invalid data format. Please check your coordinates.")
    } else {
      toast.error("Failed to save location. Please try again.")
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }))
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            {location ? "Edit Location" : "Add New Location"}
          </DialogTitle>
          <DialogDescription>
            {location
              ? "Update the gas station location details below."
              : "Enter the gas station location details below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              placeholder="Enter the full address of the gas station"
              value={formData.gas_station_location_address}
              onChange={(e) => handleInputChange("gas_station_location_address", e.target.value)}
              className={errors.gas_station_location_address ? "border-red-500" : ""}
              rows={3}
            />
            {errors.gas_station_location_address && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.gas_station_location_address}
              </p>
            )}
          </div>

          {/* Coordinates Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude *</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="e.g., 40.7128"
                value={formData.gas_station_location_latitude || ""}
                onChange={(e) =>
                  handleInputChange("gas_station_location_latitude", Number.parseFloat(e.target.value) || 0)
                }
                className={errors.gas_station_location_latitude ? "border-red-500" : ""}
              />
              {errors.gas_station_location_latitude && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.gas_station_location_latitude}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude *</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="e.g., -74.0060"
                value={formData.gas_station_location_longitude || ""}
                onChange={(e) =>
                  handleInputChange("gas_station_location_longitude", Number.parseFloat(e.target.value) || 0)
                }
                className={errors.gas_station_location_longitude ? "border-red-500" : ""}
              />
              {errors.gas_station_location_longitude && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.gas_station_location_longitude}
                </p>
              )}
            </div>
          </div>

          {/* Place ID */}
          <div className="space-y-2">
            <Label htmlFor="placeId">Google Place ID *</Label>
            <Input
              id="placeId"
              placeholder="e.g., ChIJN1t_tDeuEmsRUsoyG83frY4"
              value={formData.gas_station_location_place_id}
              onChange={(e) => handleInputChange("gas_station_location_place_id", e.target.value)}
              className={errors.gas_station_location_place_id ? "border-red-500" : ""}
            />
            {errors.gas_station_location_place_id && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.gas_station_location_place_id}
              </p>
            )}
            <p className="text-xs text-gray-500">
              The unique identifier for this location in Google Places API. Each location must have a unique Place ID.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {location ? "Update Location" : "Add Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

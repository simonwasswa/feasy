"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/db/supabase"

export function StationForm({
  station,
  onClose,
  onSave,
}: {
  station?: any
  onClose: () => void
  onSave?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (formData: FormData) => {
    const newErrors: Record<string, string> = {}

    // Required field validation
    if (!formData.get("gas_station_name")) {
      newErrors.gas_station_name = "Station name is required"
    }

    if (!formData.get("gas_station_location_id")) {
      newErrors.gas_station_location_id = "Location ID is required"
    }

    if (!formData.get("listing_type")) {
      newErrors.listing_type = "Listing type is required"
    }

    if (!formData.get("address")) {
      newErrors.address = "Address is required"
    }

    const price = formData.get("price") as string
    if (!price || Number.parseFloat(price) <= 0) {
      newErrors.price = "Price must be greater than 0"
    }

    // Image URL validation (optional but if provided, should be valid)
    const imageUrl = formData.get("image") as string
    if (imageUrl && !isValidUrl(imageUrl)) {
      newErrors.image = "Please enter a valid URL"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleDatabaseError = (error: any) => {
    console.error("Database error:", error)

    if (error.code === "22P02") {
      // Invalid input syntax for type
      toast.error("Invalid data format. Please check your inputs.")
    } else if (error.code === "23503") {
      // Foreign key constraint violation
      if (error.message.includes("gas_station_location_id_fkey")) {
        toast.error("The location ID you entered does not exist. Please enter a valid location ID.")
        setErrors({ gas_station_location_id: "Location ID does not exist in the database" })
      } else {
        toast.error("Invalid reference to related data")
      }
    } else if (error.code === "23505") {
      // Unique constraint violation
      toast.error("A gas station with this information already exists")
    } else {
      toast.error("Failed to save gas station. Please try again.")
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)

    // Validate form
    if (!validateForm(formData)) {
      setLoading(false)
      return
    }

    const data = {
      gas_station_name: formData.get("gas_station_name"),
      gas_station_location_id: formData.get("gas_station_location_id"), // Keep as string/text
      listing_type: formData.get("listing_type"),
      address: formData.get("address"),
      price: Number.parseFloat(formData.get("price") as string) || 0,
      image: formData.get("image") || null,
    }

    try {
      if (station?.id) {
        // Update existing station
        const { data: updated, error } = await supabase.from("gas_station").update(data).eq("id", station.id).select()

        if (error) {
          handleDatabaseError(error)
          return
        }

        toast.success("Gas station updated successfully!")
      } else {
        // Create new station
        const { data: inserted, error } = await supabase.from("gas_station").insert([data]).select()

        if (error) {
          handleDatabaseError(error)
          return
        }

        toast.success("Gas station added successfully!")
      }

      onClose()
      if (onSave) {
        onSave()
      }
    } catch (error: any) {
      handleDatabaseError(error)
    } finally {
      setLoading(false)
    }
  }

  const clearError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gas_station_name">Station Name *</Label>
          <Input
            id="gas_station_name"
            placeholder="Enter station name"
            name="gas_station_name"
            defaultValue={station?.gas_station_name}
            onChange={() => clearError("gas_station_name")}
            className={errors.gas_station_name ? "border-red-500" : ""}
          />
          {errors.gas_station_name && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.gas_station_name}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="gas_station_location_id">Location ID *</Label>
          <Input
            id="gas_station_location_id"
            placeholder="Enter location ID"
            name="gas_station_location_id"
            defaultValue={station?.gas_station_location_id}
            onChange={() => clearError("gas_station_location_id")}
            className={errors.gas_station_location_id ? "border-red-500" : ""}
          />
          {errors.gas_station_location_id && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.gas_station_location_id}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">Enter the location ID that exists in your locations table</p>
        </div>

        <div>
          <Label htmlFor="listing_type">Listing Type *</Label>
          <Select
            name="listing_type"
            defaultValue={station?.listing_type}
            onValueChange={() => clearError("listing_type")}
          >
            <SelectTrigger className={errors.listing_type ? "border-red-500" : ""}>
              <SelectValue placeholder="Select listing type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gasstation">Gas Station</SelectItem>
              <SelectItem value="garage">Garage</SelectItem>
            </SelectContent>
          </Select>
          {errors.listing_type && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.listing_type}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="price">Price (UGX) *</Label>
          <Input
            type="number"
            id="price"
            placeholder="Enter price"
            name="price"
            min="0"
            step="0.01"
            defaultValue={station?.price}
            onChange={() => clearError("price")}
            className={errors.price ? "border-red-500" : ""}
          />
          {errors.price && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.price}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          placeholder="Enter full address"
          name="address"
          defaultValue={station?.address}
          onChange={() => clearError("address")}
          className={errors.address ? "border-red-500" : ""}
        />
        {errors.address && (
          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.address}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="image">Image URL</Label>
        <Input
          id="image"
          placeholder="Enter image URL (optional)"
          name="image"
          type="url"
          defaultValue={station?.image}
          onChange={() => clearError("image")}
          className={errors.image ? "border-red-500" : ""}
        />
        {errors.image && (
          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.image}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Optional: Must be a valid URL (e.g., https://example.com/image.jpg)
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto" disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto" disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {station ? "Updating..." : "Adding..."}
            </>
          ) : station ? (
            "Update Station"
          ) : (
            "Add Station"
          )}
        </Button>
      </div>
    </form>
  )
}

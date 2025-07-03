"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, MapPin, Edit, Trash2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { LocationForm } from "./location-form"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { supabase } from "../db/supabase"
import { toast } from "sonner"

interface Location {
  id: number
  gas_station_location_latitude: number | string | null
  gas_station_location_longitude: number | string | null
  gas_station_location_address: string
  gas_station_location_place_id: string
  created_at?: string
}

export function LocationsManagement() {
  const [locations, setLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null)

  // Fetch locations from Supabase
  const fetchLocations = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("gas_station_location")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching locations:", error)
        toast.error("Failed to fetch locations")
        return
      }

      setLocations(data || [])
      setFilteredLocations(data || [])
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to fetch locations")
    } finally {
      setIsLoading(false)
    }
  }

  // Filter locations based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredLocations(locations)
    } else {
      const filtered = locations.filter(
        (location) =>
          location.gas_station_location_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          location.gas_station_location_place_id.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredLocations(filtered)
    }
  }, [searchTerm, locations])

  // Load locations on component mount
  useEffect(() => {
    fetchLocations()
  }, [])

  const handleAddLocation = () => {
    setEditingLocation(null)
    setShowLocationForm(true)
  }

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location)
    setShowLocationForm(true)
  }

  const handleDeleteLocation = async (location: Location) => {
    try {
      const { error } = await supabase.from("gas_station_location").delete().eq("id", location.id)

      if (error) {
        console.error("Error deleting location:", error)
        toast.error("Failed to delete location")
        return
      }

      toast.success("Location deleted successfully")
      fetchLocations() // Refresh the list
      setDeletingLocation(null)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to delete location")
    }
  }

  const handleLocationSaved = () => {
    fetchLocations() // Refresh the list
    setShowLocationForm(false)
    setEditingLocation(null)
  }

  const formatCoordinate = (coord: number | string | null | undefined) => {
    if (coord === null || coord === undefined) {
      return "0.000000"
    }

    const numCoord = typeof coord === "string" ? Number.parseFloat(coord) : coord

    if (isNaN(numCoord)) {
      return "0.000000"
    }

    return numCoord.toFixed(6)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations Management</h1>
          <p className="text-gray-600">Manage gas station locations and coordinates</p>
        </div>
        <Button onClick={handleAddLocation} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-3">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by address or place ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{locations.length}</div>
              <div className="text-sm text-gray-600">Total Locations</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Gas Station Locations
          </CardTitle>
          <CardDescription>Manage all gas station locations and their coordinates</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No locations found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "No locations match your search criteria." : "Get started by adding your first location."}
              </p>
              {!searchTerm && (
                <Button onClick={handleAddLocation} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Location
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Latitude</TableHead>
                    <TableHead>Longitude</TableHead>
                    <TableHead>Place ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate" title={location.gas_station_location_address}>
                          {location.gas_station_location_address}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCoordinate(location.gas_station_location_latitude)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCoordinate(location.gas_station_location_longitude)}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-xs">
                        <div className="truncate" title={location.gas_station_location_place_id}>
                          {location.gas_station_location_place_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLocation(location)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingLocation(location)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Form Modal */}
      {showLocationForm && (
        <LocationForm
          location={editingLocation}
          onClose={() => {
            setShowLocationForm(false)
            setEditingLocation(null)
          }}
          onSave={handleLocationSaved}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingLocation && (
        <DeleteConfirmationDialog
          isOpen={!!deletingLocation}
          onClose={() => setDeletingLocation(null)}
          onConfirm={() => handleDeleteLocation(deletingLocation)}
          title="Delete Location"
          description={`Are you sure you want to delete the location at "${deletingLocation.gas_station_location_address}"? This action cannot be undone.`}
        />
      )}
    </div>
  )
}

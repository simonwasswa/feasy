"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Building2, MapPin, Edit, Trash2, Plus, Eye, Search } from "lucide-react"
import { StationForm } from "./station-form"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { supabase } from "../db/supabase"
import { toast } from "sonner"

interface Station {
  id?: number
  gas_station_name: string
  gas_station_location_id: string
  listing_type: string
  address: string
  price: number
  image?: string
  created_at?: string
}

export function StationsManagement() {
  const [stations, setStations] = useState<Station[]>([])
  const [filteredStations, setFilteredStations] = useState<Station[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [viewingStation, setViewingStation] = useState<Station | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; station: Station | null }>({
    isOpen: false,
    station: null,
  })

  // Fetch stations from Supabase
  const fetchStations = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("gas_station").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching stations:", error)
        toast.error("Failed to fetch stations")
        return
      }

      setStations(data || [])
      setFilteredStations(data || [])
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to fetch stations")
    } finally {
      setIsLoading(false)
    }
  }

  // Filter stations based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredStations(stations)
    } else {
      const filtered = stations.filter(
        (station) =>
          station.gas_station_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          station.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          station.listing_type.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredStations(filtered)
    }
  }, [searchTerm, stations])

  // Load stations on component mount
  useEffect(() => {
    fetchStations()
  }, [])

  const handleDeleteStation = async (station: Station) => {
    try {
      const { error } = await supabase.from("gas_station").delete().eq("id", station.id)

      if (error) {
        console.error("Error deleting station:", error)
        toast.error("Failed to delete station")
        return
      }

      toast.success("Station deleted successfully")
      fetchStations() // Refresh the list
      setDeleteConfirmation({ isOpen: false, station: null })
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to delete station")
    }
  }

  const handleStationSaved = () => {
    fetchStations() // Refresh the list
    setIsAddDialogOpen(false)
    setEditingStation(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gas Stations</h1>
          <p className="text-gray-500">Manage your gas station locations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Station
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Gas Station</DialogTitle>
            </DialogHeader>
            <StationForm onClose={() => setIsAddDialogOpen(false)} onSave={handleStationSaved} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-3">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search stations by name, address, or listing type..."
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
              <div className="text-2xl font-bold text-purple-600">{stations.length}</div>
              <div className="text-sm text-gray-600">Total Stations</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stations Table */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-gray-900">All Stations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredStations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No stations found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "No stations match your search criteria." : "Get started by adding your first station."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Station
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Station</TableHead>
                    <TableHead className="min-w-[150px] hidden sm:table-cell">Address</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell">Price</TableHead>
                    <TableHead className="min-w-[100px]">Type</TableHead>
                    <TableHead className="min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStations.map((station) => (
                    <TableRow key={station.id}>
                      <TableCell className="min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{station.gas_station_name}</p>
                            <p className="text-sm text-gray-500 truncate">ID: {station.gas_station_location_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[150px] hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{station.address}</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[100px] hidden sm:table-cell">
                        <span className="font-medium">{formatCurrency(station.price)}</span>
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <Badge
                          variant="outline"
                          className={
                            station.listing_type === "Premium"
                              ? "bg-purple-100 text-purple-700"
                              : station.listing_type === "Standard"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }
                        >
                          {station.listing_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => setViewingStation(station)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingStation(station)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hidden sm:flex"
                            onClick={() => setDeleteConfirmation({ isOpen: true, station })}
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

      {/* View Station Dialog */}
      {viewingStation && (
        <Dialog open={!!viewingStation} onOpenChange={() => setViewingStation(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Station Details - {viewingStation.gas_station_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video rounded-lg bg-gray-100 overflow-hidden">
                <img
                  src={viewingStation.image || "/placeholder.svg?height=300&width=600"}
                  alt={viewingStation.gas_station_name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Station Information</h3>
                  <div className="space-y-2">
                    <p>
                      <span className="text-gray-500">Name:</span> {viewingStation.gas_station_name}
                    </p>
                    <p>
                      <span className="text-gray-500">Address:</span> {viewingStation.address}
                    </p>
                    <p>
                      <span className="text-gray-500">Location ID:</span> {viewingStation.gas_station_location_id}
                    </p>
                    <p>
                      <span className="text-gray-500">Price:</span> {formatCurrency(viewingStation.price)}
                    </p>
                    <p>
                      <span className="text-gray-500">Listing Type:</span> {viewingStation.listing_type}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Station Dialog */}
      {editingStation && (
        <Dialog open={!!editingStation} onOpenChange={() => setEditingStation(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Gas Station - {editingStation.gas_station_name}</DialogTitle>
            </DialogHeader>
            <StationForm station={editingStation} onClose={() => setEditingStation(null)} onSave={handleStationSaved} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, station: null })}
        onConfirm={() => deleteConfirmation.station && handleDeleteStation(deleteConfirmation.station)}
        title="Delete Gas Station"
        description="Are you sure you want to delete this gas station? This action cannot be undone and all associated data will be permanently removed."
        itemName={deleteConfirmation.station?.gas_station_name}
      />
    </div>
  )
}

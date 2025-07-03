"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, ShoppingCart, DollarSign, TrendingUp, MapPin, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StationForm } from "./station-form"
import { supabase } from "../db/supabase"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DashboardStats {
  totalStations: number
  totalLocations: number
  totalOrders: number
  totalRevenue: number
}

interface Station {
  id?: number
  gas_station_id?: number
  gas_station_name: string
  gas_station_location_id: string
  listing_type: string
  address: string
  price: number
  image?: string
  created_at?: string
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStations: 0,
    totalLocations: 0,
    totalOrders: 0,
    totalRevenue: 0,
  })
  const [recentStations, setRecentStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddStationDialogOpen, setIsAddStationDialogOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<any>(null)
  const [deletingStation, setDeletingStation] = useState<Station | null>(null)

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // First, let's get the table structure to understand the primary key
      const { data: stationsData, error: stationsError } = await supabase
        .from("gas_station")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      if (stationsError) {
        console.error("Error fetching stations:", stationsError)
        toast.error("Failed to fetch stations data")
      } else {
        console.log("Sample station data:", stationsData?.[0]) // This will help us see the actual column names
      }

      // Fetch total stations count
      const { count: stationsCount, error: stationsCountError } = await supabase
        .from("gas_station")
        .select("*", { count: "exact", head: true })

      if (stationsCountError) {
        console.error("Error fetching stations count:", stationsCountError)
      }

      // Fetch locations count
      const { count: locationsCount, error: locationsCountError } = await supabase
        .from("gas_station_location")
        .select("*", { count: "exact", head: true })

      if (locationsCountError) {
        console.error("Error fetching locations count:", locationsCountError)
      }

      // Calculate total revenue from stations
      const totalRevenue = stationsData?.reduce((sum, station) => sum + (station.price || 0), 0) || 0

      // Update stats
      setStats({
        totalStations: stationsCount || 0,
        totalLocations: locationsCount || 0,
        totalOrders: 0, // You can update this when you have orders data
        totalRevenue: totalRevenue,
      })

      // Update recent stations
      setRecentStations(stationsData || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleAddStation = () => {
    setIsAddStationDialogOpen(true)
  }

  const handleEditStation = (station: any) => {
    setEditingStation(station)
  }

  const handleDeleteStation = async (station: Station) => {
    try {
      // Try different possible primary key column names
      let deleteQuery

      if (station.id) {
        deleteQuery = supabase.from("gas_station").delete().eq("id", station.id)
      } else if (station.gas_station_id) {
        deleteQuery = supabase.from("gas_station").delete().eq("gas_station_id", station.gas_station_id)
      } else {
        // If no ID is available, try to delete by unique combination of fields
        deleteQuery = supabase
          .from("gas_station")
          .delete()
          .eq("gas_station_name", station.gas_station_name)
          .eq("gas_station_location_id", station.gas_station_location_id)
          .eq("address", station.address)
      }

      const { error } = await deleteQuery

      if (error) {
        console.error("Error deleting station:", error)
        toast.error(`Failed to delete station: ${error.message}`)
        return
      }

      toast.success("Station deleted successfully")
      fetchDashboardData() // Refresh the data
      setDeletingStation(null)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to delete station")
    }
  }

  const handleNavigateToStations = () => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: "stations" }))
  }

  const handleStationSaved = () => {
    fetchDashboardData() // Refresh data
    setIsAddStationDialogOpen(false)
    setEditingStation(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const statsConfig = [
    {
      title: "Total Stations",
      value: stats.totalStations.toString(),
      change: "+2 this month",
      icon: Building2,
      color: "bg-purple-500",
    },
    {
      title: "Total Locations",
      value: stats.totalLocations.toString(),
      change: "+1 this week",
      icon: MapPin,
      color: "bg-blue-500",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      change: "Coming soon",
      icon: ShoppingCart,
      color: "bg-green-500",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      change: "From all stations",
      icon: DollarSign,
      color: "bg-orange-500",
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-7 lg:space-y-8 xl:space-y-10">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-purple-100">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-7 lg:space-y-8 xl:space-y-10">
      {/* Stats Grid - Fully responsive */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
        {statsConfig.map((stat) => (
          <Card key={stat.title} className="border-purple-100 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 xs:pb-2">
              <CardTitle className="text-2xs xs:text-xs sm:text-sm md:text-base font-medium text-gray-600 leading-tight">
                {stat.title}
              </CardTitle>
              <div
                className={`w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 ${stat.color} rounded-lg flex items-center justify-center`}
              >
                <stat.icon className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900">
                {stat.value}
              </div>
              <p className="text-2xs xs:text-xs sm:text-sm text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">{stat.change}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity - Responsive layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 xs:gap-5 sm:gap-6 md:gap-7 lg:gap-8">
        <Card className="border-purple-100 xl:col-span-1 2xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3 xs:pb-4">
            <CardTitle className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-900">
              Recent Gas Stations
            </CardTitle>
            <button
              onClick={handleNavigateToStations}
              className="text-2xs xs:text-xs sm:text-sm md:text-base text-purple-600 hover:text-purple-800 font-medium transition-colors"
            >
              View All
            </button>
          </CardHeader>
          <CardContent>
            {recentStations.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No stations yet</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first gas station.</p>
                <button
                  onClick={handleAddStation}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add First Station
                </button>
              </div>
            ) : (
              <div className="space-y-2 xs:space-y-3 sm:space-y-4">
                {recentStations.map((station, index) => (
                  <div
                    key={station.id || station.gas_station_id || index}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 xs:p-3 sm:p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors gap-2 sm:gap-3"
                  >
                    <div
                      className="flex items-center gap-2 xs:gap-3 w-full sm:w-auto cursor-pointer"
                      onClick={() => handleEditStation(station)}
                    >
                      <div className="w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs xs:text-sm sm:text-base md:text-lg text-gray-900 truncate">
                          {station.gas_station_name}
                        </p>
                        <p className="text-2xs xs:text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 xs:w-3 xs:h-3 flex-shrink-0" />
                          <span className="truncate">{station.address}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto sm:text-right gap-2 xs:gap-3 sm:gap-4">
                      <span className="px-2 py-1 rounded-full text-2xs xs:text-xs font-medium whitespace-nowrap bg-green-100 text-green-700">
                        {station.listing_type}
                      </span>
                      <p className="text-2xs xs:text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                        {formatCurrency(station.price)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingStation(station)
                        }}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete station"
                      >
                        <Trash2 className="w-3 h-3 xs:w-4 xs:h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-purple-100 xl:col-span-1 2xl:col-span-1">
          <CardHeader className="pb-3 xs:pb-4">
            <CardTitle className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 xs:gap-3 sm:gap-4 md:gap-5">
              <button
                className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors group"
                onClick={handleAddStation}
              >
                <Building2 className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 mx-auto mb-1 xs:mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-2xs xs:text-xs sm:text-sm md:text-base font-medium block">Add Station</span>
              </button>
              <button
                className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors group"
                onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: "locations" }))}
              >
                <MapPin className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 mx-auto mb-1 xs:mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-2xs xs:text-xs sm:text-sm md:text-base font-medium block">Add Location</span>
              </button>
              <button
                className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors group"
                onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: "orders" }))}
              >
                <ShoppingCart className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 mx-auto mb-1 xs:mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-2xs xs:text-xs sm:text-sm md:text-base font-medium block">View Orders</span>
              </button>
              <button
                className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors group"
                onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: "products" }))}
              >
                <TrendingUp className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 mx-auto mb-1 xs:mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-2xs xs:text-xs sm:text-sm md:text-base font-medium block">Products</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs - Responsive sizing */}
      <Dialog open={isAddStationDialogOpen} onOpenChange={setIsAddStationDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm xs:text-base sm:text-lg">Add New Gas Station</DialogTitle>
          </DialogHeader>
          <StationForm onClose={() => setIsAddStationDialogOpen(false)} onSave={handleStationSaved} />
        </DialogContent>
      </Dialog>

      {editingStation && (
        <Dialog open={!!editingStation} onOpenChange={() => setEditingStation(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm xs:text-base sm:text-lg">
                Edit Gas Station - {editingStation.gas_station_name}
              </DialogTitle>
            </DialogHeader>
            <StationForm station={editingStation} onClose={() => setEditingStation(null)} onSave={handleStationSaved} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingStation && (
        <AlertDialog open={!!deletingStation} onOpenChange={() => setDeletingStation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Gas Station</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingStation.gas_station_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingStation(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteStation(deletingStation)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

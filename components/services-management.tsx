"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Wrench, Plus, Edit, Trash2, Car, Fuel, Droplets, GraduationCap, ParkingCircle } from "lucide-react"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"

const initialServices = [
  {
    id: 1,
    name: "Garage",
    description: "Vehicle maintenance and repair services",
    icon: "Car",
    isActive: true,
    stations: ["Total Energies", "Shell Station"],
    category: "Maintenance",
  },
  {
    id: 2,
    name: "Petrol Station",
    description: "Fuel dispensing services for vehicles",
    icon: "Fuel",
    isActive: true,
    stations: ["Total Energies", "Shell Station", "Petro City"],
    category: "Fuel",
  },
  {
    id: 3,
    name: "Washing Bay",
    description: "Professional car washing and detailing",
    icon: "Droplets",
    isActive: true,
    stations: ["Shell Station"],
    category: "Cleaning",
  },
  {
    id: 4,
    name: "Driving School",
    description: "Professional driving lessons and training",
    icon: "GraduationCap",
    isActive: false,
    stations: [],
    category: "Education",
  },
  {
    id: 5,
    name: "Car Parking",
    description: "Secure vehicle parking facilities",
    icon: "ParkingCircle",
    isActive: true,
    stations: ["Petro City"],
    category: "Parking",
  },
]

const iconMap = {
  Car,
  Fuel,
  Droplets,
  GraduationCap,
  ParkingCircle,
}

export function ServicesManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [services, setServices] = useState([...initialServices])
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; service: any | null }>({
    isOpen: false,
    service: null,
  })

  const handleDeleteService = (service: any) => {
    setDeleteConfirmation({
      isOpen: true,
      service,
    })
  }

  const confirmDeleteService = () => {
    if (deleteConfirmation.service) {
      setServices((prevServices) => prevServices.filter((s) => s.id !== deleteConfirmation.service.id))
    }
  }

  const handleToggleService = (serviceId: number) => {
    setServices((prevServices) =>
      prevServices.map((service) => (service.id === serviceId ? { ...service, isActive: !service.isActive } : service)),
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services Management</h1>
          <p className="text-gray-500">Manage available services across gas stations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
            </DialogHeader>
            <ServiceForm onClose={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {services.map((service) => {
          const IconComponent = iconMap[service.icon as keyof typeof iconMap] || Wrench
          return (
            <Card key={service.id} className="border-purple-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {service.category}
                      </Badge>
                    </div>
                  </div>
                  <Switch checked={service.isActive} onCheckedChange={() => handleToggleService(service.id)} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">{service.description}</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Available at:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {service.stations.length > 0 ? (
                        service.stations.map((station) => (
                          <Badge key={station} variant="secondary" className="text-xs">
                            {station}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No stations assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingService(service)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 sm:w-auto"
                      onClick={() => handleDeleteService(service)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Services Table */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-gray-900">All Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Service</TableHead>
                  <TableHead className="min-w-[120px] hidden sm:table-cell">Category</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px] hidden md:table-cell">Stations</TableHead>
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length > 0 ? (
                  services.map((service) => {
                    const IconComponent = iconMap[service.icon as keyof typeof iconMap] || Wrench
                    return (
                      <TableRow key={service.id}>
                        <TableCell className="min-w-[200px]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <IconComponent className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{service.name}</p>
                              <p className="text-sm text-gray-500 truncate">{service.description}</p>
                              <Badge variant="outline" className="sm:hidden mt-1 text-xs">
                                {service.category}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[120px] hidden sm:table-cell">
                          <Badge variant="outline">{service.category}</Badge>
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={service.isActive}
                              onCheckedChange={() => handleToggleService(service.id)}
                              size="sm"
                            />
                            <Badge
                              className={service.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}
                            >
                              {service.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[100px] hidden md:table-cell">
                          <span className="text-sm text-gray-600">{service.stations.length} stations</span>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" onClick={() => setEditingService(service)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hidden sm:flex"
                              onClick={() => handleDeleteService(service)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No services found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Service Dialog */}
      {editingService && (
        <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Service - {editingService.name}</DialogTitle>
            </DialogHeader>
            <ServiceForm service={editingService} onClose={() => setEditingService(null)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, service: null })}
        onConfirm={confirmDeleteService}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone and all associated data will be permanently removed."
        itemName={deleteConfirmation.service?.name}
      />
    </div>
  )
}

function ServiceForm({ service, onClose }: { service?: any; onClose: () => void }) {
  return (
    <form className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Service Name</Label>
          <Input id="name" placeholder="Enter service name" defaultValue={service?.name} />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input id="category" placeholder="e.g., Fuel, Maintenance" defaultValue={service?.category} />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="Service description..." defaultValue={service?.description} />
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="active" defaultChecked={service?.isActive ?? true} />
        <Label htmlFor="active">Service is active</Label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
          {service ? "Update Service" : "Add Service"}
        </Button>
      </div>
    </form>
  )
}

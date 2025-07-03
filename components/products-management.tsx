"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Plus, Edit, Trash2, Fuel, Droplets, Wrench, AlertCircle, CheckCircle, Save } from "lucide-react"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { toast } from "@/hooks/use-toast"

import { supabase } from "../db/supabase"

type Product = {
  product_id?: number
  product_name: string
  product_type_id: number
  product_unit_id: number
  product_price: number
  product_quantity: number
  product_image?: string
  gas_station_id: number
}

type ProductType = {
  product_type_id: number
  product_type_name: string
}

type ProductUnit = {
  product_unit_id: number
  product_unit_name: string
}

type GasStation = {
  [key: string]: any // Allow any column names
}

export function ProductsManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [typeFilter, setTypeFilter] = useState("all")
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    product: Product | null
  }>({
    isOpen: false,
    product: null,
  })

  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false)
  const [editingProductType, setEditingProductType] = useState<ProductType | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([])
  const [gasStations, setGasStations] = useState<GasStation[]>([])
  const [loading, setLoading] = useState(true)
  const [stationColumns, setStationColumns] = useState<{
    idColumn: string
    nameColumn: string
    typeColumn: string
  }>({
    idColumn: "id",
    nameColumn: "name",
    typeColumn: "type",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log("🔄 Starting to fetch data...")

      // First, let's inspect the gas_station table structure
      const { data: sampleStation, error: sampleError } = await supabase.from("gas_station").select("*").limit(1)

      console.log("📊 Sample gas station data:", sampleStation)

      if (sampleStation && sampleStation.length > 0) {
        const columns = Object.keys(sampleStation[0])
        console.log("📋 Available columns in gas_station:", columns)

        // Determine the correct column names
        const idColumn = columns.find((col) => col.toLowerCase().includes("id")) || "id"
        const nameColumn =
          columns.find((col) => col.toLowerCase().includes("name") || col.toLowerCase().includes("station")) || "name"
        const typeColumn =
          columns.find((col) => col.toLowerCase().includes("type") || col.toLowerCase().includes("listing")) || "type"

        setStationColumns({ idColumn, nameColumn, typeColumn })
        console.log("🎯 Detected columns:", { idColumn, nameColumn, typeColumn })
      }

      // Fetch all data in parallel
      console.log("📥 Fetching all data...")
      const [productsResult, typesResult, unitsResult, stationsResult] = await Promise.all([
        supabase.from("product").select("*").order("product_id", { ascending: false }),
        supabase.from("product_type").select("*").order("product_type_name"),
        supabase.from("product_unit").select("*").order("product_unit_name"),
        supabase.from("gas_station").select("*"),
      ])

      // Check for errors
      if (productsResult.error) {
        console.error("❌ Products error:", productsResult.error)
        throw productsResult.error
      }
      if (typesResult.error) {
        console.error("❌ Types error:", typesResult.error)
        throw typesResult.error
      }
      if (unitsResult.error) {
        console.error("❌ Units error:", unitsResult.error)
        throw unitsResult.error
      }
      if (stationsResult.error) {
        console.error("❌ Stations error:", stationsResult.error)
        throw stationsResult.error
      }

      setProducts(productsResult.data || [])
      setProductTypes(typesResult.data || [])
      setProductUnits(unitsResult.data || [])
      setGasStations(stationsResult.data || [])

      console.log("✅ Data fetched successfully:", {
        products: productsResult.data?.length || 0,
        types: typesResult.data?.length || 0,
        units: unitsResult.data?.length || 0,
        stations: stationsResult.data?.length || 0,
      })

      // Log sample data for debugging
      if (stationsResult.data && stationsResult.data.length > 0) {
        console.log("🏪 Sample station record:", stationsResult.data[0])
      }
      if (typesResult.data && typesResult.data.length > 0) {
        console.log(
          "🏷️ Available product types:",
          typesResult.data.map((t) => t.product_type_name),
        )
      }
      if (unitsResult.data && unitsResult.data.length > 0) {
        console.log(
          "📏 Available units:",
          unitsResult.data.map((u) => u.product_unit_name),
        )
      }
    } catch (error) {
      console.error("💥 Error fetching data:", error)
      toast({
        title: "Error",
        description: `Failed to fetch data: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts =
    typeFilter === "all"
      ? products
      : products.filter((product) => {
          const productType = productTypes.find((type) => type.product_type_id === product.product_type_id)
          return productType?.product_type_name.toLowerCase() === typeFilter.toLowerCase()
        })

  const getTypeIcon = (typeId: number) => {
    const productType = productTypes.find((type) => type.product_type_id === typeId)
    const typeName = productType?.product_type_name || ""

    switch (typeName.toLowerCase()) {
      case "fuel":
        return Fuel
      case "lubricant":
        return Droplets
      case "gas":
        return Package
      default:
        return Wrench
    }
  }

  const getStationName = (stationId: number) => {
    const station = gasStations.find((s) => s[stationColumns.idColumn] === stationId)
    return station?.[stationColumns.nameColumn] || "Unknown Station"
  }

  const getStationType = (stationId: number) => {
    const station = gasStations.find((s) => s[stationColumns.idColumn] === stationId)
    return station?.[stationColumns.typeColumn] || "Unknown"
  }

  const handleDeleteProduct = (product: Product) => {
    setDeleteConfirmation({
      isOpen: true,
      product,
    })
  }

  const confirmDeleteProduct = async () => {
    if (!deleteConfirmation.product?.product_id) return

    try {
      const { error } = await supabase.from("product").delete().eq("product_id", deleteConfirmation.product.product_id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Product deleted successfully",
      })

      // Refresh data
      await fetchData()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      })
    } finally {
      setDeleteConfirmation({ isOpen: false, product: null })
    }
  }

  const handleProductSaved = async () => {
    console.log("🔄 Product saved, refreshing data...")
    await fetchData()
    setIsAddDialogOpen(false)
    setEditingProduct(null)
  }

  const handleAddProductClick = () => {
    console.log("➕ Add Product button clicked")
    console.log("📊 Available data for form:", {
      productTypes: productTypes.length,
      productUnits: productUnits.length,
      gasStations: gasStations.length,
    })
    setIsAddDialogOpen(true)
  }

  const handleAddProductType = () => {
    console.log("➕ Add Product Type button clicked")
    setIsAddTypeDialogOpen(true)
  }

  const handleEditProductType = (productType: ProductType) => {
    console.log("✏️ Edit Product Type:", productType)
    setEditingProductType(productType)
  }

  const handleProductTypeSaved = async () => {
    console.log("🔄 Product type saved, refreshing data...")
    await fetchData()
    setIsAddTypeDialogOpen(false)
    setEditingProductType(null)
  }

  // Function to refresh product types (called from ProductForm)
  const refreshProductTypes = async () => {
    try {
      const { data, error } = await supabase.from("product_type").select("*").order("product_type_name")
      if (error) throw error
      setProductTypes(data || [])
      console.log("🔄 Product types refreshed:", data?.length || 0)
    } catch (error) {
      console.error("Error refreshing product types:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Management</h1>
          <p className="text-gray-500">Manage products, pricing, and inventory</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {productTypes.map((type) => (
                <SelectItem key={type.product_type_id} value={type.product_type_name.toLowerCase()}>
                  {type.product_type_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add Product Button - Always Active */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto" onClick={handleAddProductClick}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Add New Product
                </DialogTitle>
              </DialogHeader>
              <ProductForm
                productTypes={productTypes}
                productUnits={productUnits}
                gasStations={gasStations}
                stationColumns={stationColumns}
                onSave={handleProductSaved}
                onClose={() => setIsAddDialogOpen(false)}
                onRefreshProductTypes={refreshProductTypes}
              />
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleAddProductType}>
            <Plus className="w-4 h-4 mr-2" />
            Manage Types
          </Button>
        </div>
      </div>

      {/* Debug Info Card - Remove this in production */}
      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-900 mb-2">Debug Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-700">Product Types: {productTypes.length}</p>
              <p className="text-blue-600 text-xs">{productTypes.map((t) => t.product_type_name).join(", ")}</p>
            </div>
            <div>
              <p className="text-blue-700">Units: {productUnits.length}</p>
              <p className="text-blue-600 text-xs">{productUnits.map((u) => u.product_unit_name).join(", ")}</p>
            </div>
            <div>
              <p className="text-blue-700">Gas Stations: {gasStations.length}</p>
              <p className="text-blue-600 text-xs">
                {gasStations
                  .slice(0, 3)
                  .map((s) => s[stationColumns.nameColumn])
                  .join(", ")}
                {gasStations.length > 3 && "..."}
              </p>
            </div>
            <div>
              <p className="text-blue-700">Station Columns:</p>
              <p className="text-blue-600 text-xs">
                ID: {stationColumns.idColumn}, Name: {stationColumns.nameColumn}, Type: {stationColumns.typeColumn}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-xl font-bold text-gray-900">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Fuel className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Product Types</p>
                <p className="text-xl font-bold text-gray-900">{productTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Low Stock</p>
                <p className="text-xl font-bold text-gray-900">
                  {products.filter((p) => p.product_quantity < 100).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Gas Stations</p>
                <p className="text-xl font-bold text-gray-900">{gasStations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Types Management */}
      <Card className="border-green-100">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center justify-between">
            <span>Product Types</span>
            <Button size="sm" onClick={handleAddProductType} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" />
              Add Type
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {productTypes.map((type) => (
              <div key={type.product_type_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">{type.product_type_name}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleEditProductType(type)} className="h-8 w-8 p-0">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          {productTypes.length === 0 && (
            <p className="text-gray-500 text-center py-4">No product types available. Add one to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filteredProducts.map((product) => {
          const unitName =
            productUnits.find((u) => u.product_unit_id === product.product_unit_id)?.product_unit_name || "Unknown"
          const productType =
            productTypes.find((u) => u.product_type_id === product.product_type_id)?.product_type_name || "Unknown"
          const stationName = getStationName(product.gas_station_id)
          const stationType = getStationType(product.gas_station_id)
          const IconComponent = getTypeIcon(product.product_type_id)

          return (
            <Card key={product.product_id} className="border-purple-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{product.product_name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {productType}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {product.product_quantity < 100 ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Price per {unitName}:</span>
                    <span className="font-bold text-purple-600">UGX {product.product_price.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Stock:</span>
                    <span
                      className={`font-medium ${product.product_quantity < 100 ? "text-red-600" : "text-green-600"}`}
                    >
                      {product.product_quantity.toLocaleString()} {unitName}s
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Station:</span>
                    <div className="text-right">
                      <p className="font-medium text-sm">{stationName}</p>
                      <Badge variant="secondary" className="text-xs">
                        {stationType}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingProduct(product)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 sm:w-auto"
                      onClick={() => handleDeleteProduct(product)}
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

      {/* No Products Message */}
      {filteredProducts.length === 0 && (
        <Card className="border-purple-100">
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">
              {typeFilter === "all"
                ? "Get started by adding your first product."
                : `No products found for the selected type: ${typeFilter}`}
            </p>
            <Button onClick={handleAddProductClick} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Product Type Dialog */}
      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Add New Product Type
            </DialogTitle>
          </DialogHeader>
          <ProductTypeForm onSave={handleProductTypeSaved} onClose={() => setIsAddTypeDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Product Type Dialog */}
      {editingProductType && (
        <Dialog open={!!editingProductType} onOpenChange={() => setEditingProductType(null)}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>Edit Product Type - {editingProductType.product_type_name}</DialogTitle>
            </DialogHeader>
            <ProductTypeForm
              productType={editingProductType}
              onSave={handleProductTypeSaved}
              onClose={() => setEditingProductType(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Product Dialog */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product - {editingProduct.product_name}</DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              productTypes={productTypes}
              productUnits={productUnits}
              gasStations={gasStations}
              stationColumns={stationColumns}
              onSave={handleProductSaved}
              onClose={() => setEditingProduct(null)}
              onRefreshProductTypes={refreshProductTypes}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, product: null })}
        onConfirm={confirmDeleteProduct}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone and all associated data will be permanently removed."
        itemName={deleteConfirmation.product?.product_name}
      />
    </div>
  )
}

function ProductForm({
  product,
  productTypes,
  productUnits,
  gasStations,
  stationColumns,
  onSave,
  onClose,
  onRefreshProductTypes,
}: {
  product?: Product
  productTypes: ProductType[]
  productUnits: ProductUnit[]
  gasStations: GasStation[]
  stationColumns: { idColumn: string; nameColumn: string; typeColumn: string }
  onSave: () => void
  onClose: () => void
  onRefreshProductTypes: () => Promise<void>
}) {
  const [formData, setFormData] = useState({
    product_name: product?.product_name || "",
    product_type_id: product?.product_type_id || 0,
    product_unit_id: product?.product_unit_id || 0,
    product_price: product?.product_price || 0,
    product_quantity: product?.product_quantity || 0,
    product_image: product?.product_image || "",
    gas_station_id: product?.gas_station_id || 0,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // New product type functionality
  const [showNewTypeInput, setShowNewTypeInput] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [addingNewType, setAddingNewType] = useState(false)

  useEffect(() => {
    console.log("📝 ProductForm mounted with data:", {
      isEditing: !!product,
      productTypes: productTypes.length,
      productUnits: productUnits.length,
      gasStations: gasStations.length,
      stationColumns,
    })
  }, [])

  const getStationId = (station: GasStation) => {
    return station[stationColumns.idColumn] || 0
  }

  const getStationName = (station: GasStation) => {
    return station[stationColumns.nameColumn] || "Unknown Station"
  }

  const getStationType = (station: GasStation) => {
    return station[stationColumns.typeColumn] || "Unknown"
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.product_name.trim()) {
      newErrors.product_name = "Product name is required"
    }

    if (!formData.product_type_id || formData.product_type_id === 0) {
      newErrors.product_type_id = "Please select a product type"
    }

    if (!formData.product_unit_id || formData.product_unit_id === 0) {
      newErrors.product_unit_id = "Please select a unit"
    }

    if (!formData.product_price || formData.product_price <= 0) {
      newErrors.product_price = "Price must be greater than 0"
    }

    if (formData.product_quantity < 0) {
      newErrors.product_quantity = "Quantity must be 0 or greater"
    }

    if (!formData.gas_station_id || formData.gas_station_id === 0) {
      newErrors.gas_station_id = "Please select a gas station"
    }

    if (formData.product_image && !isValidUrl(formData.product_image)) {
      newErrors.product_image = "Please enter a valid URL"
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

  const handleAddNewProductType = async () => {
    if (!newTypeName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product type name",
        variant: "destructive",
      })
      return
    }

    setAddingNewType(true)

    try {
      console.log("➕ Adding new product type:", newTypeName)

      const { data, error } = await supabase
        .from("product_type")
        .insert([{ product_type_name: newTypeName.trim() }])
        .select()

      if (error) {
        if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
          throw new Error("A product type with this name already exists")
        }
        throw error
      }

      console.log("✅ New product type created:", data)

      toast({
        title: "Success",
        description: `Product type "${newTypeName}" created successfully`,
      })

      // Refresh the product types list
      await onRefreshProductTypes()

      // Select the newly created type
      if (data && data[0]) {
        setFormData((prev) => ({
          ...prev,
          product_type_id: data[0].product_type_id,
        }))
      }

      // Reset the new type input
      setNewTypeName("")
      setShowNewTypeInput(false)
    } catch (error: any) {
      console.error("❌ Error adding product type:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add product type",
        variant: "destructive",
      })
    } finally {
      setAddingNewType(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🚀 Form submitted with data:", formData)

    if (!validateForm()) {
      console.log("❌ Form validation failed:", errors)
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Prepare data for database
      const productData = {
        product_name: formData.product_name.trim(),
        product_type_id: formData.product_type_id,
        product_unit_id: formData.product_unit_id,
        product_price: formData.product_price,
        product_quantity: formData.product_quantity,
        gas_station_id: formData.gas_station_id,
        ...(formData.product_image && { product_image: formData.product_image.trim() }),
      }

      console.log("💾 Submitting product data to database:", productData)

      if (product?.product_id) {
        // Update existing product
        console.log("✏️ Updating existing product with ID:", product.product_id)
        const { error } = await supabase.from("product").update(productData).eq("product_id", product.product_id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Product updated successfully",
        })
        console.log("✅ Product updated successfully")
      } else {
        // Create new product
        console.log("➕ Creating new product...")
        const { data, error } = await supabase.from("product").insert([productData]).select()

        if (error) {
          console.error("❌ Database error:", error)
          throw error
        }

        toast({
          title: "Success",
          description: `Product "${formData.product_name}" created successfully`,
        })

        console.log("✅ Product created successfully:", data)
      }

      onSave()
    } catch (error: any) {
      console.error("💥 Error saving product:", error)

      let errorMessage = "Failed to save product"

      if (error.message?.includes("duplicate")) {
        errorMessage = "A product with this name already exists"
      } else if (error.message?.includes("foreign key")) {
        errorMessage = "Invalid selection for product type, unit, or gas station"
      } else if (error.message?.includes("violates")) {
        errorMessage = "Database constraint violation - please check your data"
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    console.log(`📝 Field ${field} changed to:`, value)
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

  // Filter gas stations to show only gasstation and garage types
  const filteredGasStations = gasStations.filter((station) => {
    const stationType = getStationType(station).toLowerCase()
    return stationType === "gasstation" || stationType === "garage"
  })

  console.log("🏪 Filtered gas stations:", filteredGasStations.length, "out of", gasStations.length)

  return (
    <div className="space-y-4">
      {/* Form Status */}
      <div className="bg-gray-50 p-3 rounded-lg text-sm">
        <p className="font-medium">Form Status:</p>
        <p>Mode: {product ? "Edit" : "Add New"}</p>
        <p>
          Available Types: {productTypes.length} | Units: {productUnits.length} | Stations: {filteredGasStations.length}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="product_name">Product Name *</Label>
            <Input
              id="product_name"
              placeholder="Enter product name"
              value={formData.product_name}
              onChange={(e) => handleInputChange("product_name", e.target.value)}
              className={errors.product_name ? "border-red-500" : ""}
            />
            {errors.product_name && <p className="text-sm text-red-500 mt-1">{errors.product_name}</p>}
          </div>
          <div>
            <Label htmlFor="product_type_id">Product Type *</Label>
            <div className="space-y-2">
              {!showNewTypeInput ? (
                <div className="flex gap-2">
                  <Select
                    value={formData.product_type_id.toString()}
                    onValueChange={(value) => handleInputChange("product_type_id", Number.parseInt(value))}
                  >
                    <SelectTrigger className={errors.product_type_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypes.map((type) => (
                        <SelectItem key={type.product_type_id} value={type.product_type_id.toString()}>
                          {type.product_type_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewTypeInput(true)}
                    className="whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Type
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter new product type name"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNewProductType}
                      disabled={addingNewType}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {addingNewType ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewTypeInput(false)
                        setNewTypeName("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Add a new product type (e.g., Fuel, Lubricant, Gas, Oil, Accessories)
                  </p>
                </div>
              )}
            </div>
            {errors.product_type_id && <p className="text-sm text-red-500 mt-1">{errors.product_type_id}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="product_price">Price (UGX) *</Label>
            <Input
              id="product_price"
              type="number"
              placeholder="0"
              min="0"
              step="1"
              value={formData.product_price || ""}
              onChange={(e) => handleInputChange("product_price", Number.parseInt(e.target.value) || 0)}
              className={errors.product_price ? "border-red-500" : ""}
            />
            {errors.product_price && <p className="text-sm text-red-500 mt-1">{errors.product_price}</p>}
          </div>
          <div>
            <Label htmlFor="product_unit_id">Unit *</Label>
            <Select
              value={formData.product_unit_id.toString()}
              onValueChange={(value) => handleInputChange("product_unit_id", Number.parseInt(value))}
            >
              <SelectTrigger className={errors.product_unit_id ? "border-red-500" : ""}>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {productUnits.map((unit) => (
                  <SelectItem key={unit.product_unit_id} value={unit.product_unit_id.toString()}>
                    {unit.product_unit_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.product_unit_id && <p className="text-sm text-red-500 mt-1">{errors.product_unit_id}</p>}
          </div>
          <div>
            <Label htmlFor="product_quantity">Stock Quantity *</Label>
            <Input
              id="product_quantity"
              type="number"
              placeholder="0"
              min="0"
              step="1"
              value={formData.product_quantity || ""}
              onChange={(e) => handleInputChange("product_quantity", Number.parseInt(e.target.value) || 0)}
              className={errors.product_quantity ? "border-red-500" : ""}
            />
            {errors.product_quantity && <p className="text-sm text-red-500 mt-1">{errors.product_quantity}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="gas_station_id">Gas Station / Garage *</Label>
          <Select
            value={formData.gas_station_id.toString()}
            onValueChange={(value) => handleInputChange("gas_station_id", Number.parseInt(value))}
          >
            <SelectTrigger className={errors.gas_station_id ? "border-red-500" : ""}>
              <SelectValue placeholder="Select station" />
            </SelectTrigger>
            <SelectContent>
              {filteredGasStations.length > 0 ? (
                filteredGasStations.map((station) => {
                  const stationId = getStationId(station)
                  const stationName = getStationName(station)
                  const stationType = getStationType(station)

                  return (
                    <SelectItem key={stationId} value={stationId.toString()}>
                      {stationName} ({stationType})
                    </SelectItem>
                  )
                })
              ) : (
                <SelectItem value="0" disabled>
                  No gas stations or garages available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {errors.gas_station_id && <p className="text-sm text-red-500 mt-1">{errors.gas_station_id}</p>}
          <p className="text-xs text-gray-500 mt-1">
            Only showing gas stations and garages ({filteredGasStations.length} available)
          </p>
        </div>

        <div>
          <Label htmlFor="product_image">Product Image URL (Optional)</Label>
          <Input
            id="product_image"
            placeholder="https://example.com/image.jpg"
            value={formData.product_image}
            onChange={(e) => handleInputChange("product_image", e.target.value)}
            className={errors.product_image ? "border-red-500" : ""}
          />
          {errors.product_image && <p className="text-sm text-red-500 mt-1">{errors.product_image}</p>}
          <p className="text-xs text-gray-500 mt-1">Enter the URL of the product image</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto" disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {product ? "Updating..." : "Adding..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {product ? "Update Product" : "Add Product"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ProductTypeForm({
  productType,
  onSave,
  onClose,
}: {
  productType?: ProductType
  onSave: () => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    product_type_name: productType?.product_type_name || "",
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.product_type_name.trim()) {
      newErrors.product_type_name = "Product type name is required"
    }

    if (formData.product_type_name.trim().length < 2) {
      newErrors.product_type_name = "Product type name must be at least 2 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🚀 Product Type form submitted with data:", formData)

    if (!validateForm()) {
      console.log("❌ Form validation failed:", errors)
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const typeData = {
        product_type_name: formData.product_type_name.trim(),
      }

      console.log("💾 Submitting product type data to database:", typeData)

      if (productType?.product_type_id) {
        // Update existing product type
        console.log("✏️ Updating existing product type with ID:", productType.product_type_id)
        const { error } = await supabase
          .from("product_type")
          .update(typeData)
          .eq("product_type_id", productType.product_type_id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Product type updated successfully",
        })
        console.log("✅ Product type updated successfully")
      } else {
        // Create new product type
        console.log("➕ Creating new product type...")
        const { data, error } = await supabase.from("product_type").insert([typeData]).select()

        if (error) {
          console.error("❌ Database error:", error)
          throw error
        }

        toast({
          title: "Success",
          description: `Product type "${formData.product_type_name}" created successfully`,
        })

        console.log("✅ Product type created successfully:", data)
      }

      onSave()
    } catch (error: any) {
      console.error("💥 Error saving product type:", error)

      let errorMessage = "Failed to save product type"

      if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
        errorMessage = "A product type with this name already exists"
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    console.log(`📝 Field ${field} changed to:`, value)
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="product_type_name">Product Type Name *</Label>
        <Input
          id="product_type_name"
          placeholder="Enter product type name (e.g., Fuel, Lubricant, Gas)"
          value={formData.product_type_name}
          onChange={(e) => handleInputChange("product_type_name", e.target.value)}
          className={errors.product_type_name ? "border-red-500" : ""}
        />
        {errors.product_type_name && <p className="text-sm text-red-500 mt-1">{errors.product_type_name}</p>}
        <p className="text-xs text-gray-500 mt-1">Examples: Fuel, Lubricant, Gas, Oil, Accessories</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto" disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {productType ? "Updating..." : "Adding..."}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {productType ? "Update Type" : "Add Type"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

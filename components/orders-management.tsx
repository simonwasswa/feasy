"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ShoppingCart,
  Eye,
  Calendar,
  User,
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Database,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  getAllOrders,
  getAllOrderStatuses,
  updateOrderStatus,
  getOrderStatistics,
  subscribeToOrders,
  testOrderConnection,
  type OrderWithDetails,
  type OrderStatus,
} from "../db/orders"

export function OrdersManagement() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [tableStructure, setTableStructure] = useState<any>(null)
  const [statistics, setStatistics] = useState({
    totalOrders: 0,
    uniqueClients: 0,
    todayOrders: 0,
    statusBreakdown: {} as Record<string, number>,
  })
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)

  // Load initial data
  useEffect(() => {
    loadOrderData()
    setupRealTimeSubscription()
  }, [])

  const loadOrderData = async () => {
    try {
      setLoading(true)
      console.log("🔄 Loading order data...")

      // Test connection and detect structure first
      const connectionTest = await testOrderConnection()
      if (!connectionTest.success) {
        toast({
          title: "Database Connection Error",
          description: connectionTest.error,
          variant: "destructive",
        })
        return
      }

      // Store table structure for debugging
      setTableStructure(connectionTest.structure)

      // Load all data in parallel with error handling
      const results = await Promise.allSettled([getAllOrders(), getAllOrderStatuses(), getOrderStatistics()])

      // Handle orders
      if (results[0].status === "fulfilled") {
        setOrders(results[0].value)
      } else {
        console.error("❌ Failed to load orders:", results[0].reason)
        toast({
          title: "Error Loading Orders",
          description: "Failed to load orders from database",
          variant: "destructive",
        })
      }

      // Handle order statuses
      if (results[1].status === "fulfilled") {
        setOrderStatuses(results[1].value)
      } else {
        console.error("❌ Failed to load order statuses:", results[1].reason)
        toast({
          title: "Error Loading Statuses",
          description: "Failed to load order statuses from database",
          variant: "destructive",
        })
      }

      // Handle statistics
      if (results[2].status === "fulfilled") {
        setStatistics(results[2].value)
      } else {
        console.error("❌ Failed to load statistics:", results[2].reason)
      }

      console.log("✅ Order data loading completed")
      toast({
        title: "Orders Loaded",
        description: `Loaded ${orders.length} orders successfully`,
      })
    } catch (error) {
      console.error("❌ Error loading order data:", error)
      toast({
        title: "Error Loading Orders",
        description: error instanceof Error ? error.message : "Failed to load orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeSubscription = () => {
    console.log("🔔 Setting up real-time order updates...")

    const subscription = subscribeToOrders(
      (updatedOrder) => {
        console.log("📦 Real-time order update:", updatedOrder)

        // Refresh data when orders change
        loadOrderData()

        toast({
          title: "Order Updated",
          description: `Order #${updatedOrder.id} has been updated`,
        })
      },
      (error) => {
        console.error("❌ Real-time subscription error:", error)
        setIsRealTimeActive(false)
      },
    )

    if (subscription) {
      setIsRealTimeActive(true)

      return () => {
        console.log("🧹 Cleaning up order subscription...")
        subscription.unsubscribe()
        setIsRealTimeActive(false)
      }
    }
  }

  const handleStatusUpdate = async (orderId: number, newStatusId: number) => {
    try {
      await updateOrderStatus(orderId, newStatusId)

      // Refresh orders to show updated status
      await loadOrderData()

      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully",
      })
    } catch (error) {
      console.error("❌ Error updating status:", error)
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update order status",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (statusName: string) => {
    if (!statusName) return "bg-gray-100 text-gray-700"

    switch (statusName.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-700"
      case "confirmed":
        return "bg-blue-100 text-blue-700"
      case "processing":
        return "bg-purple-100 text-purple-700"
      case "shipped":
        return "bg-orange-100 text-orange-700"
      case "delivered":
        return "bg-green-100 text-green-700"
      case "completed":
        return "bg-green-100 text-green-700"
      case "cancelled":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getStatusIcon = (statusName: string) => {
    if (!statusName) return <Package className="w-4 h-4" />

    switch (statusName.toLowerCase()) {
      case "pending":
        return <Clock className="w-4 h-4" />
      case "confirmed":
        return <CheckCircle className="w-4 h-4" />
      case "processing":
        return <Package className="w-4 h-4" />
      case "shipped":
        return <Truck className="w-4 h-4" />
      case "delivered":
        return <CheckCircle className="w-4 h-4" />
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  const getStatusName = (order: OrderWithDetails) => {
    return order.order_status?.order_status_name || order.order_status?.name || "Unknown"
  }

  const getStatusId = (status: OrderStatus) => {
    return status.id || status.order_status_id || Object.values(status)[0]
  }

  const filteredOrders =
    statusFilter === "all" ? orders : orders.filter((order) => getStatusName(order).toLowerCase() === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Orders Management
            {isRealTimeActive && (
              <Badge className="bg-green-100 text-green-700 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Live
              </Badge>
            )}
          </h1>
          <p className="text-gray-500">Manage customer orders from Supabase</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              {orderStatuses.map((status) => (
                <SelectItem
                  key={getStatusId(status)}
                  value={getStatusName({ order_status: status } as any).toLowerCase()}
                >
                  {getStatusName({ order_status: status } as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadOrderData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Debug Info */}
      {tableStructure && (
        <Card className="border-blue-100 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Structure Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-800">Order Status Columns:</p>
                <p className="text-blue-700">{tableStructure.statusColumns.join(", ") || "None detected"}</p>
              </div>
              <div>
                <p className="font-medium text-blue-800">Order Columns:</p>
                <p className="text-blue-700">{tableStructure.orderColumns.join(", ") || "None detected"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-xl font-bold text-gray-900">{statistics.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Unique Clients</p>
                <p className="text-xl font-bold text-gray-900">{statistics.uniqueClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Today's Orders</p>
                <p className="text-xl font-bold text-gray-900">{statistics.todayOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Orders</p>
                <p className="text-xl font-bold text-gray-900">
                  {Object.entries(statistics.statusBreakdown)
                    .filter(([status]) => !["delivered", "completed", "cancelled"].includes(status.toLowerCase()))
                    .reduce((sum, [, count]) => sum + count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      {Object.keys(statistics.statusBreakdown).length > 0 && (
        <Card className="border-purple-100">
          <CardHeader>
            <CardTitle className="text-gray-900">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(statistics.statusBreakdown).map(([status, count]) => (
                <div key={status} className="text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                    <span className="font-medium">{count}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 capitalize">{status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-gray-900">All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No orders found</p>
              <p className="text-sm text-gray-400">Orders will appear here when they are created</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Order ID</TableHead>
                    <TableHead className="min-w-[120px]">Product ID</TableHead>
                    <TableHead className="min-w-[120px]">Client ID</TableHead>
                    <TableHead className="min-w-[120px] hidden md:table-cell">Deliveryman</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[100px] hidden lg:table-cell">Created</TableHead>
                    <TableHead className="min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id || Math.random()}>
                      <TableCell className="font-medium">#{order.id || "N/A"}</TableCell>
                      <TableCell>{order.product_id}</TableCell>
                      <TableCell className="font-mono text-sm">{order.client_id?.slice(0, 8)}...</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {order.deliveryman_id ? (
                          <span className="font-mono text-sm">{order.deliveryman_id.slice(0, 8)}...</span>
                        ) : (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(getStatusName(order))}>
                          {getStatusIcon(getStatusName(order))}
                          <span className="ml-1">{getStatusName(order)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl mx-4">
                              <DialogHeader>
                                <DialogTitle>Order Details - #{order.id}</DialogTitle>
                              </DialogHeader>
                              <OrderDetails
                                order={order}
                                orderStatuses={orderStatuses}
                                onStatusUpdate={handleStatusUpdate}
                              />
                            </DialogContent>
                          </Dialog>
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
    </div>
  )
}

function OrderDetails({
  order,
  orderStatuses,
  onStatusUpdate,
}: {
  order: OrderWithDetails
  orderStatuses: OrderStatus[]
  onStatusUpdate: (orderId: number, statusId: number) => void
}) {
  const getStatusId = (status: OrderStatus) => {
    return status.id || status.order_status_id || Object.values(status)[0]
  }

  const getStatusName = (status: OrderStatus) => {
    return status.order_status_name || status.name || "Unknown"
  }

  const [selectedStatusId, setSelectedStatusId] = useState(order.order_status_id)

  const handleStatusChange = () => {
    if (selectedStatusId !== order.order_status_id && order.id) {
      onStatusUpdate(order.id, selectedStatusId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Order Information</h3>
          <div className="space-y-2">
            <p>
              <span className="text-gray-500">Order ID:</span> #{order.id || "N/A"}
            </p>
            <p>
              <span className="text-gray-500">Product ID:</span> {order.product_id}
            </p>
            <p>
              <span className="text-gray-500">Created:</span>{" "}
              {order.created_at ? new Date(order.created_at).toLocaleString() : "N/A"}
            </p>
            {order.updated_at && (
              <p>
                <span className="text-gray-500">Updated:</span> {new Date(order.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Participants</h3>
          <div className="space-y-2">
            <p>
              <span className="text-gray-500">Client ID:</span>
              <span className="font-mono text-sm ml-1">{order.client_id}</span>
            </p>
            <p>
              <span className="text-gray-500">Deliveryman:</span>
              {order.deliveryman_id ? (
                <span className="font-mono text-sm ml-1">{order.deliveryman_id}</span>
              ) : (
                <span className="text-gray-400 ml-1">Not assigned</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Current Status</h3>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              className={
                order.order_status?.order_status_name
                  ? (() => {
                      switch (order.order_status.order_status_name.toLowerCase()) {
                        case "pending":
                          return "bg-yellow-100 text-yellow-700"
                        case "confirmed":
                          return "bg-blue-100 text-blue-700"
                        case "processing":
                          return "bg-purple-100 text-purple-700"
                        case "shipped":
                          return "bg-orange-100 text-orange-700"
                        case "delivered":
                          return "bg-green-100 text-green-700"
                        case "completed":
                          return "bg-green-100 text-green-700"
                        case "cancelled":
                          return "bg-red-100 text-red-700"
                        default:
                          return "bg-gray-100 text-gray-700"
                      }
                    })()
                  : "bg-gray-100 text-gray-700"
              }
            >
              {getStatusName(order.order_status || {})}
            </Badge>
          </div>
          {order.order_status?.product_unit_id && (
            <p className="text-sm text-gray-600">Product Unit ID: {order.order_status.product_unit_id}</p>
          )}
        </div>
      </div>

      {orderStatuses.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Update Status</h3>
          <div className="flex gap-3">
            <Select
              value={selectedStatusId?.toString()}
              onValueChange={(value) => setSelectedStatusId(Number.parseInt(value))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderStatuses.map((status) => (
                  <SelectItem key={getStatusId(status)} value={getStatusId(status)?.toString()}>
                    {getStatusName(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleStatusChange} disabled={selectedStatusId === order.order_status_id}>
              Update
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

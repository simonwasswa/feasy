import { supabase } from "./supabase"

export interface OrderStatus {
  id?: number
  product_unit_id?: number
  order_status_name: string
  created_at?: string
  updated_at?: string
  // Allow for flexible column names
  [key: string]: any
}

export interface Order {
  id?: number
  product_id: number
  client_id: string
  deliveryman_id?: string
  order_status_id: number
  created_at: string
  updated_at?: string
  // Joined data
  order_status?: OrderStatus
  product?: any
  client?: any
  deliveryman?: any
  // Allow for flexible column names
  [key: string]: any
}

export interface OrderWithDetails extends Order {
  order_status: OrderStatus
}

// Detect table structure
export async function detectTableStructure() {
  try {
    console.log("🔍 Detecting table structure...")

    // Test order_status table structure
    const { data: statusData, error: statusError } = await supabase.from("order_status").select("*").limit(1)

    if (statusError) {
      console.error("❌ Order status table error:", statusError)
    }

    // Test order table structure
    const { data: orderData, error: orderError } = await supabase.from("order").select("*").limit(1)

    if (orderError) {
      console.error("❌ Order table error:", orderError)
    }

    const statusColumns = statusData?.[0] ? Object.keys(statusData[0]) : []
    const orderColumns = orderData?.[0] ? Object.keys(orderData[0]) : []

    console.log("📋 Order status columns:", statusColumns)
    console.log("📋 Order columns:", orderColumns)

    return {
      statusColumns,
      orderColumns,
      statusSample: statusData?.[0],
      orderSample: orderData?.[0],
    }
  } catch (error) {
    console.error("❌ Error detecting table structure:", error)
    return {
      statusColumns: [],
      orderColumns: [],
      statusSample: null,
      orderSample: null,
    }
  }
}

// Test database connection
export async function testOrderConnection() {
  try {
    console.log("🔍 Testing order database connection...")

    // First detect the table structure
    const structure = await detectTableStructure()

    if (structure.statusColumns.length === 0 && structure.orderColumns.length === 0) {
      return { success: false, error: "No tables found or tables are empty" }
    }

    console.log("✅ Order database connection successful")
    return {
      success: true,
      structure,
    }
  } catch (error) {
    console.error("❌ Order connection test failed:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Get all orders with flexible column handling
export async function getAllOrders(): Promise<OrderWithDetails[]> {
  try {
    console.log("📦 Fetching all orders...")

    // First detect structure to understand available columns
    const structure = await detectTableStructure()

    // Try different query approaches based on available columns
    const query = supabase.from("order").select("*")

    // Try to join with order_status if both tables have data
    if (structure.statusColumns.length > 0 && structure.orderColumns.length > 0) {
      try {
        const { data: joinData, error: joinError } = await supabase
          .from("order")
          .select(`
            *,
            order_status (*)
          `)
          .order("created_at", { ascending: false })

        if (!joinError && joinData) {
          console.log(`✅ Fetched ${joinData.length} orders with status join`)
          return joinData as OrderWithDetails[]
        } else {
          console.log("⚠️ Join failed, falling back to simple query:", joinError?.message)
        }
      } catch (joinError) {
        console.log("⚠️ Join query failed, using fallback")
      }
    }

    // Fallback: Get orders without join
    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching orders:", error)
      throw error
    }

    console.log(`✅ Fetched ${data?.length || 0} orders (without join)`)
    return data || []
  } catch (error) {
    console.error("❌ Failed to fetch orders:", error)
    throw error
  }
}

// Get orders by status with flexible handling
export async function getOrdersByStatus(statusId: number): Promise<OrderWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from("order")
      .select("*")
      .eq("order_status_id", statusId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching orders by status:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("❌ Failed to fetch orders by status:", error)
    throw error
  }
}

// Get all order statuses with flexible column handling
export async function getAllOrderStatuses(): Promise<OrderStatus[]> {
  try {
    console.log("📋 Fetching order statuses...")

    // First detect the actual table structure
    const structure = await detectTableStructure()

    if (structure.statusColumns.length === 0) {
      console.log("⚠️ No order_status table data found")
      return []
    }

    // Use simple select to avoid column issues
    const { data, error } = await supabase.from("order_status").select("*")

    if (error) {
      console.error("❌ Error fetching order statuses:", error)
      throw error
    }

    console.log(`✅ Fetched ${data?.length || 0} order statuses`)
    console.log("📋 Status data sample:", data?.[0])

    return data || []
  } catch (error) {
    console.error("❌ Failed to fetch order statuses:", error)
    throw error
  }
}

// Update order status with flexible handling
export async function updateOrderStatus(orderId: number, newStatusId: number): Promise<boolean> {
  try {
    console.log(`🔄 Updating order ${orderId} status to ${newStatusId}...`)

    const { error } = await supabase
      .from("order")
      .update({
        order_status_id: newStatusId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) {
      console.error("❌ Error updating order status:", error)
      throw error
    }

    console.log("✅ Order status updated successfully")
    return true
  } catch (error) {
    console.error("❌ Failed to update order status:", error)
    throw error
  }
}

// Get order statistics with flexible handling
export async function getOrderStatistics() {
  try {
    console.log("📊 Calculating order statistics...")

    // Get total orders
    const { count: totalOrders, error: totalError } = await supabase
      .from("order")
      .select("*", { count: "exact", head: true })

    if (totalError) {
      console.error("❌ Error getting total orders:", totalError)
      throw totalError
    }

    // Get unique clients count
    const { data: uniqueClients, error: clientError } = await supabase.from("order").select("client_id")

    if (clientError) {
      console.error("❌ Error getting unique clients:", clientError)
      throw clientError
    }

    const uniqueClientCount = new Set(uniqueClients?.map((o) => o.client_id)).size

    // Get today's orders
    const today = new Date().toISOString().split("T")[0]
    const { count: todayOrders, error: todayError } = await supabase
      .from("order")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lt("created_at", `${today}T23:59:59.999Z`)

    if (todayError) {
      console.error("❌ Error getting today's orders:", todayError)
    }

    // Try to get status breakdown
    let statusBreakdown = {}
    try {
      const { data: orders } = await supabase.from("order").select("order_status_id")
      const { data: statuses } = await supabase.from("order_status").select("*")

      if (orders && statuses) {
        // Create a map of status_id to status_name
        const statusMap = statuses.reduce((acc: any, status: any) => {
          // Handle different possible column names for ID
          const statusId = status.id || status.order_status_id || Object.values(status)[0]
          const statusName = status.order_status_name || status.name || "Unknown"
          acc[statusId] = statusName
          return acc
        }, {})

        // Count orders by status
        statusBreakdown = orders.reduce((acc: any, order: any) => {
          const statusName = statusMap[order.order_status_id] || "Unknown"
          acc[statusName] = (acc[statusName] || 0) + 1
          return acc
        }, {})
      }
    } catch (statusError) {
      console.log("⚠️ Could not calculate status breakdown:", statusError)
    }

    const stats = {
      totalOrders: totalOrders || 0,
      uniqueClients: uniqueClientCount,
      todayOrders: todayOrders || 0,
      statusBreakdown,
    }

    console.log("✅ Order statistics calculated:", stats)
    return stats
  } catch (error) {
    console.error("❌ Failed to calculate order statistics:", error)
    throw error
  }
}

// Subscribe to order changes
export function subscribeToOrders(onOrderChange: (order: Order) => void, onError?: (error: any) => void) {
  console.log("🔔 Setting up order subscription...")

  const subscription = supabase
    .channel("order_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "order",
      },
      (payload) => {
        console.log("📦 Order change detected:", payload)
        if (payload.new) {
          onOrderChange(payload.new as Order)
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("✅ Order subscription active")
      } else if (status === "CHANNEL_ERROR") {
        console.error("❌ Order subscription error")
        onError?.(new Error("Order subscription failed"))
      }
    })

  return subscription
}

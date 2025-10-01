import { useState, useEffect, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { User, Table, MenuItem, Order, OrderHistory, Reservation, TableStatus } from '../App'
import { 
  Users, 
  Clock, 
  ChefHat, 
  CreditCard, 
  CheckCircle,
  QrCode,
  Plus,
  Calendar,
  ClockCounterClockwise,
  FunnelSimple,
  Eye,
  Trash,
  ArrowClockwise,
  MapPin,
  Phone,
  BookOpen
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface RestaurantDashboardProps {
  user: User
  onLogout: () => void
}

export default function RestaurantDashboard({ user, onLogout }: RestaurantDashboardProps) {
  const [activeTab, setActiveTab] = useState('orders')
  const [tables, setTables] = useKV<Table[]>('tables', [])
  const [menuItems, setMenuItems] = useKV<MenuItem[]>('menuItems', [])
  const [orders, setOrders] = useKV<Order[]>('orders', [])
  const [orderHistory, setOrderHistory] = useKV<OrderHistory[]>('orderHistory', [])
  const [reservations, setReservations] = useKV<Reservation[]>('reservations', [])
  
  // Form states
  const [newTable, setNewTable] = useState({ name: '' })
  const [newMenuItem, setNewMenuItem] = useState({ name: '', description: '', price: '', category: '' })
  const [newCategory, setNewCategory] = useState('')
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showMenuDialog, setShowMenuDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showBillDialog, setShowBillDialog] = useState(false)
  const [showCategoryManageDialog, setShowCategoryManageDialog] = useState(false)
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [orderViewMode, setOrderViewMode] = useState<'tables' | 'dishes'>('tables')
  const [allYouCanEatPrice, setAllYouCanEatPrice] = useKV<number>('allYouCanEatPrice', 25.00)
  const [newReservation, setNewReservation] = useState({ customerName: '', customerPhone: '', tableId: '', date: '', time: '', guests: 1 })
  const [showReservationDialog, setShowReservationDialog] = useState(false)
  const [analyticsFilter, setAnalyticsFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | '90days' | 'custom'>('today')
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' })
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null)
  const [selectedReservationSlot, setSelectedReservationSlot] = useState<{day: string, hour: string, tableId: string} | null>(null)


  const restaurant = restaurants?.find(r => r.id === user.restaurantId)
  const restaurantTables = tables?.filter(t => t.restaurantId === user.restaurantId) || []
  const restaurantMenuItems = menuItems?.filter(m => m.restaurantId === user.restaurantId) || []
  const restaurantOrders = orders?.filter(o => o.restaurantId === user.restaurantId) || []
  const restaurantCompletedOrders = completedOrders?.filter(o => o.restaurantId === user.restaurantId) || []
  const restaurantReservations = reservations?.filter(r => r.restaurantId === user.restaurantId) || []

  // Generate PIN for tables
  const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString()

  // Initialize sample data if empty
  useEffect(() => {
    if (!tables || tables.length === 0) {
      const sampleTables: Table[] = [
        {
          id: '1',
          name: 'Tavolo 1',
          isActive: true,
          pin: '1234',
          qrCode: `${window.location.origin}?table=1&pin=1234`,
          restaurantId: user.restaurantId || 'restaurant1',
          status: 'available'
        },
        {
          id: '2', 
          name: 'Tavolo 2',
          isActive: true,
          pin: '5678',
          qrCode: `${window.location.origin}?table=2&pin=5678`,
          restaurantId: user.restaurantId || 'restaurant1',
          status: 'available'
        },
        {
          id: '3',
          name: 'Tavolo 3', 
          isActive: true,
          pin: '9012',
          qrCode: `${window.location.origin}?table=3&pin=9012`,
          restaurantId: user.restaurantId || 'restaurant1',
          status: 'waiting-order'
        }
      ]
      setTables(sampleTables)
    }

    if (!menuItems || menuItems.length === 0) {
      const sampleMenu: MenuItem[] = [
        {
          id: '1',
          name: 'Margherita',
          description: 'Pomodoro, mozzarella, basilico',
          price: 8.50,
          category: 'Pizza',
          isActive: true,
          restaurantId: user.restaurantId || 'restaurant1'
        },
        {
          id: '2',
          name: 'Carbonara',
          description: 'Uova, guanciale, pecorino, pepe nero',
          price: 12.00,
          category: 'Primi',
          isActive: true,
          restaurantId: user.restaurantId || 'restaurant1'
        },
        {
          id: '3',
          name: 'Tiramisu',
          description: 'Mascarpone, caffè, cacao',
          price: 6.00,
          category: 'Dolci',
          isActive: true,
          restaurantId: user.restaurantId || 'restaurant1'
        }
      ]
      setMenuItems(sampleMenu)
    }
  }, [tables?.length, menuItems?.length, user.restaurantId, setTables, setMenuItems])

  // Table management functions
  const updateTableStatus = (tableId: string, status: TableStatus, currentOrderId?: string) => {
    setTables((current) => 
      (current || []).map(t => 
        t.id === tableId ? { ...t, status, currentOrderId } : t
      )
    )
  }

  const openNewTable = (tableId: string, customerCount?: number) => {
    const newPin = generatePin()
    setTables((current) => 
      (current || []).map(t => 
        t.id === tableId ? { 
          ...t, 
          status: 'waiting-order',
          pin: newPin,
          qrCode: `${window.location.origin}?table=${tableId}&pin=${newPin}`,
          currentOrderId: undefined,
          customerCount
        } : t
      )
    )
    toast.success(`Tavolo ${tables?.find(t => t.id === tableId)?.name} aperto - PIN: ${newPin}`)
  }

  const closeTable = (tableId: string) => {
    // Move order to history
    const tableOrders = (orders || []).filter(o => o.tableId === tableId)
    const table = (tables || []).find(t => t.id === tableId)
    const reservation = (reservations || []).find(r => r.tableId === tableId && 
      new Date(r.date).toDateString() === new Date().toDateString())

    if (tableOrders.length > 0 && table) {
      const historyEntries: OrderHistory[] = tableOrders.map(order => ({
        id: order.id,
        tableId: order.tableId,
        tableName: table.name,
        restaurantId: order.restaurantId,
        items: order.items.map(item => {
          const menuItem = (menuItems || []).find(m => m.id === item.menuItemId)
          return {
            menuItemId: item.menuItemId,
            name: menuItem?.name || 'Unknown',
            quantity: item.quantity,
            price: menuItem?.price || 0,
            notes: item.notes
          }
        }),
        total: order.total,
        timestamp: order.timestamp,
        paidAt: Date.now(),
        customerName: reservation?.customerName,
        customerPhone: reservation?.customerPhone,
        customerCount: table.customerCount || reservation?.guests,
        reservationId: reservation?.id
      }))

      setOrderHistory(current => [...(current || []), ...historyEntries])
      setOrders(current => (current || []).filter(o => o.tableId !== tableId))
    }

    // Reset table status
    setTables((current) => 
      (current || []).map(t => 
        t.id === tableId ? { 
          ...t, 
          status: 'cleaning',
          currentOrderId: undefined,
          customerCount: undefined,
          reservationId: undefined
        } : t
      )
    )

    toast.success(`Tavolo ${table?.name} chiuso e spostato nello storico`)
  }

  const makeTableAvailable = (tableId: string) => {
    updateTableStatus(tableId, 'available')
    toast.success('Tavolo pronto per nuovi clienti')
  }

  // Order management
  const markOrderItemComplete = (orderId: string, menuItemId: string) => {
    setOrders(current => 
      (current || []).map(order => 
        order.id === orderId ? {
          ...order,
          items: order.items.map(item => 
            item.menuItemId === menuItemId ? { ...item, completed: true } : item
          )
        } : order
      )
    )
  }

  const advanceOrderStatus = (orderId: string) => {
    setOrders(current => 
      (current || []).map(order => {
        if (order.id !== orderId) return order
        
        const nextStatus = {
          'waiting': 'preparing' as const,
          'preparing': 'served' as const,
          'served': 'completed' as const,
          'completed': 'completed' as const
        }
        
        const newStatus = nextStatus[order.status]
        
        // Update table status when order is ready
        if (newStatus === 'served') {
          updateTableStatus(order.tableId, 'order-ready', orderId)
        } else if (newStatus === 'completed') {
          updateTableStatus(order.tableId, 'eating')
        }
        
        return { ...order, status: newStatus }
      })
    )
  }

  // Menu management
  const addMenuItem = () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      toast.error('Nome and prezzo sono obbligatori')
      return
    }

    const menuItem: MenuItem = {
      id: Date.now().toString(),
      name: newMenuItem.name,
      description: newMenuItem.description,
      price: parseFloat(newMenuItem.price),
      category: newMenuItem.category || 'Altro',
      isActive: true,
      restaurantId: user.restaurantId || 'restaurant1'
    }

    setMenuItems(current => [...(current || []), menuItem])
    setNewMenuItem({ name: '', description: '', price: '', category: '' })
    toast.success('Piatto aggiunto al menu')
  }

  const toggleMenuItemActive = (itemId: string) => {
    setMenuItems(current => 
      (current || []).map(item => 
        item.id === itemId ? { ...item, isActive: !item.isActive } : item
      )
    )
  }

  // Table management
  const addTable = () => {
    if (!newTable.name) {
      toast.error('Nome tavolo è obbligatorio')
      return
    }

    const table: Table = {
      id: Date.now().toString(),
      name: newTable.name,
      isActive: true,
      pin: generatePin(),
      qrCode: '',
      restaurantId: user.restaurantId || 'restaurant1',
      status: 'available'
    }

    table.qrCode = `${window.location.origin}?table=${table.id}&pin=${table.pin}`

    setTables(current => [...(current || []), table])
    setNewTable({ name: '' })
    toast.success('Tavolo aggiunto')
  }

  // Reservation management
  const timeSlots = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ]

  const [quickReservation, setQuickReservation] = useState({
    customerName: '',
    customerPhone: '',
    guests: 2,
    time: '',
    tableId: ''
  })

  const addReservation = (date: string, time: string, tableId: string) => {
    setQuickReservation({ ...quickReservation, time, tableId })
  }

  const saveQuickReservation = () => {
    if (!quickReservation.customerName || !quickReservation.customerPhone || !quickReservation.tableId || !quickReservation.time) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    const reservation: Reservation = {
      id: Date.now().toString(),
      customerName: quickReservation.customerName,
      customerPhone: quickReservation.customerPhone,
      tableId: quickReservation.tableId,
      date: selectedDate,
      time: quickReservation.time,
      guests: quickReservation.guests,
      restaurantId: user.restaurantId || 'restaurant1'
    }

    setReservations(current => [...(current || []), reservation])
    setQuickReservation({ customerName: '', customerPhone: '', guests: 2, time: '', tableId: '' })
    toast.success('Prenotazione salvata')
  }

  const handleToggleMenuItem = (menuId: string) => {
    setMenuItems((current) => 
      (current || []).map(m => 
        m.id === menuId ? { ...m, isActive: !m.isActive } : m
      )
    )
    toast.success('Stato piatto aggiornato')
  }

  const handleCompleteOrderItem = (orderId: string, itemIndex: number) => {
    const order = restaurantOrders.find(o => o.id === orderId)
    if (!order) return

    const item = order.items[itemIndex]
    const completedOrder: Order = {
      ...order,
      id: `completed-${Date.now()}`,
      items: [item],
      total: (restaurantMenuItems.find(m => m.id === item.menuItemId)?.price || 0) * item.quantity,
      status: 'completed',
      timestamp: Date.now()
    }

    setCompletedOrders((current) => [...(current || []), completedOrder])

    // Remove the item from the original order
    setOrders((current) => 
      (current || []).map(o => 
        o.id === orderId 
          ? { 
              ...o, 
              items: o.items.filter((_, index) => index !== itemIndex),
              total: o.total - ((restaurantMenuItems.find(m => m.id === item.menuItemId)?.price || 0) * item.quantity)
            }
          : o
      ).filter(o => o.items.length > 0) // Remove order if no items left
    )

    toast.success('Piatto completato')
  }

  const handleUncompleteOrderItem = (completedOrderId: string) => {
    const completedOrder = restaurantCompletedOrders.find(o => o.id === completedOrderId)
    if (!completedOrder) return

    // Find original order or create new one
    const originalOrderId = completedOrder.id.replace('completed-', '')
    const existingOrder = restaurantOrders.find(o => o.tableId === completedOrder.tableId)

    if (existingOrder) {
      // Add item back to existing order
      setOrders((current) => 
        (current || []).map(o => 
          o.id === existingOrder.id
            ? {
                ...o,
                items: [...o.items, ...completedOrder.items],
                total: o.total + completedOrder.total
              }
            : o
        )
      )
    } else {
      // Create new order
      const newOrder: Order = {
        ...completedOrder,
        id: `order-${Date.now()}`,
        status: 'waiting'
      }
      setOrders((current) => [...(current || []), newOrder])
    }

    // Remove from completed orders
    setCompletedOrders((current) => (current || []).filter(o => o.id !== completedOrderId))
    toast.success('Completamento annullato')
  }

  const handleMarkTableAsPaid = (tableId: string) => {
    setPaidTables((current) => [...(current || []), tableId])
    toast.success('Tavolo segnato come pagato')
  }

  const handleDeleteTable = (tableId: string) => {
    setTables((current) => (current || []).filter(t => t.id !== tableId))
    // Also clear from paid tables
    setPaidTables((current) => (current || []).filter(id => id !== tableId))
    toast.success('Tavolo eliminato')
  }

  const handleDeleteCompletedOrder = (orderId: string) => {
    setCompletedOrders((current) => (current || []).filter(o => o.id !== orderId))
    toast.success('Ordine eliminato')
  }

  const handleDeleteCategory = (categoryName: string) => {
    // Check if there are items in this category
    const categoryItems = restaurantMenuItems.filter(item => item.category === categoryName)
    if (categoryItems.length > 0) {
      toast.error('Non puoi eliminare una categoria che contiene piatti')
      return
    }
    
    setCategories((current) => (current || []).filter(c => c !== categoryName))
    toast.success('Categoria eliminata')
  }

  const handleDeleteMenuItem = (menuId: string) => {
    setMenuItems((current) => (current || []).filter(m => m.id !== menuId))
    toast.success('Piatto eliminato')
  }

  const handleCreateReservation = () => {
    if (!newReservation.customerName || !newReservation.customerPhone || !newReservation.tableId || !newReservation.date || !newReservation.time) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    const reservation: Reservation = {
      id: Date.now().toString(),
      customerName: newReservation.customerName,
      customerPhone: newReservation.customerPhone,
      tableId: newReservation.tableId,
      date: selectedDate,
      time: newReservation.time,
      guests: newReservation.guests,
      restaurantId: user.restaurantId || 'restaurant1'
    }

    setReservations(current => [...(current || []), reservation])
    setNewReservation({ customerName: '', customerPhone: '', guests: 2, time: '', tableId: '' })
    toast.success('Prenotazione salvata')
  }

  // Get table status info
  const getTableStatusInfo = (table: Table) => {
    const tableOrders = (orders || []).filter(o => o.tableId === table.id)
    const hasActiveOrders = tableOrders.some(o => o.status !== 'completed')
    const hasCompletedOrders = tableOrders.some(o => o.status === 'completed')
    const isPaid = tableOrders.length > 0 && tableOrders.every(o => o.status === 'completed')

  // Drag and drop functions for categories
  const handleDragStart = (e: React.DragEvent, category: string) => {
    setDraggedCategory(category)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault()
    
    if (!draggedCategory || draggedCategory === targetCategory) {
      setDraggedCategory(null)
      return
    }

    const currentCategories = categories || []
    const draggedIndex = currentCategories.indexOf(draggedCategory)
    const targetIndex = currentCategories.indexOf(targetCategory)
    
    const newCategories = [...currentCategories]
    newCategories.splice(draggedIndex, 1)
    newCategories.splice(targetIndex, 0, draggedCategory)
    
    setCategories(newCategories)
    setDraggedCategory(null)
    toast.success('Ordine categorie aggiornato')
  }

  const handleDragEnd = () => {
    setDraggedCategory(null)
  }

  const pendingOrdersCount = restaurantOrders.filter(o => o.status === 'waiting').length
  
  // Analytics filter functions
  const getFilteredOrders = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    
    switch (analyticsFilter) {
      case 'today':
        return [...restaurantOrders, ...restaurantCompletedOrders].filter(o => 
          new Date(o.timestamp) >= today
        )
      case 'yesterday':
        return [...restaurantOrders, ...restaurantCompletedOrders].filter(o => {
          const orderDate = new Date(o.timestamp)
          return orderDate >= yesterday && orderDate < today
        })
      case '7days':
        const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        return [...restaurantOrders, ...restaurantCompletedOrders].filter(o => 
          new Date(o.timestamp) >= week
        )
      case '30days':
        const month = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        return [...restaurantOrders, ...restaurantCompletedOrders].filter(o => 
          new Date(o.timestamp) >= month
        )
      case '90days':
        const quarter = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
        return [...restaurantOrders, ...restaurantCompletedOrders].filter(o => 
          new Date(o.timestamp) >= quarter
        )
      case 'custom':
        if (!customDateRange.from || !customDateRange.to) return []
        const fromDate = new Date(customDateRange.from)
        const toDate = new Date(customDateRange.to + ' 23:59:59')
        return [...restaurantOrders, ...restaurantCompletedOrders].filter(o => {
          const orderDate = new Date(o.timestamp)
          return orderDate >= fromDate && orderDate <= toDate
        })
      default:
        return [...restaurantOrders, ...restaurantCompletedOrders]
    }

    return { status, statusColor, statusText, hasActiveOrders, hasCompletedOrders, isPaid }
  }

  // Filter order history
  const filteredOrderHistory = useMemo(() => {
    return (orderHistory || []).filter(order => {
      const orderDate = new Date(order.paidAt).toISOString().split('T')[0]
      
      if (historyFilters.dateFrom && orderDate < historyFilters.dateFrom) return false
      if (historyFilters.dateTo && orderDate > historyFilters.dateTo) return false
      if (historyFilters.tableId && historyFilters.tableId !== 'all' && order.tableId !== historyFilters.tableId) return false
      if (historyFilters.customerName && 
          (!order.customerName || !order.customerName.toLowerCase().includes(historyFilters.customerName.toLowerCase()))) return false
      
      return true
    }).sort((a, b) => b.paidAt - a.paidAt)
  }, [orderHistory, historyFilters])

  // Get menu by category
  const menuByCategory = useMemo(() => {
    const grouped = (menuItems || []).reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, MenuItem[]>)
    return grouped
  }, [menuItems])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <ChefHat size={24} className="text-primary" />
            <h1 className="text-xl font-semibold">Dashboard Ristorante</h1>
            <Badge variant="secondary">{user.username}</Badge>
          </div>
        </div>

        <nav className="flex-1 px-2">
          <div className="space-y-1">
            <Button
              variant={activeSection === 'orders' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${activeSection === 'orders' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'}`}
              onClick={() => {
                if (!sidebarExpanded) {
                  setSidebarExpanded(true)
                } else {
                  setActiveSection('orders')
                  setSidebarExpanded(false)
                }
              }}
            >
              <Bell size={16} />
              {sidebarExpanded && <span className="ml-2 transition-all duration-200">Ordini</span>}
              {sidebarExpanded && pendingOrdersCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs shadow-gold">
                  {pendingOrdersCount}
                </Badge>
              )}
            </Button>
            
            <Button
              variant={activeSection === 'tables' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${activeSection === 'tables' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'}`}
              onClick={() => {
                if (!sidebarExpanded) {
                  setSidebarExpanded(true)
                } else {
                  setActiveSection('tables')
                  setSidebarExpanded(false)
                }
              }}
            >
              <Square size={16} />
              {sidebarExpanded && <span className="ml-2 transition-all duration-200">Tavoli</span>}
            </Button>
            
            <Button
              variant={activeSection === 'menu' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${activeSection === 'menu' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'}`}
              onClick={() => {
                if (!sidebarExpanded) {
                  setSidebarExpanded(true)
                } else {
                  setActiveSection('menu')
                  setSidebarExpanded(false)
                }
              }}
            >
              <List size={16} />
              {sidebarExpanded && <span className="ml-2 transition-all duration-200">Menù</span>}
            </Button>
            
            <Button
              variant={activeSection === 'reservations' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${activeSection === 'reservations' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'}`}
              onClick={() => {
                if (!sidebarExpanded) {
                  setSidebarExpanded(true)
                } else {
                  setActiveSection('reservations')
                  setSidebarExpanded(false)
                }
              }}
            >
              <Calendar size={16} />
              {sidebarExpanded && <span className="ml-2 transition-all duration-200">Prenotazioni</span>}
            </Button>
            
            <Button
              variant={activeSection === 'analytics' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${activeSection === 'analytics' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'}`}
              onClick={() => {
                if (!sidebarExpanded) {
                  setSidebarExpanded(true)
                } else {
                  setActiveSection('analytics')
                  setSidebarExpanded(false)
                }
              }}
            >
              <ChartBar size={16} />
              {sidebarExpanded && <span className="ml-2 transition-all duration-200">Analitiche</span>}
            </Button>
            
            <Button
              variant={activeSection === 'settings' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${activeSection === 'settings' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'}`}
              onClick={() => {
                if (!sidebarExpanded) {
                  setSidebarExpanded(true)
                } else {
                  setActiveSection('settings')
                  setSidebarExpanded(false)
                }
              }}
            >
              <Gear size={16} />
              {sidebarExpanded && <span className="ml-2 transition-all duration-200">Impostazioni</span>}
            </Button>
          </div>
        </nav>

        <div className="p-2">
          <Button variant="outline" onClick={onLogout} className={`w-full ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold hover:bg-destructive/5 hover:border-destructive/20 hover:text-destructive`}>
            <SignOut size={16} />
            {sidebarExpanded && <span className="ml-2 transition-all duration-200">Esci</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Clock size={16} />
              Ordini
            </TabsTrigger>
            <TabsTrigger value="tables" className="flex items-center gap-2">
              <MapPin size={16} />
              Tavoli
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-2">
              <BookOpen size={16} />
              Menu
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Calendar size={16} />
              Prenotazioni
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <ClockCounterClockwise size={16} />
              Storico
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ordini Attivi</h2>
              <Badge variant="secondary">{orders?.length || 0} ordini</Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(orders || []).map(order => {
                const table = (tables || []).find(t => t.id === order.tableId)
                const statusColors = {
                  waiting: 'border-yellow-200 bg-yellow-50',
                  preparing: 'border-blue-200 bg-blue-50', 
                  served: 'border-green-200 bg-green-50',
                  completed: 'border-gray-200 bg-gray-50'
                }

                return (
                  <Card key={order.id} className={`${statusColors[order.status]} border-2`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{table?.name || 'Tavolo sconosciuto'}</CardTitle>
                        <Badge className="text-xs">{order.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.items.map((item, index) => {
                          const menuItem = (menuItems || []).find(m => m.id === item.menuItemId)
                          return (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span>{item.quantity}x {menuItem?.name || 'Unknown'}</span>
                              <span>€{((menuItem?.price || 0) * item.quantity).toFixed(2)}</span>
                            </div>
                          )
                        })}
                        <Separator />
                        <div className="flex items-center justify-between font-medium">
                          <span>Totale</span>
                          <span>€{order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Gestione Tavoli</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus size={16} className="mr-2" />
                    Aggiungi Tavolo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuovo Tavolo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="table-name">Nome Tavolo</Label>
                      <Input
                        id="table-name"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        placeholder="es. Tavolo 1"
                      />
                    </div>
                    <Button onClick={handleCreateTable} className="w-full">
                      Crea Tavolo
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 h-12 px-6">
                        <List size={20} />
                        Gestisci Categorie
                      </Button>  
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Gestione Categorie</DialogTitle>
                        <DialogDescription>
                          Riordina le categorie trascinandole per cambiare l'ordine nel menu
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Add new category */}
                        <div className="flex gap-2">
                          <Input
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Nome nuova categoria"
                          />
                          <Button onClick={handleCreateCategory}>
                            <Plus size={16} />
                          </Button>
                        </div>
                        
                        {/* Category list with drag and drop */}
                        <div className="space-y-1 max-h-96 overflow-y-auto">
                          {categories?.map((category) => {
                            const categoryItemsCount = restaurantMenuItems.filter(item => item.category === category).length
                            const isDragging = draggedCategory === category
                            
                            return (
                              <div 
                                key={category} 
                                className={`flex items-center justify-between p-2 bg-muted/50 rounded-lg border-2 cursor-move transition-all duration-200 ${
                                  isDragging ? 'border-primary bg-primary/10 scale-105 shadow-lg' : 'border-transparent hover:border-primary/20 hover:bg-muted/70'
                                }`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, category)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, category)}
                                onDragEnd={handleDragEnd}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="text-muted-foreground cursor-move">⋮⋮</div>
                                  <div>
                                    <p className="font-medium text-sm">{category}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {categoryItemsCount} piatt{categoryItemsCount === 1 ? 'o' : 'i'}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(category)}
                                  disabled={categoryItemsCount > 0}
                                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash size={12} />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2 h-12 px-6">
                        <Plus size={20} />
                        Nuovo Piatto
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Aggiungi Nuovo Piatto</DialogTitle>
                        <DialogDescription>
                          Inserisci i dettagli del nuovo piatto da aggiungere al menù
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="dishName">Nome Piatto</Label>
                          <Input
                            id="dishName"
                            value={newMenuItem.name}
                            onChange={(e) => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Es: Spaghetti alla Carbonara"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dishDescription">Descrizione</Label>
                          <Textarea
                            id="dishDescription"
                            value={newMenuItem.description}
                            onChange={(e) => setNewMenuItem(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descrizione del piatto..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dishPrice">Prezzo (€)</Label>
                          <Input
                            id="dishPrice"
                            type="number"
                            step="0.01"
                            value={newMenuItem.price}
                            onChange={(e) => setNewMenuItem(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="12.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dishCategory">Categoria</Label>
                          <Select
                            value={newMenuItem.category}
                            onValueChange={(value) => setNewMenuItem(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((category) => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleCreateMenuItem} className="w-full">
                          Aggiungi Piatto
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-8">
                {categories?.map((category) => {
                  const categoryItems = restaurantMenuItems.filter(item => item.category === category)
                  
                  if (categoryItems.length === 0) return null
                  
                  return (
                    <div key={category} className="space-y-4">
                      <h3 className="text-2xl font-bold text-primary">{category}</h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categoryItems.map((item) => (
                          <Card key={item.id} className={`bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 ${!item.isActive ? 'opacity-50' : ''}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{item.name}</CardTitle>
                                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-primary text-lg">€{item.price.toFixed(2)}</div>
                                  <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                                    {item.isActive ? "Disponibile" : "Non Disponibile"}
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleMenuItem(item.id)}
                                  className="w-8 h-8 p-0 shadow-sm hover:shadow-gold transition-shadow duration-200"
                                >
                                  {item.isActive ? <EyeSlash size={12} /> : <Eye size={12} />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="shadow-sm hover:shadow-gold transition-shadow duration-200 px-2"
                                >
                                  <PencilSimple size={14} />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteMenuItem(item.id)}
                                  className="shadow-sm px-2"
                                >
                                  <Trash size={14} />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {restaurantMenuItems.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <ChefHat size={64} className="mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-medium">Nessun piatto nel menù</p>
                  <p className="text-sm mt-2">Aggiungi il primo piatto per iniziare</p>
                </div>
              )}

              {/* Reservations Table Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/15 rounded-lg flex items-center justify-center">
                      <Calendar size={20} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Prenotazioni</h3>
                      <p className="text-sm text-muted-foreground">Gestisci le prenotazioni per data e orario</p>
                    </div>
                  </div>
                  <Dialog open={showReservationDialog} onOpenChange={setShowReservationDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus size={16} />
                        Nuova Prenotazione
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nuova Prenotazione</DialogTitle>
                        <DialogDescription>
                          Aggiungi una nuova prenotazione per un tavolo
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="customerName">Nome Cliente</Label>
                            <Input
                              id="customerName"
                              value={newReservation.customerName}
                              onChange={(e) => setNewReservation(prev => ({ ...prev, customerName: e.target.value }))}
                              placeholder="Mario Rossi"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customerPhone">Telefono</Label>
                            <Input
                              id="customerPhone"
                              type="tel"
                              value={newReservation.customerPhone}
                              onChange={(e) => setNewReservation(prev => ({ ...prev, customerPhone: e.target.value }))}
                              placeholder="333 123 4567"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="reservationTable">Tavolo</Label>
                            <Select
                              value={newReservation.tableId}
                              onValueChange={(value) => setNewReservation(prev => ({ ...prev, tableId: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona tavolo" />
                              </SelectTrigger>
                              <SelectContent>
                                {restaurantTables.filter(t => t.isActive).map((table) => (
                                  <SelectItem key={table.id} value={table.id}>{table.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reservationDate">Data</Label>
                            <Input
                              id="reservationDate"
                              type="date"
                              value={newReservation.date}
                              onChange={(e) => setNewReservation(prev => ({ ...prev, date: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reservationTime">Orario</Label>
                            <Input
                              id="reservationTime"
                              type="time"
                              value={newReservation.time}
                              onChange={(e) => setNewReservation(prev => ({ ...prev, time: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guests">Numero Ospiti</Label>
                          <Input
                            id="guests"
                            type="number"
                            min="1"
                            max="20"
                            value={newReservation.guests}
                            onChange={(e) => setNewReservation(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                        <Button onClick={handleCreateReservation} className="w-full">
                          Crea Prenotazione
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Reservations Table */}
                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border/20">
                        <tr>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Cliente</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Telefono</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Tavolo</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Data</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Orario</th>
                          <th className="text-left py-4 px-6 font-semibold text-sm">Ospiti</th>
                          <th className="text-right py-4 px-6 font-semibold text-sm">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restaurantReservations.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-muted-foreground">
                              <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                              <p className="font-medium">Nessuna prenotazione</p>
                              <p className="text-sm">Le prenotazioni appariranno qui</p>
                            </td>
                          </tr>
                        ) : (
                          restaurantReservations
                            .sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime())
                            .map((reservation) => {
                              const table = restaurantTables.find(t => t.id === reservation.tableId)
                              const reservationDate = new Date(`${reservation.date} ${reservation.time}`)
                              const isPast = reservationDate < new Date()
                              
                              return (
                                <tr key={reservation.id} className={`border-b border-border/10 hover:bg-muted/20 transition-colors ${isPast ? 'opacity-60' : ''}`}>
                                  <td className="py-4 px-6">
                                    <div className="font-medium">{reservation.customerName}</div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="text-sm text-muted-foreground">{reservation.customerPhone}</span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                      {table?.name || 'Tavolo eliminato'}
                                    </Badge>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="text-sm">
                                      {new Date(reservation.date).toLocaleDateString('it-IT', { 
                                        weekday: 'short', 
                                        day: 'numeric', 
                                        month: 'short' 
                                      })}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="text-sm font-mono">{reservation.time}</span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-1">
                                      <Users size={14} className="text-muted-foreground" />
                                      <span className="text-sm">{reservation.guests}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteReservation(reservation.id)}
                                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash size={14} />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Analytics Section */}
          {activeSection === 'analytics' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                    <ChartBar size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">Dashboard Analitiche</h2>
                    <p className="text-muted-foreground">Monitora le performance del tuo ristorante</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={analyticsFilter} onValueChange={(value: typeof analyticsFilter) => setAnalyticsFilter(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Oggi</SelectItem>
                      <SelectItem value="yesterday">Ieri</SelectItem>
                      <SelectItem value="7days">Ultimi 7 giorni</SelectItem>
                      <SelectItem value="30days">Ultimi 30 giorni</SelectItem>
                      <SelectItem value="90days">Ultimi 90 giorni</SelectItem>
                      <SelectItem value="custom">Date personalizzate</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {analyticsFilter === 'custom' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={customDateRange.from}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="w-36"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="date"
                        value={customDateRange.to}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="w-36"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid md:grid-cols-5 gap-6">
                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ordini in Attesa</CardTitle>
                    <Bell className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-accent">{pendingOrdersCount}</div>
                    <p className="text-xs text-muted-foreground">
                      Da completare
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ordini ({getFilterLabel()})</CardTitle>
                    <ClockCounterClockwise className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{todayOrders}</div>
                    <p className="text-xs text-muted-foreground">
                      {getFilterLabel().toLowerCase()}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ricavi ({getFilterLabel()})</CardTitle>
                    <Money className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">€{todayRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">
                      {getFilterLabel().toLowerCase()}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Scontrino Medio</CardTitle>
                    <Receipt className="h-4 w-4 text-secondary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-secondary">
                      €{todayOrders > 0 ? (todayRevenue / todayOrders).toFixed(2) : '0.00'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      per ordine
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Prenotazioni</CardTitle>
                    <Calendar className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-accent">{restaurantReservations.length}</div>
                    <p className="text-xs text-muted-foreground">
                      totali
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader>
                    <CardTitle>Statistiche Generali</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Tavoli Attivi:</span>
                      <span className="font-semibold">{restaurantTables.filter(t => t.isActive).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Piatti nel Menù:</span>
                      <span className="font-semibold">{restaurantMenuItems.filter(m => m.isActive).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ordini Totali:</span>
                      <span className="font-semibold">{restaurantOrders.length + restaurantCompletedOrders.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tavoli Pagati:</span>
                      <span className="font-semibold">{(paidTables || []).length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader>
                    <CardTitle>Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Ordini Completati:</span>
                      <span className="font-semibold">{restaurantCompletedOrders.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tasso Completamento:</span>
                      <span className="font-semibold">
                        {(restaurantOrders.length + restaurantCompletedOrders.length) > 0 
                          ? `${Math.round((restaurantCompletedOrders.length / (restaurantOrders.length + restaurantCompletedOrders.length)) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tempo Medio:</span>
                      <span className="font-semibold">~15 min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efficienza:</span>
                      <span className="font-semibold text-green-600">Buona</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader>
                    <CardTitle>Piatti Più Ordinati</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const dishCounts = filteredOrders
                        .flatMap(order => order.items)
                        .reduce((acc, item) => {
                          const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                          const dishName = menuItem?.name || 'Piatto sconosciuto'
                          acc[dishName] = (acc[dishName] || 0) + item.quantity
                          return acc
                        }, {} as Record<string, number>)
                      
                      return Object.entries(dishCounts)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([dish, count], index) => (
                          <div key={dish} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                                {index + 1}
                              </div>
                              <span className="text-sm truncate">{dish}</span>
                            </div>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))
                    })()}
                    {filteredOrders.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nessun dato per il periodo selezionato
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {(orders || []).length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nessun ordine attivo</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Gestione Tavoli</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus size={16} className="mr-2" />
                    Aggiungi Tavolo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuovo Tavolo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="table-name">Nome Tavolo</Label>
                      <Input
                        id="table-name"
                        value={newTable.name}
                        onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                        placeholder="es. Tavolo 4"
                      />
                    </div>

                    {allYouCanEatMode && (
                      <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                        <Label htmlFor="allYouCanEatPrice">Prezzo per persona (€)</Label>
                        <Input
                          id="allYouCanEatPrice"
                          type="number"
                          step="0.01"
                          value={allYouCanEatPrice}
                          onChange={(e) => setAllYouCanEatPrice(parseFloat(e.target.value) || 0)}
                          placeholder="25.00"
                          className="shadow-sm focus:shadow-gold transition-shadow duration-200"
                        />
                        <p className="text-xs text-muted-foreground">
                          Quanto far pagare a persona per il menu all you can eat
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Coperto</Label>
                        <p className="text-sm text-muted-foreground">
                          Costo aggiuntivo per persona
                        </p>
                      </div>
                      <Switch
                        checked={coverChargeMode}
                        onCheckedChange={setCoverChargeMode}
                      />
                    </div>

                    {coverChargeMode && (
                      <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                        <Label htmlFor="coverCharge">Importo Coperto (€)</Label>
                        <Input
                          id="coverCharge"
                          type="number"
                          step="0.01"
                          value={coverChargeAmount}
                          onChange={(e) => setCoverChargeAmount(parseFloat(e.target.value) || 0)}
                          placeholder="2.50"
                          className="shadow-sm focus:shadow-gold transition-shadow duration-200"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Modalità Camerieri</Label>
                        <p className="text-sm text-muted-foreground">
                          Abilita interfaccia per camerieri
                        </p>
                      </div>
                      <Switch
                        checked={waitersMode}
                        onCheckedChange={setWaitersMode}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Reservations Section */}
          {activeSection === 'reservations' && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                  <Calendar size={24} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Prenotazioni</h2>
                  <p className="text-muted-foreground">Gestisci le prenotazioni dei tavoli</p>
                </div>
              </div>

              {/* Day filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button variant="outline" size="sm" className="whitespace-nowrap">Oggi</Button>
                <Button variant="outline" size="sm" className="whitespace-nowrap">Domani</Button>
                <Button variant="outline" size="sm" className="whitespace-nowrap">Dopodomani</Button>
                <Button variant="outline" size="sm" className="whitespace-nowrap">Settimana prossima</Button>
                <Button variant="outline" size="sm" className="whitespace-nowrap">Data personalizzata</Button>
              </div>

              {/* Reservations Table */}
              <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle>Prenotazioni di Oggi</CardTitle>
                  <CardDescription>Clicca su una cella per aggiungere o modificare una prenotazione</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                      {/* Header with hours */}
                      <div className="grid gap-1 mb-2" style={{gridTemplateColumns: 'repeat(13, minmax(0, 1fr))'}}>
                        <div className="p-2 font-medium text-sm text-center">Tavolo</div>
                        {Array.from({ length: 12 }, (_, i) => {
                          const hour = i + 12; // 12:00 to 23:00
                          return (
                            <div key={hour} className="p-2 font-medium text-xs text-center bg-primary/5 rounded">
                              {hour}:00
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Table rows */}
                      {restaurantTables.filter(t => t.isActive).map(table => (
                        <div key={table.id} className="grid gap-1 mb-1" style={{gridTemplateColumns: 'repeat(13, minmax(0, 1fr))'}}>
                          <div className="p-3 font-medium text-sm bg-muted/50 rounded flex items-center">
                            {table.name}
                          </div>
                          {Array.from({ length: 12 }, (_, i) => {
                            const hour = i + 12;
                            const timeSlot = `${hour}:00`;
                            const hasReservation = restaurantReservations.some(r => 
                              r.tableId === table.id && 
                              r.time === timeSlot &&
                              r.date === new Date().toISOString().split('T')[0]
                            );
                            
                            return (
                              <div
                                key={`${table.id}-${hour}`}
                                className={`p-2 h-12 border rounded cursor-pointer transition-colors ${
                                  hasReservation 
                                    ? 'bg-primary/20 border-primary/40 hover:bg-primary/30' 
                                    : 'bg-card hover:bg-primary/5 border-border/20'
                                }`}
                                onClick={() => {
                                  if (hasReservation) {
                                    // Show existing reservation details
                                    const reservation = restaurantReservations.find(r => 
                                      r.tableId === table.id && 
                                      r.time === timeSlot &&
                                      r.date === new Date().toISOString().split('T')[0]
                                    );
                                    if (reservation) {
                                      toast.info(`${reservation.customerName} - ${reservation.guests} persone`);
                                    }
                                  } else {
                                    // Open reservation dialog
                                    setSelectedReservationSlot({
                                      day: new Date().toISOString().split('T')[0],
                                      hour: timeSlot,
                                      tableId: table.id
                                    });
                                    setNewReservation({
                                      customerName: '',
                                      customerPhone: '',
                                      tableId: table.id,
                                      date: new Date().toISOString().split('T')[0],
                                      time: timeSlot,
                                      guests: 2
                                    });
                                    setShowReservationDialog(true);
                                  }
                                }}
                              >
                                {hasReservation && (
                                  <div className="text-xs text-center">
                                    <div className="w-2 h-2 bg-primary rounded-full mx-auto"></div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reservation Dialog */}
          {selectedReservationSlot && (
            <Dialog open={showReservationDialog} onOpenChange={setShowReservationDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuova Prenotazione</DialogTitle>
                  <DialogDescription>
                    {restaurantTables.find(t => t.id === selectedReservationSlot.tableId)?.name} - {selectedReservationSlot.hour}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Nome Cliente</Label>
                    <Input
                      id="customerName"
                      value={newReservation.customerName}
                      onChange={(e) => setNewReservation({ ...newReservation, customerName: e.target.value })}
                      placeholder="Mario Rossi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Telefono</Label>
                    <Input
                      id="customerPhone"
                      value={newReservation.customerPhone}
                      onChange={(e) => setNewReservation({ ...newReservation, customerPhone: e.target.value })}
                      placeholder="+39 123 456 7890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guests">Numero Persone</Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      max="20"
                      value={newReservation.guests}
                      onChange={(e) => setNewReservation({ ...newReservation, guests: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateReservation} className="flex-1">
                      Conferma Prenotazione
                    </Button>
                    <Button variant="outline" onClick={() => setShowReservationDialog(false)}>
                      Annulla
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          </div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="shadow-gold-lg">
          <DialogHeader>
            <DialogTitle>QR Code - {selectedTable?.name}</DialogTitle>
            <DialogDescription>
              Scansiona questo codice per accedere al tavolo
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-48 h-48 border-2 border-dashed border-primary/30 rounded-lg flex items-center justify-center bg-card-gradient shadow-gold relative overflow-hidden">
              <div className="absolute inset-0 bg-white rounded-lg m-2 flex flex-col items-center justify-center">
                <QrCode size={80} className="text-primary mb-2" />
                <div className="text-xs font-mono text-center px-2">
                  <div className="font-bold text-primary">{selectedTable?.name}</div>
                  <div className="text-muted-foreground mt-1">
                    {window.location.origin}?table={selectedTable?.id}&pin={selectedTable?.pin}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(tables || []).map(table => {
                const { statusColor, statusText, hasActiveOrders, isPaid } = getTableStatusInfo(table)
                
                return (
                  <Card key={table.id} className="border-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{table.name}</CardTitle>
                        <Badge className={statusColor}>{statusText}</Badge>
                      </div>
                      {table.customerCount && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users size={14} />
                          {table.customerCount} persone
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {table.status !== 'available' && (
                        <div className="text-sm space-y-1">
                          <p><strong>PIN:</strong> {table.pin}</p>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {table.status === 'available' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="flex-1">
                                <Plus size={14} className="mr-1" />
                                Apri Conto
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Apri {table.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="customer-count">Numero Persone</Label>
                                  <Input
                                    id="customer-count"
                                    type="number"
                                    min="1"
                                    max="20"
                                    defaultValue="2"
                                    onChange={(e) => {
                                      const count = parseInt(e.target.value)
                                      if (count > 0) {
                                        openNewTable(table.id, count)
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        {table.status === 'cleaning' && (
                          <Button 
                            size="sm" 
                            onClick={() => makeTableAvailable(table.id)}
                            className="flex-1"
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Tavolo Pronto
                          </Button>
                        )}

                        {(table.status === 'eating' || table.status === 'waiting-bill') && hasActiveOrders && (
                          <Button 
                            size="sm" 
                            onClick={() => closeTable(table.id)}
                            variant="secondary"
                            className="flex-1"
                          >
                            <CreditCard size={14} className="mr-1" />
                            Incassa
                          </Button>
                        )}

                        {table.status === 'order-ready' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateTableStatus(table.id, 'eating')}
                            className="flex-1"
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Servito
                          </Button>
                        )}

                        {table.status === 'waiting-order' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <QrCode size={14} className="mr-1" />
                                QR Code
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>QR Code - {table.name}</DialogTitle>
                              </DialogHeader>
                              <div className="text-center space-y-4">
                                <div className="text-2xl font-mono">{table.pin}</div>
                                <p className="text-sm text-muted-foreground">
                                  PIN da fornire ai clienti
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {table.qrCode}
                                </p>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Gestione Menu</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus size={16} className="mr-2" />
                    Aggiungi Piatto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuovo Piatto</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="item-name">Nome Piatto</Label>
                      <Input
                        id="item-name"
                        value={newMenuItem.name}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                        placeholder="es. Spaghetti Carbonara"
                      />
                    </div>
                    <div>
                      <Label htmlFor="item-description">Descrizione</Label>
                      <Textarea
                        id="item-description"
                        value={newMenuItem.description}
                        onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                        placeholder="es. Uova, guanciale, pecorino romano"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item-price">Prezzo (€)</Label>
                        <Input
                          id="item-price"
                          type="number"
                          step="0.50"
                          value={newMenuItem.price}
                          onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                          placeholder="12.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="item-category">Categoria</Label>
                        <Input
                          id="item-category"
                          value={newMenuItem.category}
                          onChange={(e) => setNewMenuItem({ ...newMenuItem, category: e.target.value })}
                          placeholder="es. Primi"
                        />
                      </div>
                    </div>
                    <Button onClick={addMenuItem}>Aggiungi Piatto</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-6">
              {Object.entries(menuByCategory).map(([category, items]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.name}</h4>
                            <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                            <p className="text-sm font-medium">€{item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge variant={item.isActive ? "default" : "secondary"}>
                              {item.isActive ? 'Attivo' : 'Disattivo'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleMenuItemActive(item.id)}
                            >
                              {item.isActive ? 'Disattiva' : 'Attiva'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Prenotazioni</h2>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(days => {
                    const date = new Date()
                    date.setDate(date.getDate() + days)
                    const dateStr = date.toISOString().split('T')[0]
                    const label = days === 0 ? 'Oggi' : days === 1 ? 'Domani' : `+${days}`
                    
                    return (
                      <Button
                        key={days}
                        size="sm"
                        variant={selectedDate === dateStr ? "default" : "outline"}
                        onClick={() => setSelectedDate(dateStr)}
                      >
                        {label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-14 gap-0 border-b">
                  <div className="p-2 border-r bg-muted font-medium">Tavolo</div>
                  {timeSlots.map(time => (
                    <div key={time} className="p-2 border-r bg-muted font-medium text-center text-sm">
                      {time}
                    </div>
                  ))}
                </div>
                
                {(tables || []).map(table => {
                  const tableReservations = (reservations || []).filter(r => 
                    r.tableId === table.id && r.date === selectedDate
                  )
                  
                  return (
                    <div key={table.id} className="grid grid-cols-14 gap-0 border-b">
                      <div className="p-2 border-r font-medium">{table.name}</div>
                      {timeSlots.map(time => {
                        const reservation = tableReservations.find(r => r.time === time)
                        
                        return (
                          <div key={time} className="p-1 border-r">
                            {reservation ? (
                              <div className="bg-primary/10 border border-primary/20 rounded p-1 text-xs">
                                <div className="font-medium truncate">{reservation.customerName}</div>
                                <div className="text-muted-foreground">{reservation.guests}p</div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full h-12 text-xs"
                                onClick={() => addReservation(selectedDate, time, table.id)}
                              >
                                +
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Reservation Dialog */}
            <Dialog open={!!quickReservation.time} onOpenChange={() => setQuickReservation({ ...quickReservation, time: '', tableId: '' })}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuova Prenotazione</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {(tables || []).find(t => t.id === quickReservation.tableId)?.name} - {quickReservation.time}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="customer-name">Nome Cliente</Label>
                    <Input
                      id="customer-name"
                      value={quickReservation.customerName}
                      onChange={(e) => setQuickReservation({ ...quickReservation, customerName: e.target.value })}
                      placeholder="Mario Rossi"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone">Telefono</Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      value={quickReservation.customerPhone}
                      onChange={(e) => setQuickReservation({ ...quickReservation, customerPhone: e.target.value })}
                      placeholder="+39 123 456 7890"
                    />
                  </div>
                  <div>
                    <Label htmlFor="guests">Numero Persone</Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      max="20"
                      value={quickReservation.guests}
                      onChange={(e) => setQuickReservation({ ...quickReservation, guests: parseInt(e.target.value) || 2 })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveQuickReservation} className="flex-1">Salva Prenotazione</Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setQuickReservation({ ...quickReservation, time: '', tableId: '' })}
                    >
                      Annulla
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Storico Ordini</h2>
              <Badge variant="secondary">{filteredOrderHistory.length} ordini</Badge>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FunnelSimple size={16} />
                  Filtri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <Label htmlFor="date-from">Da Data</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={historyFilters.dateFrom}
                      onChange={(e) => setHistoryFilters({ ...historyFilters, dateFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-to">A Data</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={historyFilters.dateTo}
                      onChange={(e) => setHistoryFilters({ ...historyFilters, dateTo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="table-filter">Tavolo</Label>
                    <Select value={historyFilters.tableId} onValueChange={(value) => setHistoryFilters({ ...historyFilters, tableId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tutti i tavoli" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti i tavoli</SelectItem>
                        {(tables || []).map(table => (
                          <SelectItem key={table.id} value={table.id}>{table.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="customer-filter">Nome Cliente</Label>
                    <Input
                      id="customer-filter"
                      value={historyFilters.customerName}
                      onChange={(e) => setHistoryFilters({ ...historyFilters, customerName: e.target.value })}
                      placeholder="Cerca per nome"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setHistoryFilters({ dateFrom: '', dateTo: '', tableId: 'all', customerName: '' })}
                  >
                    Pulisci Filtri
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* History List */}
            <div className="space-y-4">
              {filteredOrderHistory.map(order => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{order.tableName}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.paidAt).toLocaleString('it-IT')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">€{order.total.toFixed(2)}</div>
                        {order.customerCount && (
                          <p className="text-sm text-muted-foreground">{order.customerCount} persone</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.customerName && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users size={14} />
                          <span>{order.customerName}</span>
                          {order.customerPhone && (
                            <>
                              <Phone size={14} className="ml-2" />
                              <span>{order.customerPhone}</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="grid gap-1">
                        {order.items.map(item => (
                          <div key={item.menuItemId} className="flex items-center justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span>€{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredOrderHistory.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <ClockCounterClockwise size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessun ordine nello storico</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
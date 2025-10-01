import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { User, Table, MenuItem, Order, Restaurant, Reservation } from '../App'
import { 
  ChefHat, 
  Plus, 
  QrCode, 
  Users, 
  SignOut, 
  Trash, 
  Eye,
  EyeSlash,
  ClockCounterClockwise,
  CheckCircle,
  Circle,
  Bell,
  List,
  ChartBar,
  Gear,
  Receipt,
  Square,
  CaretRight,
  CaretLeft,
  CaretDown,
  Calendar,
  DownloadSimple,
  Money,
  CreditCard,
  X,
  PencilSimple
} from '@phosphor-icons/react'

interface Props {
  user: User
  onLogout: () => void
}

export default function RestaurantDashboard({ user, onLogout }: Props) {
  const [restaurants] = useKV<Restaurant[]>('restaurants', [])
  const [tables, setTables] = useKV<Table[]>('tables', [])
  const [menuItems, setMenuItems] = useKV<MenuItem[]>('menuItems', [])
  const [orders, setOrders] = useKV<Order[]>('orders', [])
  const [completedOrders, setCompletedOrders] = useKV<Order[]>('completedOrders', [])
  const [paidTables, setPaidTables] = useKV<string[]>('paidTables', [])
  const [categories, setCategories] = useKV<string[]>('categories', ['Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci', 'Bevande'])
  const [reservations, setReservations] = useKV<Reservation[]>('reservations', [])
  
  // Settings states
  const [allYouCanEatMode, setAllYouCanEatMode] = useKV<boolean>('allYouCanEatMode', false)
  const [coverChargeMode, setCoverChargeMode] = useKV<boolean>('coverChargeMode', false)
  const [coverChargeAmount, setCoverChargeAmount] = useKV<number>('coverChargeAmount', 2.50)
  const [waitersMode, setWaitersMode] = useKV<boolean>('waitersMode', false)

  // UI states
  const [activeSection, setActiveSection] = useState('orders')
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
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

  const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString()

  const getTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60))
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      if (remainingMinutes === 0) {
        return `${hours}h fa`
      }
      return `${hours}h ${remainingMinutes}min fa`
    }
    return `${minutes} min fa`
  }

  const handleCreateTable = () => {
    if (!newTable.name) {
      toast.error('Inserisci il nome del tavolo')
      return
    }

    const tableId = `table-${Date.now()}`
    const pin = generatePin()
    const table: Table = {
      id: tableId,
      name: newTable.name,
      isActive: true,
      pin: pin,
      qrCode: `${window.location.origin}?table=${tableId}&pin=${pin}`,
      restaurantId: user.restaurantId!
    }

    setTables((current) => [...(current || []), table])
    setNewTable({ name: '' })
    setShowTableDialog(false)
    toast.success('Tavolo creato con successo')
  }

  const handleCreateMenuItem = () => {
    if (!newMenuItem.name || !newMenuItem.price || !newMenuItem.category) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    const menuItem: MenuItem = {
      id: `menu-${Date.now()}`,
      name: newMenuItem.name,
      description: newMenuItem.description,
      price: parseFloat(newMenuItem.price),
      category: newMenuItem.category,
      isActive: true,
      restaurantId: user.restaurantId!
    }

    setMenuItems((current) => [...(current || []), menuItem])
    setNewMenuItem({ name: '', description: '', price: '', category: '' })
    setShowMenuDialog(false)
    toast.success('Piatto aggiunto al menù')
  }

  const handleCreateCategory = () => {
    if (!newCategory.trim()) {
      toast.error('Inserisci il nome della categoria')
      return
    }

    if ((categories || []).includes(newCategory)) {
      toast.error('Categoria già esistente')
      return
    }

    setCategories((current) => [...(current || []), newCategory])
    setNewCategory('')
    setShowCategoryDialog(false)
    toast.success('Categoria creata con successo')
  }

  const handleToggleTable = (tableId: string) => {
    setTables((current) => 
      (current || []).map(t => 
        t.id === tableId ? { ...t, isActive: !t.isActive, pin: !t.isActive ? generatePin() : t.pin } : t
      )
    )
    toast.success('Stato tavolo aggiornato')
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
      id: `reservation-${Date.now()}`,
      customerName: newReservation.customerName,
      customerPhone: newReservation.customerPhone,
      tableId: newReservation.tableId,
      date: newReservation.date,
      time: newReservation.time,
      guests: newReservation.guests,
      restaurantId: user.restaurantId!
    }

    setReservations((current) => [...(current || []), reservation])
    setNewReservation({ customerName: '', customerPhone: '', tableId: '', date: '', time: '', guests: 1 })
    setShowReservationDialog(false)
    toast.success('Prenotazione creata con successo')
  }

  const handleDeleteReservation = (reservationId: string) => {
    setReservations((current) => (current || []).filter(r => r.id !== reservationId))
    toast.success('Prenotazione eliminata')
  }

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
  }

  const filteredOrders = getFilteredOrders()
  const todayOrders = filteredOrders.length
  const todayRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0)
  
  const getFilterLabel = () => {
    switch (analyticsFilter) {
      case 'today': return 'Oggi'
      case 'yesterday': return 'Ieri'
      case '7days': return 'Ultimi 7 giorni'
      case '30days': return 'Ultimi 30 giorni'
      case '90days': return 'Ultimi 90 giorni'
      case 'custom': return 'Periodo personalizzato'
      default: return 'Oggi'
    }
  }

  const getTableBill = (tableId: string) => {
    const tableOrders = [...restaurantOrders, ...restaurantCompletedOrders].filter(o => o.tableId === tableId)
    const total = tableOrders.reduce((sum, o) => sum + o.total, 0)
    return { orders: tableOrders, total }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div 
        className={`${sidebarExpanded ? 'w-64' : 'w-16'} transition-all duration-300 ease-in-out bg-white border-r border-border/20 shadow-professional flex flex-col`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-3 transition-all duration-300 ${!sidebarExpanded && 'justify-center'}`}>
              <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center shadow-professional">
                <ChefHat weight="bold" size={20} className="text-primary" />
              </div>
              {sidebarExpanded && (
                <div className="transition-opacity duration-300">
                  <h1 className="text-lg font-bold text-foreground">
                    {restaurant?.name || 'Ristorante'}
                  </h1>
                  <p className="text-xs text-muted-foreground">{user.username}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-1 hover:bg-primary/10 transition-all duration-200 hover:shadow-gold rounded-lg"
            >
              {sidebarExpanded ? <CaretLeft size={16} /> : <CaretRight size={16} />}
            </Button>
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
      <div className="flex-1 min-w-0 bg-gradient-to-br from-background via-background/95 to-background">
        <div className="h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Orders Section */}
            {activeSection === 'orders' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                      <Bell size={24} className="text-primary" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-foreground">Gestione Ordini</h2>
                      <p className="text-muted-foreground">Monitora e completa gli ordini in tempo reale</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={orderViewMode} onValueChange={(value: 'tables' | 'dishes') => setOrderViewMode(value)}>
                      <SelectTrigger className="w-48 h-12 shadow-sm border-border/20 hover:border-primary/30 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tables">
                          <div className="flex items-center gap-2">
                            <Square size={16} />
                            Per Tavoli
                          </div>
                        </SelectItem>
                        <SelectItem value="dishes">
                          <div className="flex items-center gap-2">
                            <ChefHat size={16} />
                            Per Piatti
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              <div className="space-y-6">
                {restaurantOrders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <Bell size={64} className="mx-auto mb-4 opacity-30" />
                    <p className="text-xl font-medium">Nessun ordine in attesa</p>
                    <p className="text-sm mt-2">Gli ordini appariranno qui quando arriveranno</p>
                  </div>
                ) : orderViewMode === 'tables' ? (
                  // Group by tables - Professional Layout
                  (() => {
                    const groupedByTable = restaurantOrders.reduce((groups, order) => {
                      const tableId = order.tableId
                      if (!groups[tableId]) {
                        groups[tableId] = []
                      }
                      groups[tableId].push(order)
                      return groups
                    }, {} as Record<string, Order[]>)

                    return Object.entries(groupedByTable)
                      .sort(([, ordersA], [, ordersB]) => {
                        const latestA = Math.max(...ordersA.map(o => o.timestamp))
                        const latestB = Math.max(...ordersB.map(o => o.timestamp))
                        return latestB - latestA
                      })
                      .map(([tableId, orders]) => {
                        const table = restaurantTables.find(t => t.id === tableId)
                        const totalAmount = orders.reduce((sum, order) => sum + order.total, 0)
                        const oldestOrder = orders.reduce((oldest, order) => 
                          order.timestamp < oldest.timestamp ? order : oldest
                        )

                        return (
                          <Card key={tableId} className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500 mb-6">
                            {/* Header with Table Info */}
                            <div className="bg-gradient-to-r from-primary/8 via-primary/4 to-accent/8 px-6 py-4 border-b border-border/10">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                                      <Square size={24} weight="fill" className="text-primary" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="text-2xl font-bold text-foreground">
                                      {table?.name || 'Tavolo sconosciuto'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-medium">
                                      {orders.length} {orders.length === 1 ? 'ordine' : 'ordini'} • {getTimeAgo(oldestOrder.timestamp)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-primary">€{totalAmount.toFixed(2)}</div>
                                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-medium">
                                    In preparazione
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Order Items - Compact Version */}
                            <div className="p-4 space-y-2">
                              {orders.flatMap(order => order.items).map((item, index) => {
                                const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                                const originalOrderIndex = restaurantOrders.findIndex(o => 
                                  o.items.some(i => i.menuItemId === item.menuItemId)
                                )
                                const originalOrder = restaurantOrders[originalOrderIndex]
                                const itemIndex = originalOrder?.items.findIndex(i => i.menuItemId === item.menuItemId) || 0

                                return (
                                  <div key={`${item.menuItemId}-${index}`} className="group bg-gradient-to-r from-card via-background to-card border border-border/10 rounded-lg p-3 hover:shadow-lg transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                    <div className="flex items-center justify-between gap-3">
                                      {/* Quantity Badge - Smaller */}
                                      <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-accent/15 rounded-lg flex items-center justify-center border border-accent/20">
                                          <span className="text-lg font-bold text-accent">{item.quantity}</span>
                                        </div>
                                      </div>

                                      {/* Item Details - Compact */}
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-base font-semibold text-foreground leading-tight">
                                          {menuItem?.name || 'Piatto non trovato'}
                                        </h4>
                                        {item.notes && (
                                          <p className="text-xs text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded">
                                            📝 {item.notes}
                                          </p>
                                        )}
                                      </div>

                                      {/* Complete Button - Compact */}
                                      <div className="flex-shrink-0">
                                        <Button
                                          size="sm"
                                          onClick={() => originalOrder && handleCompleteOrderItem(originalOrder.id, itemIndex)}
                                          className="h-10 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 rounded-lg border-0"
                                        >
                                          <CheckCircle size={16} className="mr-1" />
                                          PRONTO
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </Card>
                        )
                      })
                  })()
                ) : (
                  // Group by dishes - Professional Layout
                  (() => {
                    const groupedByDish = restaurantOrders.flatMap(order => 
                      order.items.map(item => ({
                        ...item,
                        orderId: order.id,
                        tableId: order.tableId,
                        timestamp: order.timestamp
                      }))
                    ).reduce((groups, item) => {
                      const menuItemId = item.menuItemId
                      if (!groups[menuItemId]) {
                        groups[menuItemId] = []
                      }
                      groups[menuItemId].push(item)
                      return groups
                    }, {} as Record<string, Array<{menuItemId: string, quantity: number, notes?: string, orderId: string, tableId: string, timestamp: number}>>)

                    return Object.entries(groupedByDish)
                      .sort(([, itemsA], [, itemsB]) => {
                        const latestA = Math.max(...itemsA.map(i => i.timestamp))
                        const latestB = Math.max(...itemsB.map(i => i.timestamp))
                        return latestB - latestA
                      })
                      .map(([menuItemId, items]) => {
                        const menuItem = restaurantMenuItems.find(m => m.id === menuItemId)
                        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
                        const oldestItem = items.reduce((oldest, item) => 
                          item.timestamp < oldest.timestamp ? item : oldest
                        )

                        return (
                          <Card key={menuItemId} className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500 mb-6">
                            {/* Header with Dish Info */}
                            <div className="bg-gradient-to-r from-accent/8 via-accent/4 to-primary/8 px-6 py-4 border-b border-border/10">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <div className="w-12 h-12 bg-accent/15 rounded-xl flex items-center justify-center">
                                      <ChefHat size={24} weight="fill" className="text-accent" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="text-2xl font-bold text-foreground">
                                      {menuItem?.name || 'Piatto non trovato'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-medium">
                                      {totalQuantity} porzioni • {getTimeAgo(oldestItem.timestamp)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-accent">×{totalQuantity}</div>
                                  <Badge variant="secondary" className="bg-accent/10 text-accent border-0 font-medium">
                                    Da preparare
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Tables Needing This Dish */}
                            <div className="p-6 space-y-4">
                              {items.map((item, index) => {
                                const table = restaurantTables.find(t => t.id === item.tableId)
                                const originalOrder = restaurantOrders.find(o => o.id === item.orderId)
                                const itemIndex = originalOrder?.items.findIndex(i => i.menuItemId === item.menuItemId) || 0

                                return (
                                  <div key={`${item.orderId}-${index}`} className="group bg-gradient-to-r from-card via-background to-card border border-border/8 rounded-xl p-4 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center justify-between gap-4">
                                      {/* Quantity Badge */}
                                      <div className="flex-shrink-0">
                                        <div className="relative">
                                          <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center border-2 border-primary/20">
                                            <span className="text-lg font-black text-primary">{item.quantity}</span>
                                          </div>
                                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Table Details */}
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-bold text-foreground leading-tight">
                                          {table?.name || 'Tavolo sconosciuto'}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                          {getTimeAgo(item.timestamp)}
                                        </p>
                                        {item.notes && (
                                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                            <p className="text-xs text-amber-800 font-medium">
                                              📝 {item.notes}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Complete Button */}
                                      <div className="flex-shrink-0">
                                        <Button
                                          size="lg"
                                          onClick={() => originalOrder && handleCompleteOrderItem(originalOrder.id, itemIndex)}
                                          className="h-12 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl border-0 group-hover:scale-105"
                                        >
                                          <CheckCircle size={20} className="mr-2" />
                                          PRONTO
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </Card>
                        )
                      })
                  })()
                )}
              </div>

              {/* Completed Orders Section */}
              {restaurantCompletedOrders.length > 0 && (
                <div className="space-y-6 mt-12">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Ordini Completati</h3>
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border border-green-200">
                      {restaurantCompletedOrders.length}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {restaurantCompletedOrders.map((order) => {
                      const table = restaurantTables.find(t => t.id === order.tableId)
                      return (
                        <Card key={order.id} className="bg-gradient-to-br from-green-50/50 to-background border border-green-200/30 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                  <Square size={20} className="text-green-600" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-foreground">
                                    {table?.name || 'Tavolo sconosciuto'}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {getTimeAgo(order.timestamp)}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-medium">
                                ✓ Completato
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              {order.items.map((item, index) => {
                                const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                                return (
                                  <div key={index} className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-green-200/20">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                        <span className="text-sm font-bold text-green-600">{item.quantity}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground text-sm leading-tight">
                                          {menuItem?.name || 'Piatto non trovato'}
                                        </p>
                                        {item.notes && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            📝 {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUncompleteOrderItem(order.id)}
                                      className="h-8 px-3 text-xs border-muted-foreground/30 hover:bg-muted/50 hover:border-muted-foreground/50 transition-all duration-200"
                                    >
                                      <Circle size={14} className="mr-1" />
                                      Annulla
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tables Section */}
          {activeSection === 'tables' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                    <Square size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">Gestione Tavoli</h2>
                    <p className="text-muted-foreground">Configura e monitora i tuoi tavoli</p>
                  </div>
                </div>
                <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 h-12 px-6">
                      <Plus size={20} />
                      Nuovo Tavolo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crea Nuovo Tavolo</DialogTitle>
                      <DialogDescription>
                        Aggiungi un nuovo tavolo con QR code univoco
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="tableName">Nome Tavolo</Label>
                        <Input
                          id="tableName"
                          value={newTable.name}
                          onChange={(e) => setNewTable({ name: e.target.value })}
                          placeholder="Es: Tavolo 1"
                        />
                      </div>
                      <Button onClick={handleCreateTable} className="w-full">
                        Crea Tavolo
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {restaurantTables.map((table) => {
                  const bill = getTableBill(table.id)
                  const isPaid = (paidTables || []).includes(table.id)
                  
                  return (
                    <Card key={table.id} className={`bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 ${!table.isActive ? 'opacity-50' : ''} ${isPaid ? 'bg-green-50 border-green-200' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Square size={20} weight={table.isActive ? 'fill' : 'regular'} className="text-primary" />
                            <CardTitle className="text-lg">{table.name}</CardTitle>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">PIN: {table.pin}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTable(table)}
                            className="shadow-sm hover:shadow-gold transition-shadow duration-200 px-2"
                          >
                            <PencilSimple size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTable(table)
                              setShowQRDialog(true)
                            }}
                            className="shadow-sm hover:shadow-gold transition-shadow duration-200"
                          >
                            QR Code
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTable(table)
                              setShowBillDialog(true)
                            }}
                            className="shadow-sm hover:shadow-gold transition-shadow duration-200"
                          >
                            Conto
                          </Button>
                        </div>
                        {bill.total > 0 && !isPaid && (
                          <div className="pt-2 border-t">
                            <div className="flex justify-between items-center text-sm">
                              <span>Totale conto:</span>
                              <span className="font-semibold">€{bill.total.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                        {isPaid && (
                          <div className="text-center text-sm text-green-600 font-medium">
                            ✓ Pagato
                          </div>
                        )}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleTable(table.id)}
                            className="w-8 h-8 p-0 shadow-sm hover:shadow-gold transition-shadow duration-200"
                          >
                            {table.isActive ? <EyeSlash size={12} /> : <Eye size={12} />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTable(table.id)}
                            className="px-2 shadow-sm"
                          >
                            <Trash size={12} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                {restaurantTables.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    Nessun tavolo configurato. Crea il primo tavolo per iniziare.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Menu Section with Reservations */}
          {activeSection === 'menu' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                    <List size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">Gestione Menù</h2>
                    <p className="text-muted-foreground">Gestisci piatti e categorie del menù</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog open={showCategoryManageDialog} onOpenChange={setShowCategoryManageDialog}>
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

              {/* Additional Charts Row */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader>
                    <CardTitle>Distribuzione Ordini per Orario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const hourCounts = filteredOrders.reduce((acc, order) => {
                          const hour = new Date(order.timestamp).getHours()
                          const hourRange = `${hour}:00-${hour + 1}:00`
                          acc[hourRange] = (acc[hourRange] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                        
                        const maxCount = Math.max(...Object.values(hourCounts), 1)
                        
                        return Object.entries(hourCounts)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([timeRange, count]) => (
                            <div key={timeRange} className="flex items-center gap-3">
                              <div className="w-16 text-xs text-muted-foreground font-mono">
                                {timeRange}
                              </div>
                              <div className="flex-1 bg-muted rounded-full h-2 relative overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${(count / maxCount) * 100}%` }}
                                />
                              </div>
                              <div className="w-8 text-xs font-semibold text-right">
                                {count}
                              </div>
                            </div>
                          ))
                      })()}
                      {filteredOrders.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nessun dato per il periodo selezionato
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] transition-all duration-500">
                  <CardHeader>
                    <CardTitle>Ricavi per Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(() => {
                        const categoryRevenue = filteredOrders
                          .flatMap(order => order.items)
                          .reduce((acc, item) => {
                            const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                            const category = menuItem?.category || 'Altro'
                            const revenue = (menuItem?.price || 0) * item.quantity
                            acc[category] = (acc[category] || 0) + revenue
                            return acc
                          }, {} as Record<string, number>)
                        
                        const maxRevenue = Math.max(...Object.values(categoryRevenue), 1)
                        
                        return Object.entries(categoryRevenue)
                          .sort(([,a], [,b]) => b - a)
                          .map(([category, revenue]) => (
                            <div key={category} className="flex items-center gap-3">
                              <div className="w-20 text-xs text-muted-foreground truncate">
                                {category}
                              </div>
                              <div className="flex-1 bg-muted rounded-full h-2 relative overflow-hidden">
                                <div 
                                  className="h-full bg-accent rounded-full transition-all duration-500"
                                  style={{ width: `${(revenue / maxRevenue) * 100}%` }}
                                />
                              </div>
                              <div className="w-12 text-xs font-semibold text-right">
                                €{revenue.toFixed(0)}
                              </div>
                            </div>
                          ))
                      })()}
                      {filteredOrders.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nessun dato per il periodo selezionato
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center">
                  <Gear size={24} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Impostazioni Ristorante</h2>
                  <p className="text-muted-foreground">Configura le impostazioni del tuo ristorante</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15)] transition-all duration-500">
                  <CardHeader>
                    <CardTitle>Informazioni Ristorante</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome Ristorante</Label>
                      <Input value={restaurant?.name || ''} disabled className="shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contatto</Label>
                      <Input value={restaurant?.contact || ''} disabled className="shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label>Orari</Label>
                      <Input value={restaurant?.hours || ''} disabled className="shadow-sm" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Per modificare queste informazioni, contatta l'amministratore del sistema.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-border/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden hover:shadow-[0_20px_64px_-12px_rgba(0,0,0,0.15)] transition-all duration-500">
                  <CardHeader>
                    <CardTitle>Modalità Speciali</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">All You Can Eat</Label>
                        <p className="text-sm text-muted-foreground">
                          Prezzo fisso per persona invece che per piatto
                        </p>
                      </div>
                      <Switch
                        checked={allYouCanEatMode}
                        onCheckedChange={setAllYouCanEatMode}
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
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              PIN: <span className="font-semibold text-primary">{selectedTable?.pin}</span>
            </p>
            <div className="flex gap-2">
              <Button className="flex-1 bg-gold-gradient shadow-gold hover:shadow-gold-lg transition-shadow duration-200">
                <DownloadSimple size={16} className="mr-2" />
                Scarica QR Code
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  const url = `${window.location.origin}?table=${selectedTable?.id}&pin=${selectedTable?.pin}`
                  window.open(url, '_blank')
                }}
                className="px-3 shadow-gold hover:shadow-gold-lg transition-shadow duration-200"
                title="Testa il QR code"
              >
                🧪
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Dialog */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-md shadow-gold-lg">
          <DialogHeader>
            <DialogTitle>Conto - {selectedTable?.name}</DialogTitle>
            <DialogDescription>
              Dettaglio ordini e totale del tavolo
            </DialogDescription>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              {(() => {
                const bill = getTableBill(selectedTable.id)
                const isPaid = (paidTables || []).includes(selectedTable.id)
                
                return (
                  <>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {bill.orders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-3 bg-card-gradient shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">
                              {new Date(order.timestamp).toLocaleTimeString()}
                            </span>
                            <Badge variant="outline" className="bg-primary/10">Completato</Badge>
                          </div>
                          <div className="space-y-1">
                            {order.items.map((item, index) => {
                              const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                              return (
                                <div key={index} className="flex justify-between text-sm">
                                  <span>{item.quantity}x {menuItem?.name}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                      
                      {bill.orders.length === 0 && (
                        <div className="text-center text-muted-foreground py-4">
                          Nessun ordine per questo tavolo
                        </div>
                      )}
                    </div>
                    
                    {bill.total > 0 && (
                      <>
                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center text-lg font-semibold">
                            <span>Totale:</span>
                            <span className="text-primary">€{bill.total.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {!isPaid ? (
                            <Button 
                              className="w-full bg-gold-gradient shadow-gold hover:shadow-gold-lg transition-shadow duration-200" 
                              onClick={() => {
                                handleMarkTableAsPaid(selectedTable.id)
                                setShowBillDialog(false)
                              }}
                            >
                              <CreditCard size={16} className="mr-2" />
                              Segna come Pagato
                            </Button>
                          ) : (
                            <div className="text-center text-green-600 font-medium py-2">
                              ✓ Tavolo già pagato
                            </div>
                          )}
                          
                          <Button 
                            variant="destructive" 
                            className="w-full shadow-sm"
                            onClick={() => {
                              // Delete all orders for this table
                              setOrders((current) => (current || []).filter(o => o.tableId !== selectedTable.id))
                              setCompletedOrders((current) => (current || []).filter(o => o.tableId !== selectedTable.id))
                              setPaidTables((current) => (current || []).filter(id => id !== selectedTable.id))
                              setShowBillDialog(false)
                              toast.success('Ordini eliminati')
                            }}
                          >
                            <Trash size={16} className="mr-2" />
                            Elimina Ordini
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
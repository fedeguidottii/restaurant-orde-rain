import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Plus, MapPin, BookOpen, Clock, ChartBar, Gear, SignOut, Trash, Eye, EyeSlash, QrCode, PencilSimple, Calendar, List, ClockCounterClockwise, Check, X } from '@phosphor-icons/react'
import type { User, Table, MenuItem, Order, Restaurant, Reservation, OrderHistory, MenuCategory } from '../App'
import TimelineReservations from './TimelineReservations'
import ReservationsManager from './ReservationsManager'
import AnalyticsCharts from './AnalyticsCharts'

interface RestaurantDashboardProps {
  user: User
  onLogout: () => void
}

const RestaurantDashboard = ({ user, onLogout }: RestaurantDashboardProps) => {
  const [activeSection, setActiveSection] = useState('orders')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('orders')
  
  const [tables, setTables] = useKV<Table[]>('tables', [])
  const [menuItems, setMenuItems] = useKV<MenuItem[]>('menuItems', [])
  const [orders, setOrders] = useKV<Order[]>(`orders_${user.restaurantId}`, [])
  const [completedOrders, setCompletedOrders] = useKV<Order[]>(`completedOrders_${user.restaurantId}`, [])
  const [reservations, setReservations] = useKV<Reservation[]>(`reservations_${user.restaurantId}`, [])
  const [orderHistory, setOrderHistory] = useKV<OrderHistory[]>(`orderHistory_${user.restaurantId}`, [])
  const [categories, setCategories] = useKV<MenuCategory[]>('menuCategories', [])
  const [restaurants, setRestaurants] = useKV<Restaurant[]>('restaurants', [])
  
  const [newTableName, setNewTableName] = useState('')
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: ''
  })
  const [newCategory, setNewCategory] = useState('')
  const [draggedCategory, setDraggedCategory] = useState<MenuCategory | null>(null)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showMenuDialog, setShowMenuDialog] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [orderViewMode, setOrderViewMode] = useState<'table' | 'dish'>('table')
  const [showCompletedOrders, setShowCompletedOrders] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [customerCount, setCustomerCount] = useState('')
  const [selectedOrderHistory, setSelectedOrderHistory] = useState<OrderHistory | null>(null)
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  
  const restaurantMenuItems = menuItems?.filter(item => item.restaurantId === user.restaurantId) || []
  const restaurantTables = tables?.filter(table => table.restaurantId === user.restaurantId) || []
  const restaurantOrders = orders?.filter(order => order.restaurantId === user.restaurantId) || []
  const restaurantCompletedOrders = completedOrders?.filter(order => order.restaurantId === user.restaurantId) || []
  const restaurantReservations = reservations?.filter(reservation => reservation.restaurantId === user.restaurantId) || []
  const restaurantOrderHistory = orderHistory?.filter(history => history.restaurantId === user.restaurantId) || []
  const restaurantCategories = categories?.filter(cat => cat.restaurantId === user.restaurantId) || []

  // Get current restaurant
  const currentRestaurant = restaurants?.find(r => r.id === user.restaurantId)

  const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString()
  const generateQrCode = (tableId: string) => `${window.location.origin}?table=${tableId}`

  const handleCreateTable = () => {
    if (!newTableName.trim()) {
      toast.error('Inserisci un nome per il tavolo')
      return
    }

    const tableId = Date.now().toString()
    const newTable: Table = {
      id: tableId,
      name: newTableName,
      isActive: false, // Start as empty/inactive
      pin: generatePin(),
      qrCode: generateQrCode(tableId),
      restaurantId: user.restaurantId!,
      status: 'available'
    }

    setTables([...(tables || []), newTable])
    setNewTableName('')
    toast.success('Tavolo creato con successo')
  }

  const handleToggleTable = (tableId: string) => {
    const table = tables?.find(t => t.id === tableId)
    if (!table) return
    
    if (table.isActive) {
      // Deactivate table - just mark as inactive, don't change PIN
      setTables(tables?.map(t => 
        t.id === tableId 
          ? { ...t, isActive: false, status: 'available', customerCount: undefined, remainingOrders: undefined }
          : t
      ) || [])
      toast.success('Tavolo disattivato')
    } else {
      // For activation, we need customer count - this will be handled by the dialog
      setSelectedTable(table)
      // Don't activate immediately, wait for customer count input
    }
  }

  const handleActivateTable = (tableId: string, customerCount: number) => {
    if (!customerCount || customerCount <= 0) {
      toast.error('Inserisci un numero valido di clienti')
      return
    }

    const remainingOrders = currentRestaurant?.allYouCanEat.enabled 
      ? currentRestaurant.allYouCanEat.maxOrders 
      : undefined

    setTables(tables?.map(t => 
      t.id === tableId 
        ? { 
            ...t, 
            isActive: true, 
            pin: generatePin(), 
            status: 'waiting-order',
            customerCount: customerCount,
            remainingOrders: remainingOrders
          }
        : t
    ) || [])
    
    toast.success(`Tavolo attivato per ${customerCount} persone`)
    setSelectedTable(null)
    setCustomerCount('')
  }

  const handleDeleteTable = (tableId: string) => {
    setTables(tables?.filter(table => table.id !== tableId) || [])
    toast.success('Tavolo eliminato')
  }

  const handleCreateMenuItem = () => {
    if (!newMenuItem.name.trim() || !newMenuItem.description.trim() || !newMenuItem.price || !newMenuItem.category) {
      toast.error('Compila tutti i campi')
      return
    }

    const menuItem: MenuItem = {
      id: Date.now().toString(),
      name: newMenuItem.name,
      description: newMenuItem.description,
      price: parseFloat(newMenuItem.price),
      category: newMenuItem.category,
      isActive: true,
      restaurantId: user.restaurantId!,
      image: newMenuItem.image || undefined
    }

    setMenuItems([...(menuItems || []), menuItem])
    setNewMenuItem({
      name: '',
      description: '',
      price: '',
      category: '',
      image: ''
    })
    setShowMenuDialog(false)
    toast.success('Piatto aggiunto al menù')
  }

  const handleToggleMenuItem = (itemId: string) => {
    setMenuItems(menuItems?.map(item => 
      item.id === itemId 
        ? { ...item, isActive: !item.isActive }
        : item
    ) || [])
  }

  const handleDeleteMenuItem = (itemId: string) => {
    setMenuItems(menuItems?.filter(item => item.id !== itemId) || [])
    toast.success('Piatto rimosso')
  }

  const handleToggleAllYouCanEatExclusion = (itemId: string) => {
    setMenuItems(menuItems?.map(item => 
      item.id === itemId 
        ? { ...item, excludeFromAllYouCanEat: !item.excludeFromAllYouCanEat }
        : item
    ) || [])
    
    const item = menuItems?.find(item => item.id === itemId)
    if (item) {
      toast.success(
        item.excludeFromAllYouCanEat 
          ? 'Piatto incluso in All You Can Eat' 
          : 'Piatto escluso da All You Can Eat'
      )
    }
  }

  const handleCompleteOrder = (orderId: string) => {
    const order = restaurantOrders.find(o => o.id === orderId)
    if (order) {
      setOrders(orders?.filter(o => o.id !== orderId) || [])
      setCompletedOrders([...(completedOrders || []), { ...order, status: 'completed' }])
      toast.success('Ordine completato')
    }
  }

  const handleCompleteDish = (orderId: string, itemId: string) => {
    setOrders(orders?.map(order => {
      if (order.id === orderId) {
        const updatedItems = order.items.map(item => {
          if (item.id === itemId) {
            const newCompletedQuantity = (item.completedQuantity || 0) + 1
            return {
              ...item,
              completedQuantity: Math.min(newCompletedQuantity, item.quantity)
            }
          }
          return item
        })
        
        // Check if all items in the order are fully completed
        const allCompleted = updatedItems.every(item => (item.completedQuantity || 0) >= item.quantity)
        
        return {
          ...order,
          items: updatedItems,
          status: allCompleted ? 'completed' as const : order.status
        }
      }
      return order
    }) || [])

    // Move fully completed orders to completed orders list
    const orderToCheck = orders?.find(o => o.id === orderId)
    if (orderToCheck) {
      const updatedOrder = {
        ...orderToCheck,
        items: orderToCheck.items.map(item => {
          if (item.id === itemId) {
            const newCompletedQuantity = (item.completedQuantity || 0) + 1
            return {
              ...item,
              completedQuantity: Math.min(newCompletedQuantity, item.quantity)
            }
          }
          return item
        })
      }
      
      const allCompleted = updatedOrder.items.every(item => (item.completedQuantity || 0) >= item.quantity)
      
      if (allCompleted) {
        setOrders(orders?.filter(o => o.id !== orderId) || [])
        setCompletedOrders([...(completedOrders || []), { ...updatedOrder, status: 'completed' }])
        toast.success('Ordine completato')
      } else {
        toast.success('Piatto pronto')
      }
    }
  }

  const handleUncompleteOrder = (orderId: string) => {
    const order = restaurantCompletedOrders.find(o => o.id === orderId)
    if (order) {
      setCompletedOrders(completedOrders?.filter(o => o.id !== orderId) || [])
      setOrders([...(orders || []), { ...order, status: 'served' }])
      toast.success('Ordine riportato in attesa')
    }
  }

  const handleCreateCategory = () => {
    if (!newCategory.trim()) {
      toast.error('Inserisci un nome per la categoria')
      return
    }
    
    if (categories?.some(cat => cat.name === newCategory)) {
      toast.error('Categoria già esistente')
      return
    }

    const newCategoryObj: MenuCategory = {
      id: Date.now().toString(),
      name: newCategory,
      isActive: true,
      restaurantId: user.restaurantId!,
      order: (restaurantCategories?.length || 0) + 1
    }

    setCategories([...(categories || []), newCategoryObj])
    setNewCategory('')
    toast.success('Categoria aggiunta')
  }

  const handleDeleteCategory = (categoryName: string) => {
    const categoryItems = restaurantMenuItems.filter(item => item.category === categoryName).length
    if (categoryItems > 0) {
      toast.error('Non puoi eliminare una categoria che contiene piatti')
      return
    }
    
    setCategories(categories?.filter(cat => cat.name !== categoryName) || [])
    toast.success('Categoria eliminata')
  }

  const handleToggleCategory = (categoryId: string) => {
    setCategories(categories?.map(cat => 
      cat.id === categoryId 
        ? { ...cat, isActive: !cat.isActive }
        : cat
    ) || [])
  }

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category)
    setEditCategoryName(category.name)
  }

  const handleSaveCategory = () => {
    if (!editingCategory || !editCategoryName.trim()) return
    
    // Check if new name already exists (excluding current category)
    const nameExists = categories?.some(cat => 
      cat.name.toLowerCase() === editCategoryName.trim().toLowerCase() && 
      cat.id !== editingCategory.id
    )
    
    if (nameExists) {
      toast.error('Esiste già una categoria con questo nome')
      return
    }
    
    // Update category name
    setCategories(categories?.map(cat => 
      cat.id === editingCategory.id 
        ? { ...cat, name: editCategoryName.trim() }
        : cat
    ) || [])
    
    // Update menu items with the new category name
    setMenuItems(menuItems?.map(item => 
      item.category === editingCategory.name && item.restaurantId === user.restaurantId
        ? { ...item, category: editCategoryName.trim() }
        : item
    ) || [])
    
    setEditingCategory(null)
    setEditCategoryName('')
    toast.success('Categoria modificata')
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditCategoryName('')
  }

  const handleDragStart = (e: React.DragEvent, category: MenuCategory) => {
    setDraggedCategory(category)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetCategory: MenuCategory) => {
    e.preventDefault()
    
    if (!draggedCategory || draggedCategory.id === targetCategory.id) return
    
    const newCategories = [...(categories || [])]
    const draggedIndex = newCategories.findIndex(cat => cat.id === draggedCategory.id)
    const targetIndex = newCategories.findIndex(cat => cat.id === targetCategory.id)
    
    // Remove dragged item and insert at target position
    const [draggedItem] = newCategories.splice(draggedIndex, 1)
    newCategories.splice(targetIndex, 0, draggedItem)
    
    // Update order values
    const updatedCategories = newCategories.map((cat, index) => ({
      ...cat,
      order: index + 1
    }))
    
    setCategories(updatedCategories)
    setDraggedCategory(null)
    toast.success('Ordine categorie aggiornato')
  }

  const handleDragEnd = () => {
    setDraggedCategory(null)
  }

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours >= 1) {
      return `${hours}h ${minutes % 60}min fa`
    } else if (minutes >= 60) {
      return `1h fa`
    } else if (minutes < 1) {
      return 'Appena ora'
    }
    return `${minutes}min fa`
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Handle sidebar auto-expand on hover
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleMouseEnter = () => {
      timeoutId = setTimeout(() => {
        setSidebarExpanded(true)
      }, 500)
    }

    const handleMouseLeave = () => {
      clearTimeout(timeoutId)
      setSidebarExpanded(false)
    }

    const sidebar = document.getElementById('sidebar')
    if (sidebar) {
      sidebar.addEventListener('mouseenter', handleMouseEnter)
      sidebar.addEventListener('mouseleave', handleMouseLeave)
      
      return () => {
        sidebar.removeEventListener('mouseenter', handleMouseEnter)
        sidebar.removeEventListener('mouseleave', handleMouseLeave)
        clearTimeout(timeoutId)
      }
    }
  }, [])

  // Auto-switch tabs based on activeSection
  useEffect(() => {
    if (activeSection === 'tables') setActiveTab('tables')
    else if (activeSection === 'menu') setActiveTab('menu')
    else if (activeSection === 'reservations') setActiveTab('reservations')
    else if (activeSection === 'analytics') setActiveTab('analytics')
    else if (activeSection === 'settings') setActiveTab('settings')
    else setActiveTab('orders')
  }, [activeSection])

  return (
    <div className="min-h-screen bg-subtle-gradient flex">
      {/* Fixed Sidebar */}
      <div
        id="sidebar"
        className={`${
          sidebarExpanded ? 'w-64' : 'w-16'
        } bg-white shadow-professional-lg transition-all duration-300 ease-in-out border-r border-border/20 flex flex-col fixed h-full z-50`}
      >
        <div className="p-4 border-b border-border/10">
          <h1 className={`font-bold text-primary transition-all duration-300 ${
            sidebarExpanded ? 'text-xl' : 'text-sm text-center'
          }`}>
            {sidebarExpanded ? 'Dashboard Ristorante' : 'DR'}
          </h1>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <Button
            variant={activeSection === 'orders' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${
              activeSection === 'orders' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'
            }`}
            onClick={() => {
              setActiveSection('orders')
              if (sidebarExpanded) setSidebarExpanded(false)
            }}
          >
            <Clock size={16} />
            {sidebarExpanded && <span className="ml-2 transition-all duration-200">Ordini</span>}
          </Button>
          
          <Button
            variant={activeSection === 'tables' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${
              activeSection === 'tables' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'
            }`}
            onClick={() => {
              setActiveSection('tables')
              if (sidebarExpanded) setSidebarExpanded(false)
            }}
          >
            <MapPin size={16} />
            {sidebarExpanded && <span className="ml-2 transition-all duration-200">Tavoli</span>}
          </Button>
          
          <Button
            variant={activeSection === 'menu' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${
              activeSection === 'menu' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'
            }`}
            onClick={() => {
              setActiveSection('menu')
              if (sidebarExpanded) setSidebarExpanded(false)
            }}
          >
            <BookOpen size={16} />
            {sidebarExpanded && <span className="ml-2 transition-all duration-200">Menu</span>}
          </Button>

          <Button
            variant={activeSection === 'reservations' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${
              activeSection === 'reservations' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'
            }`}
            onClick={() => {
              setActiveSection('reservations')
              if (sidebarExpanded) setSidebarExpanded(false)
            }}
          >
            <Calendar size={16} />
            {sidebarExpanded && <span className="ml-2 transition-all duration-200">Prenotazioni</span>}
          </Button>
          
          <Button
            variant={activeSection === 'analytics' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${
              activeSection === 'analytics' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'
            }`}
            onClick={() => {
              setActiveSection('analytics')
              if (sidebarExpanded) setSidebarExpanded(false)
            }}
          >
            <ChartBar size={16} />
            {sidebarExpanded && <span className="ml-2 transition-all duration-200">Analitiche</span>}
          </Button>
          
          <Button
            variant={activeSection === 'settings' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${
              activeSection === 'settings' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'
            }`}
            onClick={() => {
              setActiveSection('settings')
              if (sidebarExpanded) setSidebarExpanded(false)
            }}
          >
            <Gear size={16} />
            {sidebarExpanded && <span className="ml-2 transition-all duration-200">Impostazioni</span>}
          </Button>
        </nav>

        <div className="p-2">
          <Button variant="outline" onClick={onLogout} className={`w-full ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold hover:bg-destructive/5 hover:border-destructive/20 hover:text-destructive`}>
            <SignOut size={16} />
            {sidebarExpanded && <span className="ml-2 transition-all duration-200">Esci</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 p-6 transition-all duration-300 ${
        sidebarExpanded ? 'ml-64' : 'ml-16'
      }`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-gold">
                  <Clock size={20} weight="duotone" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Gestione Ordini</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Gestisci gli ordini in tempo reale</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={orderViewMode} onValueChange={(value: 'table' | 'dish') => setOrderViewMode(value)}>
                  <SelectTrigger className="w-[160px] h-9 shadow-sm hover:shadow-md border hover:border-primary/30 transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span className="text-sm">Per Tavoli</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dish">
                      <div className="flex items-center gap-2">
                        <List size={14} />
                        <span className="text-sm">Per Piatti</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {orderViewMode === 'dish' && (
                  <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                    <SelectTrigger className="w-[180px] h-9 shadow-sm hover:shadow-md border hover:border-primary/30 transition-all duration-200">
                      <SelectValue placeholder="Tutte le categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} />
                          <span className="text-sm">Tutte le categorie</span>
                        </div>
                      </SelectItem>
                      {restaurantCategories
                        .filter(cat => cat.isActive)
                        .sort((a, b) => a.order - b.order)
                        .map(category => (
                          <SelectItem key={category.id} value={category.name}>
                            <span className="text-sm">{category.name}</span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 shadow-sm">
                  <Clock size={16} className="text-primary" weight="duotone" />
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">{restaurantOrders.length}</div>
                    <div className="text-[10px] text-muted-foreground font-medium leading-none">
                      {restaurantOrders.length === 1 ? 'ordine' : 'ordini'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {restaurantOrders.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <Clock size={32} className="text-muted-foreground/40" weight="duotone" />
                </div>
                <p className="text-lg font-semibold text-muted-foreground">Nessun ordine attivo</p>
                <p className="text-xs text-muted-foreground mt-1">Gli ordini appariranno qui non appena arrivano</p>
              </div>
            ) : orderViewMode === 'table' ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {restaurantOrders.map(order => {
                  const table = restaurantTables.find(t => t.id === order.tableId)
                  const totalDishes = order.items.reduce((sum, item) => sum + item.quantity, 0)
                  const completedDishes = order.items.reduce((sum, item) => sum + (item.completedQuantity || 0), 0)
                  const progressPercent = totalDishes > 0 ? (completedDishes / totalDishes) * 100 : 0
                  
                  return (
                    <div 
                      key={order.id} 
                      className="group bg-white rounded-xl shadow-md border border-border/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                    >
                      <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 p-3.5 border-b border-border/10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-base shadow-md group-hover:scale-105 transition-transform duration-200">
                              {table?.name?.match(/\d+/)?.[0] || table?.name?.slice(-1) || '?'}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-foreground">{table?.name || 'Tavolo'}</h3>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock size={10} weight="duotone" />
                                <span className="text-[11px]">{getTimeAgo(order.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-primary">{totalDishes}</div>
                            <div className="text-[9px] text-muted-foreground font-medium">piatti</div>
                          </div>
                        </div>

                        {progressPercent > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground text-[11px]">Progresso</span>
                              <span className="text-green-600 font-bold text-[11px]">{completedDishes}/{totalDishes}</span>
                            </div>
                            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <div className="p-2.5 space-y-1.5 max-h-[380px] overflow-y-auto scrollbar-thin">
                          {order.items.map((item) => {
                            const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                            const completedQuantity = item.completedQuantity || 0
                            const remainingQuantity = item.quantity - completedQuantity
                            const itemProgress = (completedQuantity / item.quantity) * 100
                            
                            return (
                              <div 
                                key={item.id} 
                                className="bg-gradient-to-br from-white to-muted/20 rounded-lg p-2.5 border border-border/40 hover:border-primary/30 transition-all duration-150 shadow-sm"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="relative flex-shrink-0">
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-foreground text-base font-bold border border-primary/30">
                                      {item.quantity}
                                    </div>
                                    {completedQuantity > 0 && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-md">
                                        ✓
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                    <div>
                                      <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-bold text-sm text-foreground leading-tight flex-1">{menuItem?.name || 'Piatto'}</h4>
                                        {completedQuantity > 0 && (
                                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 flex-shrink-0 leading-tight">
                                            {completedQuantity}/{item.quantity}
                                          </span>
                                        )}
                                      </div>
                                      {item.notes && (
                                        <div className="flex items-start gap-1 mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                          <span className="text-amber-600 text-[10px] flex-shrink-0 mt-0.5">💡</span>
                                          <p className="text-[11px] text-amber-800 font-medium italic leading-tight">
                                            {item.notes}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {completedQuantity > 0 && completedQuantity < item.quantity && (
                                      <div className="h-1 bg-green-100 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all duration-500"
                                          style={{ width: `${itemProgress}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  
                                  {remainingQuantity > 0 && (
                                    <Button 
                                      onClick={() => handleCompleteDish(order.id, item.id)}
                                      size="sm"
                                      className="flex-shrink-0 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-sm hover:shadow-md hover:scale-105 transition-all duration-150 font-semibold h-8 px-2.5"
                                    >
                                      <div className="flex items-center gap-1">
                                        <Check size={12} weight="bold" />
                                        <span className="text-[11px]">({remainingQuantity})</span>
                                      </div>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {order.items.length > 4 && (
                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-xl" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(() => {
                  const dishGroups: Record<string, { item: MenuItem, orders: Array<{ orderId: string, tableId: string, tableName: string, quantity: number, completedQuantity: number, notes?: string, itemId: string }> }> = {}
                  
                  restaurantOrders.forEach(order => {
                    order.items.forEach(item => {
                      const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                      if (menuItem) {
                        if (!dishGroups[menuItem.id]) {
                          dishGroups[menuItem.id] = { item: menuItem, orders: [] }
                        }
                        const table = restaurantTables.find(t => t.id === order.tableId)
                        dishGroups[menuItem.id].orders.push({
                          orderId: order.id,
                          tableId: order.tableId,
                          tableName: table?.name || 'Tavolo',
                          quantity: item.quantity,
                          completedQuantity: item.completedQuantity || 0,
                          notes: item.notes,
                          itemId: item.id
                        })
                      }
                    })
                  })

                  const filteredDishGroups = selectedCategoryFilter === 'all' 
                    ? Object.values(dishGroups)
                    : Object.values(dishGroups).filter(({ item }) => item.category === selectedCategoryFilter)

                  const sortedDishGroups = filteredDishGroups.sort((a, b) => {
                    const categoryA = restaurantCategories.find(c => c.name === a.item.category)
                    const categoryB = restaurantCategories.find(c => c.name === b.item.category)
                    const orderA = categoryA?.order ?? 999
                    const orderB = categoryB?.order ?? 999
                    
                    if (orderA !== orderB) {
                      return orderA - orderB
                    }
                    return a.item.name.localeCompare(b.item.name)
                  })

                  if (sortedDishGroups.length === 0) {
                    return (
                      <div className="col-span-full text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                          <BookOpen size={32} className="text-muted-foreground/40" weight="duotone" />
                        </div>
                        <p className="text-lg font-semibold text-muted-foreground">Nessun piatto in questa categoria</p>
                        <p className="text-xs text-muted-foreground mt-1">Seleziona un'altra categoria per vedere i piatti</p>
                      </div>
                    )
                  }

                  return sortedDishGroups.map(({ item, orders }) => {
                    const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0)
                    const totalCompleted = orders.reduce((sum, o) => sum + o.completedQuantity, 0)
                    const progressPercent = totalQuantity > 0 ? (totalCompleted / totalQuantity) * 100 : 0

                    return (
                      <div 
                        key={item.id}
                        className="group bg-white rounded-xl shadow-md border border-border/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                      >
                        <div className="p-3">
                          <div className="flex items-start gap-2.5 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-lg font-bold shadow-md group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                              {totalQuantity}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-foreground leading-tight">{item.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/30 bg-primary/5 text-primary font-medium">
                                  {item.category}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  {orders.length} {orders.length === 1 ? 'tavolo' : 'tavoli'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {progressPercent > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="text-muted-foreground">Progresso totale</span>
                                <span className="text-green-600 font-bold">{totalCompleted}/{totalQuantity} pronti</span>
                              </div>
                              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <div className="p-2.5 space-y-1.5 max-h-[380px] overflow-y-auto scrollbar-thin">
                            {orders.map((orderInfo) => {
                              const remaining = orderInfo.quantity - orderInfo.completedQuantity
                              
                              return (
                                <div 
                                  key={`${orderInfo.orderId}-${orderInfo.itemId}`} 
                                  className="bg-gradient-to-br from-white to-muted/30 rounded-lg p-2.5 border border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div className="relative flex-shrink-0">
                                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-foreground text-base font-bold border border-primary/30">
                                        {orderInfo.quantity}
                                      </div>
                                      {orderInfo.completedQuantity > 0 && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-md">
                                          ✓
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                      <div>
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="font-bold text-sm text-foreground leading-tight flex-1">{orderInfo.tableName}</h4>
                                          {orderInfo.completedQuantity > 0 && (
                                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 flex-shrink-0 leading-tight">
                                              {orderInfo.completedQuantity}/{orderInfo.quantity}
                                            </span>
                                          )}
                                        </div>
                                        {orderInfo.notes && (
                                          <div className="flex items-start gap-1 mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                            <span className="text-amber-600 text-[10px] flex-shrink-0 mt-0.5">💡</span>
                                            <p className="text-[11px] text-amber-800 font-medium italic leading-tight">
                                              {orderInfo.notes}
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {orderInfo.completedQuantity > 0 && orderInfo.completedQuantity < orderInfo.quantity && (
                                        <div className="h-1 bg-green-100 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all duration-500"
                                            style={{ width: `${(orderInfo.completedQuantity / orderInfo.quantity) * 100}%` }}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {remaining > 0 && (
                                      <Button
                                        onClick={() => handleCompleteDish(orderInfo.orderId, orderInfo.itemId)}
                                        size="sm"
                                        className="flex-shrink-0 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-sm hover:shadow-md hover:scale-105 transition-all duration-150 font-semibold h-8 px-2.5"
                                      >
                                        <div className="flex items-center gap-1">
                                          <Check size={12} weight="bold" />
                                          <span className="text-[11px]">({remaining})</span>
                                        </div>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {orders.length > 4 && (
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-xl" />
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
            {restaurantCompletedOrders.length > 0 && (
              <>
                <Separator className="my-6 opacity-20" />
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center text-white shadow-sm">
                      <Check size={16} weight="bold" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Ordini Completati</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs shadow-sm px-3 py-1 bg-green-50 border-green-200 text-green-700">
                    {restaurantCompletedOrders.length}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {restaurantCompletedOrders.map(order => {
                    const table = restaurantTables.find(t => t.id === order.tableId)
                    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
                    
                    return (
                      <div 
                        key={order.id} 
                        className="group bg-gradient-to-br from-green-50 via-emerald-50/50 to-green-50 rounded-lg p-3 shadow-sm border border-green-200/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
                      >
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform duration-150">
                            ✓
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate">{table?.name || 'Tavolo'}</h4>
                            <p className="text-xs text-green-700 font-medium">{totalItems} {totalItems === 1 ? 'piatto' : 'piatti'}</p>
                          </div>
                        </div>
                        
                        <div className="bg-white/70 rounded-md px-2.5 py-2 mb-2.5 space-y-0.5 max-h-20 overflow-y-auto">
                          {order.items.map((item, index) => {
                            const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                            return (
                              <div key={index} className="text-xs text-foreground/70 flex items-center gap-1">
                                <span className="font-bold text-green-600 w-4 flex-shrink-0 text-[11px]">{item.quantity}×</span>
                                <span className="truncate text-[11px]">{menuItem?.name || 'Piatto'}</span>
                              </div>
                            )
                          })}
                        </div>
                        
                        <Button 
                          variant="outline"
                          onClick={() => handleUncompleteOrder(order.id)}
                          size="sm"
                          className="w-full text-xs border-green-300 hover:bg-green-100 hover:border-green-400 h-7"
                        >
                          <X size={12} className="mr-1" />
                          Riporta in Attesa
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Order History Section */}
            {restaurantOrderHistory.length > 0 && (
              <>
                <Separator className="my-6 opacity-20" />
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center text-foreground shadow-sm">
                      <ClockCounterClockwise size={16} weight="duotone" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Storico Ordini</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs shadow-sm px-3 py-1">
                    {restaurantOrderHistory.length} totali
                  </Badge>
                </div>
                
                <div className="bg-white rounded-xl shadow-md border border-border/20 overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto">
                    <div className="divide-y divide-border/10">
                      {restaurantOrderHistory
                        .sort((a, b) => b.paidAt - a.paidAt)
                        .slice(0, 20)
                        .map((order, index) => {
                          const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
                          
                          return (
                            <div 
                              key={order.id} 
                              className="group flex items-center gap-3 p-3 hover:bg-primary/5 transition-colors duration-150 cursor-pointer"
                              onClick={() => setSelectedOrderHistory(order)}
                            >
                              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-foreground font-bold text-base shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-150 flex-shrink-0">
                                {order.tableName.match(/\d+/)?.[0] || order.tableName.slice(-1)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <h4 className="font-semibold text-sm text-foreground">{order.tableName}</h4>
                                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                                    {totalItems}
                                  </span>
                                  {order.customerCount && (
                                    <span className="text-[11px] text-muted-foreground">
                                      • {order.customerCount} {order.customerCount === 1 ? 'persona' : 'persone'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                                  <Calendar size={10} />
                                  <span>{new Date(order.paidAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  <span>•</span>
                                  <Clock size={10} />
                                  <span>{formatTime(order.timestamp)}</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {order.items.slice(0, 3).map((item, idx) => (
                                    <span 
                                      key={idx} 
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/40 text-[11px] text-foreground/70"
                                    >
                                      <span className="font-bold text-primary">{item.quantity}×</span>
                                      <span className="truncate max-w-[100px]">{item.name}</span>
                                    </span>
                                  ))}
                                  {order.items.length > 3 && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[11px] text-muted-foreground font-medium">
                                      +{order.items.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <div className="text-lg font-bold text-primary">€{order.total.toFixed(2)}</div>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 text-green-700 font-semibold px-2.5 py-0.5 text-[11px]"
                                >
                                  Pagato
                                </Badge>
                              </div>
                            </div>
                          )
                        })
                      }
                    </div>
                  </div>
                  
                  {restaurantOrderHistory.length > 20 && (
                    <div className="p-3 bg-muted/10 border-t border-border/10 text-center">
                      <p className="text-xs text-muted-foreground">
                        Mostrati i primi 20 ordini • Totale: {restaurantOrderHistory.length}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Gestione Tavoli</h2>
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
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {restaurantTables.map(table => (
                <Card key={table.id} className={`shadow-professional hover:shadow-professional-lg transition-all duration-300 ${!table.isActive ? 'opacity-75 bg-gray-50 border-2 border-dashed border-gray-300' : 'bg-white'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className={`text-lg flex items-center gap-2 ${!table.isActive ? 'font-bold' : ''}`}>
                        <div className={`w-8 h-8 rounded border-2 flex items-center justify-center text-xs font-bold ${
                          table.isActive ? 'bg-green-100 border-green-400 text-green-700' : 'bg-gray-200 border-gray-500 text-gray-700'
                        }`}>
                          {table.name.slice(-1)}
                        </div>
                        <span className={!table.isActive ? 'text-gray-900 font-semibold' : ''}>{table.name}</span>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleTable(table.id)}
                        className="h-6 w-6 p-0"
                        title={table.isActive ? 'Disattiva tavolo' : 'Attiva tavolo'}
                      >
                        {table.isActive ? <EyeSlash size={12} /> : <Eye size={12} />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {table.isActive ? (
                      <>
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                          <div className="text-xs text-muted-foreground mb-1">PIN Temporaneo</div>
                          <div className="text-2xl font-bold text-primary tracking-wider">{table.pin}</div>
                        </div>
                        {table.customerCount && (
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Clienti</div>
                            <div className="text-lg font-semibold">{table.customerCount}</div>
                            {currentRestaurant?.allYouCanEat.enabled && table.remainingOrders !== undefined && (
                              <div className="text-xs text-accent">
                                {table.remainingOrders} ordini rimasti
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTable(table)
                              setShowQrDialog(true)
                            }}
                            className="text-xs flex-1"
                          >
                            QR Code
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTable(table)
                              setShowTableDialog(true)
                            }}
                            className="text-xs flex-1"
                          >
                            Conto
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 w-8 p-0"
                            title="Modifica tavolo"
                          >
                            <PencilSimple size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTable(table.id)}
                            className="text-xs text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            title="Elimina tavolo"
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 text-center">
                          <div className="text-base font-medium text-gray-700">Tavolo Vuoto</div>
                          <div className="text-sm text-gray-600 mt-1">Clicca "Attiva" per iniziare</div>
                        </div>
                        <Button
                          onClick={() => handleToggleTable(table.id)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg"
                          size="sm"
                        >
                          Attiva Tavolo
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 w-8 p-0"
                            title="Modifica tavolo"
                          >
                            <PencilSimple size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTable(table.id)}
                            className="text-xs text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            title="Elimina tavolo"
                          >
                            <Trash size={14} />
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Gestione Menu</h2>
              <div className="flex gap-2">
                <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <List size={16} className="mr-2" />
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
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {restaurantCategories?.sort((a, b) => a.order - b.order).map((category) => {
                          const categoryItemsCount = restaurantMenuItems.filter(item => item.category === category.name).length
                          const isDragging = draggedCategory?.id === category.id
                          
                          return (
                            <div 
                              key={category.id} 
                              className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg border-2 cursor-move transition-all duration-200 ${
                                isDragging ? 'border-primary bg-primary/10 scale-105 shadow-lg' : 'border-transparent hover:border-primary/20 hover:bg-muted/70'
                              }`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, category)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, category)}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-muted-foreground cursor-move">⋮⋮</div>
                                <div>
                                  {editingCategory?.id === category.id ? (
                                    <div className="flex gap-2">
                                      <Input
                                        value={editCategoryName}
                                        onChange={(e) => setEditCategoryName(e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="Nome categoria"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveCategory()
                                          if (e.key === 'Escape') handleCancelEdit()
                                        }}
                                        autoFocus
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSaveCategory}
                                        className="h-8 w-8 p-0 text-green-600 hover:bg-green-600/10"
                                      >
                                        <Check size={14} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-600/10"
                                      >
                                        <X size={14} />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="font-medium">{category.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {categoryItemsCount} piatt{categoryItemsCount === 1 ? 'o' : 'i'}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {editingCategory?.id !== category.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCategory(category)}
                                    className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                                    title="Modifica categoria"
                                  >
                                    <PencilSimple size={16} />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleCategory(category.id)}
                                  className="h-8 w-8 p-0"
                                  title={category.isActive ? 'Disattiva categoria' : 'Attiva categoria'}
                                >
                                  {category.isActive ? <Eye size={16} /> : <EyeSlash size={16} />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(category.name)}
                                  disabled={categoryItemsCount > 0}
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash size={16} />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus size={16} className="mr-2" />
                      Nuovo Piatto
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aggiungi Nuovo Piatto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="dishName">Nome Piatto</Label>
                        <Input
                          id="dishName"
                          value={newMenuItem.name}
                          onChange={(e) => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Es: Spaghetti alla Carbonara"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dishDescription">Descrizione</Label>
                        <Textarea
                          id="dishDescription"
                          value={newMenuItem.description}
                          onChange={(e) => setNewMenuItem(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descrizione del piatto..."
                        />
                      </div>
                      <div>
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
                      <div>
                        <Label htmlFor="dishCategory">Categoria</Label>
                        <Select
                          value={newMenuItem.category}
                          onValueChange={(value) => setNewMenuItem(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {restaurantCategories?.filter(cat => cat.isActive).map((category) => (
                              <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="dishImage">URL Immagine (opzionale)</Label>
                        <Input
                          id="dishImage"
                          value={newMenuItem.image}
                          onChange={(e) => setNewMenuItem(prev => ({ ...prev, image: e.target.value }))}
                          placeholder="https://esempio.com/immagine.jpg"
                        />
                        {newMenuItem.image && (
                          <div className="mt-2">
                            <img 
                              src={newMenuItem.image} 
                              alt="Anteprima" 
                              className="w-full h-32 object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </div>
                        )}
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
              {restaurantCategories?.filter(cat => cat.isActive).sort((a, b) => a.order - b.order).map((category) => {
                const categoryItems = restaurantMenuItems.filter(item => item.category === category.name)
                
                if (categoryItems.length === 0) return null
                
                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-primary">{category.name}</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                          className="h-8 w-8 p-0"
                          title="Modifica nome categoria"
                        >
                          <PencilSimple size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleCategory(category.id)}
                          className="h-8 w-8 p-0"
                          title={category.isActive ? 'Disattiva categoria' : 'Attiva categoria'}
                        >
                          {category.isActive ? <Eye size={16} /> : <EyeSlash size={16} />}
                        </Button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryItems.map((item) => (
                        <Card key={item.id} className={`shadow-professional hover:shadow-professional-lg transition-all duration-300 ${!item.isActive ? 'opacity-50' : ''}`}>
                          {item.image && (
                            <div className="relative">
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-48 object-cover rounded-t-lg"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                              {!item.isActive && (
                                <div className="absolute inset-0 bg-black/50 rounded-t-lg flex items-center justify-center">
                                  <Badge variant="secondary">Non Disponibile</Badge>
                                </div>
                              )}
                            </div>
                          )}
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{item.name}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              </div>
                              <div className="text-right ml-4">
                                <div className="font-bold text-primary text-lg">€{item.price.toFixed(2)}</div>
                                {!item.image && (
                                  <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                                    {item.isActive ? "Disponibile" : "Non Disponibile"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleMenuItem(item.id)}
                                className="h-8 w-8 p-0"
                                title={item.isActive ? 'Disattiva piatto' : 'Attiva piatto'}
                              >
                                {item.isActive ? <Eye size={14} /> : <EyeSlash size={14} />}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <PencilSimple size={14} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteMenuItem(item.id)}
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <Trash size={14} />
                              </Button>
                              {currentRestaurant?.allYouCanEat.enabled && (
                                <Button
                                  variant={item.excludeFromAllYouCanEat ? "destructive" : "outline"}
                                  size="sm"
                                  onClick={() => handleToggleAllYouCanEatExclusion(item.id)}
                                  className="h-8 text-xs px-2"
                                  title={item.excludeFromAllYouCanEat ? 'Includi in All You Can Eat' : 'Escludi da All You Can Eat'}
                                >
                                  {item.excludeFromAllYouCanEat ? 'Escluso' : 'Incluso'}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-4">
            <ReservationsManager
              user={user}
              tables={tables || []}
              reservations={reservations || []}
              setReservations={setReservations}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsCharts
              orders={restaurantOrders}
              completedOrders={restaurantCompletedOrders}
              orderHistory={restaurantOrderHistory}
              menuItems={restaurantMenuItems}
              categories={restaurantCategories}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Impostazioni</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Restaurant Info */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle>Informazioni Ristorante</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="restaurantName">Nome Ristorante</Label>
                    <Input
                      id="restaurantName"
                      value={currentRestaurant?.name || ''}
                      onChange={(e) => {
                        if (currentRestaurant) {
                          setRestaurants(restaurants?.map(r => 
                            r.id === currentRestaurant.id 
                              ? { ...r, name: e.target.value }
                              : r
                          ) || [])
                        }
                      }}
                      placeholder="Nome del ristorante"
                    />
                  </div>
                  <div>
                    <Label htmlFor="restaurantContact">Contatto</Label>
                    <Input
                      id="restaurantContact"
                      value={currentRestaurant?.contact || ''}
                      onChange={(e) => {
                        if (currentRestaurant) {
                          setRestaurants(restaurants?.map(r => 
                            r.id === currentRestaurant.id 
                              ? { ...r, contact: e.target.value }
                              : r
                          ) || [])
                        }
                      }}
                      placeholder="email@ristorante.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="restaurantHours">Orari</Label>
                    <Input
                      id="restaurantHours"
                      value={currentRestaurant?.hours || ''}
                      onChange={(e) => {
                        if (currentRestaurant) {
                          setRestaurants(restaurants?.map(r => 
                            r.id === currentRestaurant.id 
                              ? { ...r, hours: e.target.value }
                              : r
                          ) || [])
                        }
                      }}
                      placeholder="12:00-23:00"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Cover Charge Settings */}
              <Card className="shadow-professional">
                <CardHeader>
                  <CardTitle>Coperto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="coverCharge">Costo Coperto per Persona (€)</Label>
                    <Input
                      id="coverCharge"
                      type="number"
                      step="0.50"
                      min="0"
                      value={currentRestaurant?.coverChargePerPerson || 0}
                      onChange={(e) => {
                        if (currentRestaurant) {
                          setRestaurants(restaurants?.map(r => 
                            r.id === currentRestaurant.id 
                              ? { ...r, coverChargePerPerson: parseFloat(e.target.value) || 0 }
                              : r
                          ) || [])
                        }
                      }}
                      placeholder="2.00"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Il coperto verrà automaticamente aggiunto al conto di ogni tavolo in base al numero di persone.
                  </p>
                </CardContent>
              </Card>

              {/* All You Can Eat Settings */}
              <Card className="shadow-professional md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    All You Can Eat
                    <Badge variant={currentRestaurant?.allYouCanEat.enabled ? "default" : "secondary"}>
                      {currentRestaurant?.allYouCanEat.enabled ? "Attivo" : "Disattivo"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableAllYouCanEat"
                      checked={currentRestaurant?.allYouCanEat.enabled || false}
                      onChange={(e) => {
                        if (currentRestaurant) {
                          setRestaurants(restaurants?.map(r => 
                            r.id === currentRestaurant.id 
                              ? { 
                                  ...r, 
                                  allYouCanEat: { 
                                    ...r.allYouCanEat, 
                                    enabled: e.target.checked 
                                  } 
                                }
                              : r
                          ) || [])
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor="enableAllYouCanEat">Abilita modalità All You Can Eat</Label>
                  </div>

                  {currentRestaurant?.allYouCanEat.enabled && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="allYouCanEatPrice">Prezzo per Persona (€)</Label>
                        <Input
                          id="allYouCanEatPrice"
                          type="number"
                          step="1.00"
                          value={currentRestaurant?.allYouCanEat.pricePerPerson || 0}
                          onChange={(e) => {
                            if (currentRestaurant) {
                              setRestaurants(restaurants?.map(r => 
                                r.id === currentRestaurant.id 
                                  ? { 
                                      ...r, 
                                      allYouCanEat: { 
                                        ...r.allYouCanEat, 
                                        pricePerPerson: parseFloat(e.target.value) || 0
                                      } 
                                    }
                                  : r
                              ) || [])
                            }
                          }}
                          placeholder="25.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxOrders">Numero Massimo Ordini per Tavolo</Label>
                        <Input
                          id="maxOrders"
                          type="number"
                          min="1"
                          max="10"
                          value={currentRestaurant?.allYouCanEat.maxOrders || 3}
                          onChange={(e) => {
                            if (currentRestaurant) {
                              setRestaurants(restaurants?.map(r => 
                                r.id === currentRestaurant.id 
                                  ? { 
                                      ...r, 
                                      allYouCanEat: { 
                                        ...r.allYouCanEat, 
                                        maxOrders: parseInt(e.target.value) || 3 
                                      } 
                                    }
                                  : r
                              ) || [])
                            }
                          }}
                          placeholder="3"
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    Con All You Can Eat attivo, i clienti pagano un prezzo fisso e possono ordinare liberamente 
                    entro il limite di ordini impostato. I piatti esclusi verranno addebitati separatamente.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-gold">
                  <ClockCounterClockwise size={20} weight="duotone" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Storico Ordini</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Visualizza gli ordini passati</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="w-[180px] h-9 shadow-sm hover:shadow-md border hover:border-primary/30 transition-all duration-200"
                  placeholder="Filtra per data"
                />
                {historyDateFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHistoryDateFilter('')}
                    className="h-9 px-3"
                  >
                    <X size={16} />
                  </Button>
                )}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 shadow-sm">
                  <ClockCounterClockwise size={16} className="text-primary" weight="duotone" />
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">
                      {historyDateFilter 
                        ? restaurantOrderHistory.filter(h => {
                            const orderDate = new Date(h.paidAt).toISOString().split('T')[0]
                            return orderDate === historyDateFilter
                          }).length
                        : restaurantOrderHistory.length
                      }
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium leading-none">
                      {(historyDateFilter 
                        ? restaurantOrderHistory.filter(h => {
                            const orderDate = new Date(h.paidAt).toISOString().split('T')[0]
                            return orderDate === historyDateFilter
                          }).length
                        : restaurantOrderHistory.length
                      ) === 1 ? 'ordine' : 'ordini'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {restaurantOrderHistory.length === 0 ? (
              <Card>
                <CardContent className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                    <ClockCounterClockwise size={32} className="text-muted-foreground/40" weight="duotone" />
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">Nessun ordine nello storico</p>
                  <p className="text-xs text-muted-foreground mt-1">Gli ordini pagati appariranno qui</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {restaurantOrderHistory
                  .filter(history => {
                    if (!historyDateFilter) return true
                    const orderDate = new Date(history.paidAt).toISOString().split('T')[0]
                    return orderDate === historyDateFilter
                  })
                  .sort((a, b) => b.paidAt - a.paidAt)
                  .map(history => {
                    const totalItems = history.items.reduce((sum, item) => sum + item.quantity, 0)
                    
                    return (
                      <Card 
                        key={history.id}
                        className="group bg-white rounded-xl shadow-md border border-border/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer"
                        onClick={() => setSelectedOrderHistory(history)}
                      >
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 border-b border-green-200/30">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform duration-200">
                                {history.tableName.match(/\d+/)?.[0] || history.tableName.slice(-1) || '?'}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-foreground">{history.tableName}</h3>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock size={11} weight="duotone" />
                                  <span>
                                    {new Date(history.paidAt).toLocaleDateString('it-IT', { 
                                      day: '2-digit', 
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-700">€{history.total.toFixed(2)}</div>
                              <div className="text-[10px] text-muted-foreground font-medium">{totalItems} piatti</div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 space-y-2 max-h-[280px] overflow-y-auto">
                          {history.items.slice(0, 5).map((item, idx) => (
                            <div 
                              key={idx}
                              className="bg-gradient-to-br from-white to-muted/20 rounded-lg p-2.5 border border-border/30"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-foreground font-bold text-sm border border-primary/30 flex-shrink-0">
                                    {item.quantity}
                                  </div>
                                  <span className="font-semibold text-sm text-foreground truncate">{item.name}</span>
                                </div>
                                <span className="text-sm font-bold text-primary flex-shrink-0">€{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                          {history.items.length > 5 && (
                            <div className="text-center text-xs text-muted-foreground pt-1">
                              +{history.items.length - 5} altri piatti
                            </div>
                          )}
                        </div>

                        {(history.customerName || history.customerCount) && (
                          <div className="px-3.5 pb-3.5">
                            <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                              <div className="flex items-center gap-2 text-xs">
                                {history.customerName && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">👤</span>
                                    <span className="font-semibold">{history.customerName}</span>
                                  </div>
                                )}
                                {history.customerCount && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">•</span>
                                    <span className="font-semibold">{history.customerCount} persone</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })}
              </div>
            )}
            
            {historyDateFilter && restaurantOrderHistory.filter(h => {
              const orderDate = new Date(h.paidAt).toISOString().split('T')[0]
              return orderDate === historyDateFilter
            }).length === 0 && restaurantOrderHistory.length > 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar size={40} className="mx-auto text-muted-foreground/40 mb-3" weight="duotone" />
                  <p className="text-base font-semibold text-muted-foreground">Nessun ordine in questa data</p>
                  <p className="text-xs text-muted-foreground mt-1">Prova a selezionare un'altra data</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code - {selectedTable?.name}</DialogTitle>
            <DialogDescription>
              Scansiona questo codice per accedere al menu del tavolo
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="mx-auto w-64 h-64 bg-white border-2 border-primary rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <QrCode size={120} className="mx-auto mb-4 text-primary" />
                <p className="text-xs font-mono text-muted-foreground break-all px-4">
                  {selectedTable?.qrCode}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                URL per test: <button 
                  onClick={() => {
                    if (selectedTable?.qrCode) {
                      navigator.clipboard.writeText(selectedTable.qrCode)
                      toast.success('Link copiato!')
                    }
                  }}
                  className="font-mono text-primary hover:underline cursor-pointer"
                >
                  {selectedTable?.qrCode}
                </button>
              </p>
              <p className="text-sm text-muted-foreground">
                PIN attuale: <strong className="text-2xl font-bold text-primary">{selectedTable?.pin}</strong>
              </p>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => {
                    if (selectedTable?.qrCode) {
                      window.open(selectedTable.qrCode, '_blank')
                    }
                  }}
                  className="flex-1"
                >
                  Testa QR Code
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    if (selectedTable?.qrCode) {
                      navigator.clipboard.writeText(selectedTable.qrCode)
                      toast.success('Link copiato negli appunti!')
                    }
                  }}
                  className="flex-1"
                >
                  Copia Link
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Count Dialog for Table Activation */}
      <Dialog open={!!selectedTable && !selectedTable.isActive} onOpenChange={(open) => {
        if (!open) {
          setSelectedTable(null)
          setCustomerCount('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attiva {selectedTable?.name}</DialogTitle>
            <DialogDescription>
              Inserisci il numero di clienti per questo tavolo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerCount">Numero di Clienti</Label>
              <Input
                id="customerCount"
                type="number"
                min="1"
                max="20"
                value={customerCount}
                onChange={(e) => setCustomerCount(e.target.value)}
                placeholder="es. 4"
                className="text-lg text-center"
              />
            </div>
            
            {currentRestaurant?.coverChargePerPerson && currentRestaurant.coverChargePerPerson > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Coperto: €{currentRestaurant.coverChargePerPerson.toFixed(2)} × {customerCount || 0} = 
                  <span className="font-semibold ml-1">
                    €{((currentRestaurant.coverChargePerPerson || 0) * (parseInt(customerCount) || 0)).toFixed(2)}
                  </span>
                </p>
              </div>
            )}
            
            {currentRestaurant?.allYouCanEat.enabled && (
              <div className="bg-primary/10 p-3 rounded-lg">
                <p className="text-sm font-medium text-primary mb-1">All You Can Eat Attivo</p>
                <p className="text-sm text-muted-foreground">
                  €{currentRestaurant.allYouCanEat.pricePerPerson.toFixed(2)} × {customerCount || 0} = 
                  <span className="font-semibold ml-1">
                    €{((currentRestaurant.allYouCanEat.pricePerPerson || 0) * (parseInt(customerCount) || 0)).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Massimo {currentRestaurant.allYouCanEat.maxOrders} ordini per tavolo
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setSelectedTable(null)
                  setCustomerCount('')
                }}
              >
                Annulla
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (selectedTable) {
                    handleActivateTable(selectedTable.id, parseInt(customerCount))
                  }
                }}
                disabled={!customerCount || parseInt(customerCount) <= 0}
              >
                Attiva Tavolo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Bill Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conto - {selectedTable?.name}</DialogTitle>
            <DialogDescription>
              Riepilogo ordini per questo tavolo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const tableOrders = [...restaurantOrders, ...restaurantCompletedOrders].filter(order => order.tableId === selectedTable?.id)
              const totalAmount = tableOrders.reduce((sum, order) => sum + order.total, 0)
              
              if (tableOrders.length === 0) {
                return (
                  <p className="text-center text-muted-foreground py-8">
                    Nessun ordine per questo tavolo
                  </p>
                )
              }
              
              return (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tableOrders.map((order) => (
                      <Card key={order.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">Ordine #{order.id.slice(-6)}</h4>
                            <Badge variant="outline">{formatTime(order.timestamp)}</Badge>
                          </div>
                          <div className="space-y-1">
                            {order.items.map((item, index) => {
                              const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                              return (
                                <div key={index} className="flex justify-between text-sm">
                                  <span>{item.quantity}x {menuItem?.name || 'Unknown'}</span>
                                  <span>€{((menuItem?.price || 0) * item.quantity).toFixed(2)}</span>
                                </div>
                              )
                            })}
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-medium">
                            <span>Subtotale:</span>
                            <span>€{order.total.toFixed(2)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div className="text-xl font-bold">
                      Totale: €{totalAmount.toFixed(2)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setOrders(orders?.filter(o => o.tableId !== selectedTable?.id) || [])
                          setCompletedOrders(completedOrders?.filter(o => o.tableId !== selectedTable?.id) || [])
                          toast.success('Ordini eliminati')
                          setShowTableDialog(false)
                        }}
                      >
                        Elimina Ordini
                      </Button>
                      <Button
                        onClick={() => {
                          const tableInfo = selectedTable
                          const tableCustomerCount = tableInfo?.customerCount
                          
                          const orderHistoryEntries = tableOrders.map(order => ({
                            id: order.id,
                            tableId: order.tableId,
                            tableName: selectedTable?.name || 'Unknown',
                            restaurantId: order.restaurantId,
                            items: order.items.map(item => {
                              const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
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
                            customerCount: tableCustomerCount,
                            customerName: undefined,
                            customerPhone: undefined,
                            reservationId: tableInfo?.reservationId
                          }))
                          
                          setOrderHistory([...(orderHistory || []), ...orderHistoryEntries])
                          setOrders(orders?.filter(o => o.tableId !== selectedTable?.id) || [])
                          setCompletedOrders(completedOrders?.filter(o => o.tableId !== selectedTable?.id) || [])
                          
                          setTables(tables?.map(t => 
                            t.id === selectedTable?.id 
                              ? { ...t, pin: generatePin() }
                              : t
                          ) || [])
                          
                          toast.success('Conto segnato come pagato')
                          setShowTableDialog(false)
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Segna come Pagato
                      </Button>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order History Details Dialog */}
      <Dialog open={!!selectedOrderHistory} onOpenChange={(open) => !open && setSelectedOrderHistory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-md">
                {selectedOrderHistory?.tableName.match(/\d+/)?.[0] || selectedOrderHistory?.tableName.slice(-1)}
              </div>
              <div>
                <div className="text-xl font-bold">{selectedOrderHistory?.tableName}</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {selectedOrderHistory && new Date(selectedOrderHistory.paidAt).toLocaleDateString('it-IT', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Customer Info */}
            {(selectedOrderHistory?.customerName || selectedOrderHistory?.customerCount) && (
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/20">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Informazioni Cliente</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedOrderHistory?.customerName && (
                    <div>
                      <div className="text-xs text-muted-foreground">Nome</div>
                      <div className="font-semibold">{selectedOrderHistory.customerName}</div>
                    </div>
                  )}
                  {selectedOrderHistory?.customerPhone && (
                    <div>
                      <div className="text-xs text-muted-foreground">Telefono</div>
                      <div className="font-semibold">{selectedOrderHistory.customerPhone}</div>
                    </div>
                  )}
                  {selectedOrderHistory?.customerCount && (
                    <div>
                      <div className="text-xs text-muted-foreground">Numero Persone</div>
                      <div className="font-semibold">{selectedOrderHistory.customerCount}</div>
                    </div>
                  )}
                  {selectedOrderHistory?.reservationId && (
                    <div>
                      <div className="text-xs text-muted-foreground">Prenotazione</div>
                      <div className="font-semibold">#{selectedOrderHistory.reservationId.slice(-6)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dettaglio Ordine</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedOrderHistory?.items.map((item, index) => (
                  <div 
                    key={index}
                    className="bg-white rounded-lg p-3 border border-border/30 hover:border-primary/20 transition-all duration-150"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-foreground font-bold text-base border-2 border-primary/30 flex-shrink-0">
                          {item.quantity}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base text-foreground mb-0.5">{item.name}</h4>
                          {item.notes && (
                            <div className="flex items-start gap-1.5 mt-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                              <span className="text-amber-600 text-xs flex-shrink-0 mt-0.5">💡</span>
                              <p className="text-xs text-amber-800 font-medium italic leading-tight">
                                {item.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm text-muted-foreground">€{item.price.toFixed(2)} cad.</div>
                        <div className="text-base font-bold text-primary">€{(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <Separator />
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-700 font-medium">Totale Pagato</div>
                  <div className="text-xs text-green-600 mt-0.5">
                    {selectedOrderHistory?.items.reduce((sum, item) => sum + item.quantity, 0)} piatti totali
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-700">
                  €{selectedOrderHistory?.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RestaurantDashboard
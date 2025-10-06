import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, MapPin, BookOpen, Clock, ChartBar, Gear, SignOut, Trash, Eye, EyeSlash, QrCode, PencilSimple, Calendar, List, ClockCounterClockwise, Check, X, CaretDown } from '@phosphor-icons/react'
import type { User, Table, MenuItem, Order, Restaurant, Reservation, OrderHistory, MenuCategory } from '../App'
import TimelineReservations from './TimelineReservations'
import ReservationsManager from './ReservationsManager'
import AnalyticsCharts from './AnalyticsCharts'
import QRCodeLib from 'qrcode'

interface RestaurantDashboardProps {
  user: User
  onLogout: () => void
}

const RestaurantDashboard = ({ user, onLogout }: RestaurantDashboardProps) => {
  const [activeSection, setActiveSection] = useState('orders')
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
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
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showMenuDialog, setShowMenuDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [orderViewMode, setOrderViewMode] = useState<'table' | 'dish'>('table')
  
  const restaurantTables = tables?.filter(t => t.restaurantId === user.restaurantId) || []
  const restaurantMenuItems = menuItems?.filter(m => m.restaurantId === user.restaurantId) || []
  const restaurantOrders = orders?.filter(o => o.restaurantId === user.restaurantId) || []
  const restaurantCategories = categories?.filter(c => c.restaurantId === user.restaurantId)?.sort((a, b) => a.order - b.order) || []
  const currentRestaurant = restaurants?.find(r => r.id === user.restaurantId)

  const generateQrCode = (tableId: string) => {
    return `${window.location.origin}?table=${tableId}`
  }

  const generatePin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const handleCreateTable = async () => {
    if (!newTableName.trim()) {
      toast.error('Inserisci il nome del tavolo')
      return
    }

    const tableId = `table-${Date.now()}`
    const newTable: Table = {
      id: tableId,
      name: newTableName.trim(),
      isActive: false,
      pin: generatePin(),
      qrCode: generateQrCode(tableId),
      restaurantId: user.restaurantId!,
      status: 'available'
    }

    setTables(prev => [...(prev || []), newTable])
    setNewTableName('') // Reset the input field
    setShowTableDialog(false)
    toast.success('Tavolo creato con successo')
  }

  const handleToggleTable = async (tableId: string) => {
    const table = tables?.find(t => t.id === tableId)
    if (!table) return

    if (!table.isActive) {
      // Activating table - generate QR and PIN
      await generateQRCode(table.qrCode)
      setSelectedTable(table)
    }

    setTables(prev => prev?.map(t => 
      t.id === tableId ? { ...t, isActive: !t.isActive } : t
    ) || [])

    toast.success(table.isActive ? 'Tavolo disattivato' : 'Tavolo attivato')
  }

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Inserisci il nome della categoria')
      return
    }

    const categoryId = `category-${Date.now()}`
    const maxOrder = Math.max(...(restaurantCategories.map(c => c.order) || [0]))
    
    const category: MenuCategory = {
      id: categoryId,
      name: newCategory,
      isActive: true,
      restaurantId: user.restaurantId!,
      order: maxOrder + 1
    }

    setCategories(prev => [...(prev || []), category])
    setNewCategory('')
    toast.success('Categoria creata con successo')
  }

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category)
    setEditCategoryName(category.name)
  }

  const handleSaveEditCategory = () => {
    if (!editCategoryName.trim() || !editingCategory) {
      toast.error('Inserisci il nome della categoria')
      return
    }

    setCategories(prev => prev?.map(c => 
      c.id === editingCategory.id ? { ...c, name: editCategoryName.trim() } : c
    ) || [])
    
    setEditingCategory(null)
    setEditCategoryName('')
    toast.success('Categoria modificata con successo')
  }

  const handleDeleteCategory = (categoryId: string) => {
    // Check if category has items
    const hasItems = restaurantMenuItems.some(item => {
      const category = restaurantCategories.find(c => c.id === categoryId)
      return category && item.category === category.name
    })

    if (hasItems) {
      toast.error('Non puoi eliminare una categoria che contiene piatti')
      return
    }

    setCategories(prev => prev?.filter(c => c.id !== categoryId) || [])
    toast.success('Categoria eliminata con successo')
  }

  const handleToggleCategoryVisibility = (categoryId: string) => {
    setCategories(prev => prev?.map(c => 
      c.id === categoryId ? { ...c, isActive: !c.isActive } : c
    ) || [])
  }

  const handleCreateMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.category || !newMenuItem.price) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    const itemId = `item-${Date.now()}`
    const item: MenuItem = {
      id: itemId,
      name: newMenuItem.name,
      description: newMenuItem.description,
      price: parseFloat(newMenuItem.price),
      category: newMenuItem.category,
      isActive: true,
      restaurantId: user.restaurantId!,
      image: newMenuItem.image || undefined
    }

    setMenuItems(prev => [...(prev || []), item])
    setNewMenuItem({
      name: '',
      description: '',
      price: '',
      category: '',
      image: ''
    })
    setShowMenuDialog(false)
    toast.success('Piatto creato con successo')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('L\'immagine deve essere inferiore a 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setNewMenuItem(prev => ({ ...prev, image: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCompleteOrderItem = (orderId: string, itemId: string) => {
    setOrders(prev => prev?.map(order => {
      if (order.id !== orderId) return order
      
      const updatedItems = order.items.map(item => {
        if (item.id === itemId) {
          const newCompletedQuantity = (item.completedQuantity || 0) + 1
          return { ...item, completedQuantity: newCompletedQuantity }
        }
        return item
      })
      
      // Check if all items are completed
      const allItemsCompleted = updatedItems.every(item => 
        (item.completedQuantity || 0) >= item.quantity
      )
      
      const updatedOrder = { ...order, items: updatedItems }
      
      // If all items completed, move to completed orders
      if (allItemsCompleted) {
        setTimeout(() => {
          setCompletedOrders(prev => [...(prev || []), { ...updatedOrder, status: 'completed' as const }])
          setOrders(prev => prev?.filter(o => o.id !== orderId) || [])
        }, 100)
      }
      
      return updatedOrder
    }) || [])
    
    toast.success('Piatto completato')
  }

  const handleUpdateRestaurantSettings = (updates: Partial<Restaurant>) => {
    setRestaurants(prev => prev?.map(r => r.id === user.restaurantId ? { ...r, ...updates } : r) || [])
    toast.success('Impostazioni aggiornate')
  }

  const generateQRCode = async (url: string) => {
    try {
      const dataUrl = await QRCodeLib.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      setQrCodeDataUrl(dataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Errore nella generazione del QR code')
    }
  }

  const handleShowQrCode = async (table: Table) => {
    setSelectedTable(table)
    await generateQRCode(table.qrCode)
    setShowQrDialog(true)
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h${minutes % 60 > 0 ? ` ${minutes % 60}min` : ''} fa`
    }
    return `${minutes} min fa`
  }

  const calculateTableTotal = (tableId: string) => {
    const tableOrders = restaurantOrders.filter(o => o.tableId === tableId)
    const total = tableOrders.reduce((sum, order) => sum + order.total, 0)
    
    const table = restaurantTables.find(t => t.id === tableId)
    let finalTotal = total
    
    if (table?.customerCount && currentRestaurant) {
      if (currentRestaurant.allYouCanEat.enabled) {
        finalTotal = currentRestaurant.allYouCanEat.pricePerPerson * table.customerCount
        // Add excluded items
        tableOrders.forEach(order => {
          order.items.forEach(item => {
            if (item.excludedFromAllYouCanEat) {
              const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
              if (menuItem) {
                finalTotal += menuItem.price * item.quantity
              }
            }
          })
        })
      } else if (currentRestaurant.coverChargePerPerson > 0) {
        // Add cover charge
        finalTotal += currentRestaurant.coverChargePerPerson * table.customerCount
      }
    }
    
    return finalTotal
  }

  const handleMarkTableAsPaid = (tableId: string) => {
    const tableOrders = restaurantOrders.filter(o => o.tableId === tableId)
    const table = restaurantTables.find(t => t.id === tableId)
    
    if (!table) return
    
    // Move orders to history
    const historyEntry: OrderHistory = {
      id: `history-${Date.now()}`,
      tableId,
      tableName: table.name,
      restaurantId: user.restaurantId!,
      items: tableOrders.flatMap(o => 
        o.items.map(item => {
          const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
          return {
            menuItemId: item.menuItemId,
            name: menuItem?.name || 'Piatto sconosciuto',
            quantity: item.quantity,
            price: menuItem?.price || 0,
            notes: item.notes
          }
        })
      ),
      total: calculateTableTotal(tableId),
      timestamp: tableOrders[0]?.timestamp || Date.now(),
      paidAt: Date.now(),
      customerCount: table.customerCount
    }

    setOrderHistory(prev => [...(prev || []), historyEntry])
    
    // Clear table orders
    setOrders(prev => prev?.filter(o => o.tableId !== tableId) || [])
    setCompletedOrders(prev => prev?.filter(o => o.tableId !== tableId) || [])
    
    // Reset table status
    setTables(prev => prev?.map(t => 
      t.id === tableId 
        ? { ...t, status: 'available' as const, customerCount: undefined, remainingOrders: undefined }
        : t
    ) || [])
    
    toast.success('Conto saldato e tavolo liberato')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`${sidebarExpanded ? 'w-64' : 'w-16'} transition-all duration-300 bg-card border-r border-border flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-primary-foreground" />
            </div>
            {sidebarExpanded && (
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-sm truncate">
                  {currentRestaurant?.name || 'Dashboard'}
                </h1>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="h-8 w-8 p-0"
            >
              <CaretDown size={14} className={`transition-transform ${sidebarExpanded ? 'rotate-180' : 'rotate-90'}`} />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'orders' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <List size={16} />
              {sidebarExpanded && 'Ordini'}
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'tables' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <MapPin size={16} />
              {sidebarExpanded && 'Tavoli'}
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'menu' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <BookOpen size={16} />
              {sidebarExpanded && 'Menu'}
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'reservations' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Calendar size={16} />
              {sidebarExpanded && 'Prenotazioni'}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Gear size={16} />
              {sidebarExpanded && 'Impostazioni'}
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            onClick={onLogout}
            className={`w-full ${sidebarExpanded ? 'justify-start' : 'justify-center'} text-muted-foreground hover:text-foreground`}
          >
            <SignOut size={16} />
            {sidebarExpanded && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-background border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {activeTab === 'orders' && 'Gestione Ordini'}
              {activeTab === 'tables' && 'Gestione Tavoli'}
              {activeTab === 'menu' && 'Gestione Menu'}
              {activeTab === 'reservations' && 'Prenotazioni'}
              {activeTab === 'settings' && 'Impostazioni'}
            </h2>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={orderViewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setOrderViewMode('table')}
                    >
                      Per Tavolo
                    </Button>
                    <Button
                      variant={orderViewMode === 'dish' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setOrderViewMode('dish')}
                    >
                      Per Piatto
                    </Button>
                  </div>
                </div>

                {/* Active Orders */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {restaurantOrders.map(order => {
                    const table = restaurantTables.find(t => t.id === order.tableId)
                    return (
                      <Card key={order.id} className="shadow-professional hover:shadow-professional-lg transition-all duration-300">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">
                              {table?.name || 'Tavolo sconosciuto'}
                            </CardTitle>
                            <Badge variant={order.status === 'waiting' ? 'default' : 'secondary'} className="text-xs">
                              {order.status === 'waiting' ? 'In attesa' : 'In preparazione'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimeAgo(order.timestamp)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {order.items.map(item => {
                            const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                            const completedQuantity = item.completedQuantity || 0
                            const remainingQuantity = item.quantity - completedQuantity
                            
                            return (
                              <div key={item.id} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                                <div className="flex-1">
                                  <div className="text-xs font-medium">{menuItem?.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Qta: {item.quantity} {completedQuantity > 0 && `(${remainingQuantity} rimasti)`}
                                  </div>
                                  {item.notes && (
                                    <div className="text-xs text-accent italic">{item.notes}</div>
                                  )}
                                </div>
                                {remainingQuantity > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleCompleteOrderItem(order.id, item.id)}
                                    className="h-6 w-12 text-xs bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Pronto
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Completed Orders Section */}
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-foreground mb-4">Ordini Completati</h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {completedOrders?.map(order => {
                      const table = restaurantTables.find(t => t.id === order.tableId)
                      return (
                        <Card key={order.id} className="bg-green-50 border-green-200 shadow-professional">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-green-800">
                              {table?.name || 'Tavolo sconosciuto'} - Completato
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xs text-green-600">
                              Completato alle {new Date(order.timestamp).toLocaleTimeString()}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }) || []}
                  </div>
                </div>
              </div>
            )}

            {/* Tables Tab */}
            {activeTab === 'tables' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                    <DialogTrigger asChild>
                      <Button className="shadow-gold hover:shadow-gold-lg">
                        <Plus size={16} className="mr-2" />
                        Nuovo Tavolo
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
                
                <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {restaurantTables.map(table => (
                    <Card key={table.id} className={`shadow-professional hover:shadow-professional-lg transition-all duration-300 hover-lift ${!table.isActive ? 'opacity-60' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold">{table.name}</CardTitle>
                          <Switch
                            checked={table.isActive}
                            onCheckedChange={() => handleToggleTable(table.id)}
                          />
                        </div>
                        <Badge 
                          variant={table.status === 'available' ? 'secondary' : 'default'}
                          className="text-xs w-fit"
                        >
                          {table.status === 'available' ? 'Libero' : 
                           table.status === 'waiting-order' ? 'Ordinazione' :
                           table.status === 'eating' ? 'Occupato' : 'Servizio'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {table.isActive && (
                          <>
                            <div className="text-xs text-muted-foreground">
                              PIN: <code className="bg-muted px-1 py-0.5 rounded text-xs">{table.pin}</code>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShowQrCode(table)}
                                className="flex-1 text-xs h-7"
                              >
                                <QrCode size={12} className="mr-1" />
                                QR
                              </Button>
                              {(table.status !== 'available') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkTableAsPaid(table.id)}
                                  className="flex-1 text-xs h-7"
                                >
                                  Salda
                                </Button>
                              )}
                            </div>
                            {table.customerCount && (
                              <div className="text-xs text-accent">
                                {table.customerCount} persone
                              </div>
                            )}
                            {calculateTableTotal(table.id) > 0 && (
                              <div className="text-xs font-medium">
                                Totale: €{calculateTableTotal(table.id).toFixed(2)}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Tab */}
            {activeTab === 'menu' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="shadow-gold hover:shadow-gold-lg">
                          Gestisci Categorie
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Gestione Categorie</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <Input
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              placeholder="Nome categoria"
                            />
                            <Button onClick={handleCreateCategory}>
                              <Plus size={16} />
                            </Button>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {restaurantCategories.map(category => (
                              <div key={category.id}>
                                {editingCategory?.id === category.id ? (
                                  <div className="flex items-center gap-2 p-2 bg-secondary/20 rounded">
                                    <Input
                                      value={editCategoryName}
                                      onChange={(e) => setEditCategoryName(e.target.value)}
                                      className="flex-1"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={handleSaveEditCategory}
                                    >
                                      <Check size={14} />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingCategory(null)
                                        setEditCategoryName('')
                                      }}
                                    >
                                      <X size={14} />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                                    <span className="text-sm">{category.name}</span>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleEditCategory(category)}
                                      >
                                        <PencilSimple size={10} />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleToggleCategoryVisibility(category.id)}
                                      >
                                        {category.isActive ? <Eye size={10} /> : <EyeSlash size={10} />}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive"
                                        onClick={() => handleDeleteCategory(category.id)}
                                      >
                                        <Trash size={10} />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
                      <DialogTrigger asChild>
                        <Button className="shadow-gold hover:shadow-gold-lg">
                          <Plus size={16} className="mr-2" />
                          Nuovo Piatto
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
                              onChange={(e) => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="item-description">Descrizione</Label>
                            <Textarea
                              id="item-description"
                              value={newMenuItem.description}
                              onChange={(e) => setNewMenuItem(prev => ({ ...prev, description: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="item-price">Prezzo (€)</Label>
                            <Input
                              id="item-price"
                              type="number"
                              step="0.01"
                              value={newMenuItem.price}
                              onChange={(e) => setNewMenuItem(prev => ({ ...prev, price: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="item-category">Categoria</Label>
                            <Select value={newMenuItem.category} onValueChange={(value) => setNewMenuItem(prev => ({ ...prev, category: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {restaurantCategories.filter(c => c.isActive).map(category => (
                                  <SelectItem key={category.id} value={category.name}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="item-image">Immagine (opzionale)</Label>
                            <Input
                              id="item-image"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                            {newMenuItem.image && (
                              <div className="mt-2">
                                <img 
                                  src={newMenuItem.image} 
                                  alt="Preview" 
                                  className="w-20 h-20 object-cover rounded"
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

                {/* Menu Items Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {restaurantMenuItems.map(item => (
                    <Card key={item.id} className="shadow-professional hover:shadow-professional-lg transition-all duration-300">
                      {item.image && (
                        <div className="w-full h-32 bg-muted">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover rounded-t-lg"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm font-semibold">{item.name}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {item.description}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">€{item.price.toFixed(2)}</div>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">
                            {item.isActive ? 'Attivo' : 'Disattivo'}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMenuItems(prev => prev?.map(m => 
                                  m.id === item.id ? { ...m, isActive: !m.isActive } : m
                                ) || [])
                              }}
                            >
                              {item.isActive ? <EyeSlash size={14} /> : <Eye size={14} />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Reservations Tab */}
            {activeTab === 'reservations' && (
              <ReservationsManager
                user={user}
                tables={restaurantTables}
                reservations={reservations || []}
                setReservations={setReservations}
              />
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {currentRestaurant && (
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card className="shadow-professional">
                      <CardHeader>
                        <CardTitle>Informazioni Generali</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Nome Ristorante</Label>
                          <Input
                            value={currentRestaurant.name}
                            onChange={(e) => handleUpdateRestaurantSettings({ name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Contatto</Label>
                          <Input
                            value={currentRestaurant.contact}
                            onChange={(e) => handleUpdateRestaurantSettings({ contact: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Orari</Label>
                          <Input
                            value={currentRestaurant.hours}
                            onChange={(e) => handleUpdateRestaurantSettings({ hours: e.target.value })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-professional">
                      <CardHeader>
                        <CardTitle>Tariffe</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Coperto per persona (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={currentRestaurant.coverChargePerPerson}
                            onChange={(e) => handleUpdateRestaurantSettings({ 
                              coverChargePerPerson: parseFloat(e.target.value) || 0 
                            })}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>All You Can Eat</Label>
                            <Switch
                              checked={currentRestaurant.allYouCanEat.enabled}
                              onCheckedChange={(enabled) => handleUpdateRestaurantSettings({
                                allYouCanEat: { ...currentRestaurant.allYouCanEat, enabled }
                              })}
                            />
                          </div>
                          
                          {currentRestaurant.allYouCanEat.enabled && (
                            <>
                              <div>
                                <Label>Prezzo per persona (€)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={currentRestaurant.allYouCanEat.pricePerPerson}
                                  onChange={(e) => handleUpdateRestaurantSettings({
                                    allYouCanEat: {
                                      ...currentRestaurant.allYouCanEat,
                                      pricePerPerson: parseFloat(e.target.value) || 0
                                    }
                                  })}
                                />
                              </div>
                              <div>
                                <Label>Massimo ordini per tavolo</Label>
                                <Input
                                  type="number"
                                  value={currentRestaurant.allYouCanEat.maxOrders}
                                  onChange={(e) => handleUpdateRestaurantSettings({
                                    allYouCanEat: {
                                      ...currentRestaurant.allYouCanEat,
                                      maxOrders: parseInt(e.target.value) || 1
                                    }
                                  })}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - {selectedTable?.name}</DialogTitle>
            <DialogDescription>
              I clienti possono scansionare questo QR code per accedere al menu e ordinare
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeDataUrl && (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code" 
                className="w-64 h-64 border rounded-lg"
              />
            )}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                PIN Tavolo: <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{selectedTable?.pin}</code>
              </p>
              <p className="text-xs text-muted-foreground">
                Il PIN può essere utilizzato in alternativa al QR code
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RestaurantDashboard
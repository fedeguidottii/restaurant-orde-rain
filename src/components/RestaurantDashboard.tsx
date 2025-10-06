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
  const [newTableGuests, setNewTableGuests] = useState(2)
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
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showTableDialog, setShowTableDialog] = useState(false)
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
      name: newTableName,
      isActive: false,
      pin: generatePin(),
      qrCode: generateQrCode(tableId),
      restaurantId: user.restaurantId!,
      status: 'available'
    }

    setTables(prev => [...(prev || []), newTable])
    setNewTableName('')
    toast.success('Tavolo creato con successo')
  }

  const handleToggleTable = async (tableId: string) => {
    const table = tables?.find(t => t.id === tableId)
    if (!table) return

    if (!table.isActive) {
      // Show dialog to get customer count when activating
      const guests = prompt('Quanti clienti si sono seduti al tavolo?', '2')
      if (!guests || isNaN(parseInt(guests))) {
        toast.error('Numero di clienti non valido')
        return
      }
      
      const customerCount = parseInt(guests)
      const newPin = generatePin()
      
      setTables(prev => prev?.map(t => t.id === tableId ? {
        ...t,
        isActive: true,
        pin: newPin,
        customerCount,
        remainingOrders: currentRestaurant?.allYouCanEat.enabled ? currentRestaurant.allYouCanEat.maxOrders : undefined
      } : t) || [])
      
      toast.success(`Tavolo ${table.name} attivato con PIN: ${newPin}`)
    } else {
      // Deactivate table
      setTables(prev => prev?.map(t => t.id === tableId ? {
        ...t,
        isActive: false,
        pin: generatePin(),
        customerCount: undefined,
        remainingOrders: undefined
      } : t) || [])
      
      toast.success(`Tavolo ${table.name} disattivato`)
    }
  }

  const handleDeleteTable = (tableId: string) => {
    if (confirm('Sei sicuro di voler eliminare questo tavolo?')) {
      setTables(prev => prev?.filter(t => t.id !== tableId) || [])
      toast.success('Tavolo eliminato')
    }
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
    setNewMenuItem({ name: '', description: '', price: '', category: '', image: '' })
    toast.success('Piatto aggiunto al menu')
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
      
      return { ...order, items: updatedItems }
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
            name: menuItem?.name || 'Sconosciuto',
            quantity: item.quantity,
            price: menuItem?.price || 0,
            notes: item.notes
          }
        })
      ),
      total: calculateTableTotal(tableId),
      timestamp: Date.now(),
      paidAt: Date.now(),
      customerCount: table.customerCount
    }
    
    setOrderHistory(prev => [...(prev || []), historyEntry])
    
    // Remove orders
    setOrders(prev => prev?.filter(o => o.tableId !== tableId) || [])
    
    // Deactivate table
    handleToggleTable(tableId)
    
    toast.success(`Tavolo ${table.name} segnato come pagato`)
    setShowTableDialog(false)
  }

  const handleClearAllData = () => {
    if (confirm('ATTENZIONE: Questa azione cancellerà tutti i dati (ordini, tavoli, menu, prenotazioni). Continuare?')) {
      // Clear all restaurant data
      setOrders([])
      setCompletedOrders([])
      setOrderHistory([])
      setReservations([])
      setTables([])
      setMenuItems([])
      setCategories([])
      
      toast.success('Tutti i dati sono stati cancellati')
    }
  }

  // Set active section based on tab
  useEffect(() => {
    setActiveSection(activeTab)
  }, [activeTab])

  return (
    <div className="min-h-screen bg-subtle-gradient flex">
      {/* Fixed Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full bg-card border-r border-border shadow-professional-lg z-40 transition-all duration-300 ${
          sidebarExpanded ? 'w-64' : 'w-16'
        }`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-liquid-gradient rounded-lg flex items-center justify-center shadow-gold">
              <CaretDown weight="bold" size={16} className="text-primary-foreground" />
            </div>
            {sidebarExpanded && (
              <div>
                <h1 className="font-bold text-foreground">Restaurant Manager</h1>
                <p className="text-xs text-muted-foreground">Benvenuto, {user.username}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="p-2 space-y-1 flex-1">
          <Button
            variant={activeSection === 'orders' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${
              activeSection === 'orders' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'
            }`}
            onClick={() => {
              setActiveTab('orders')
              setSidebarExpanded(false)
            }}
          >
            <List size={16} />
            {sidebarExpanded && <span className="ml-2 transition-all duration-200">Ordini</span>}
          </Button>
          
          <Button
            variant={activeSection === 'tables' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${!sidebarExpanded && 'px-2'} transition-all duration-200 hover:shadow-gold ${
              activeSection === 'tables' ? 'shadow-gold bg-primary/10 text-primary border-primary/20' : 'hover:bg-primary/5'
            }`}
            onClick={() => {
              setActiveTab('tables')
              setSidebarExpanded(false)
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
              setActiveTab('menu')
              setSidebarExpanded(false)
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
              setActiveTab('reservations')
              setSidebarExpanded(false)
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
              setActiveTab('analytics')
              setSidebarExpanded(false)
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
              setActiveTab('settings')
              setSidebarExpanded(false)
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
      <div className="flex-1 ml-16 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Gestione Ordini</h2>
              <div className="flex gap-2">
                <Select value={orderViewMode} onValueChange={(value: 'table' | 'dish') => setOrderViewMode(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Per Tavoli</SelectItem>
                    <SelectItem value="dish">Per Piatti</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="text-sm">
                  {restaurantOrders.length} {restaurantOrders.length === 1 ? 'ordine attivo' : 'ordini attivi'}
                </Badge>
              </div>
            </div>
            
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {restaurantOrders.map(order => {
                const table = restaurantTables.find(t => t.id === order.tableId)
                return (
                  <Card key={order.id} className="bg-order-card shadow-liquid hover:shadow-liquid-lg transition-all duration-300 border-liquid">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-foreground">
                          {table?.name || 'Tavolo sconosciuto'}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {formatTimeAgo(order.timestamp)}
                        </Badge>
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
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Gestione Tavoli</h2>
              <Dialog>
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
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs font-bold ${
                          table.isActive ? 'bg-green-100 border-green-400 text-green-700' : 'bg-gray-200 border-gray-400 text-gray-600'
                        }`}>
                          {table.name.slice(-1)}
                        </div>
                        <span className="text-xs">{table.name}</span>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleTable(table.id)}
                        className="h-4 w-4 p-0 text-xs"
                        title={table.isActive ? 'Disattiva tavolo' : 'Attiva tavolo'}
                      >
                        {table.isActive ? <EyeSlash size={8} /> : <Eye size={8} />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {table.isActive ? (
                      <>
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
                          <div className="text-xs text-muted-foreground">PIN</div>
                          <div className="text-base font-bold text-primary">{table.pin}</div>
                        </div>
                        {table.customerCount && (
                          <div className="text-center text-xs">
                            <span className="font-medium">{table.customerCount} clienti</span>
                          </div>
                        )}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowQrCode(table)}
                            className="text-xs flex-1 h-5"
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
                            className="text-xs flex-1 h-5"
                          >
                            Conto
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-5 w-5 p-0"
                            title="Modifica tavolo"
                          >
                            <PencilSimple size={8} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTable(table.id)}
                            className="text-xs text-destructive hover:bg-destructive/10 h-5 w-5 p-0"
                            title="Elimina tavolo"
                          >
                            <Trash size={8} />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-gray-100 border border-gray-300 rounded-lg p-2 text-center">
                          <div className="text-xs text-gray-600">Tavolo Vuoto</div>
                        </div>
                        <Button
                          onClick={() => handleToggleTable(table.id)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-5"
                        >
                          Attiva
                        </Button>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-5 w-5 p-0"
                            title="Modifica tavolo"
                          >
                            <PencilSimple size={8} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTable(table.id)}
                            className="text-xs text-destructive hover:bg-destructive/10 h-5 w-5 p-0"
                            title="Elimina tavolo"
                          >
                            <Trash size={8} />
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
          <TabsContent value="menu" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Gestione Menu</h2>
              <div className="flex gap-2">
                <Dialog>
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
                          <div key={category.id} className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                            <span className="text-sm">{category.name}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setEditingCategory(category)
                                  setEditCategoryName(category.name)
                                }}
                              >
                                <PencilSimple size={10} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setCategories(prev => prev?.map(c => 
                                    c.id === category.id ? { ...c, isActive: !c.isActive } : c
                                  ) || [])
                                }}
                              >
                                {category.isActive ? <Eye size={10} /> : <EyeSlash size={10} />}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog>
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
                        <Label htmlFor="item-image">URL Immagine (opzionale)</Label>
                        <Input
                          id="item-image"
                          value={newMenuItem.image}
                          onChange={(e) => setNewMenuItem(prev => ({ ...prev, image: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <Button onClick={handleCreateMenuItem} className="w-full">
                        Aggiungi Piatto
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Menu Categories and Items */}
            <div className="space-y-6">
              {restaurantCategories.filter(c => c.isActive).map(category => (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setCategories(prev => prev?.map(c => 
                          c.id === category.id ? { ...c, isActive: false } : c
                        ) || [])
                      }}
                    >
                      <EyeSlash size={10} />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {restaurantMenuItems
                      .filter(item => item.category === category.name)
                      .map(item => (
                        <Card key={item.id} className="shadow-professional hover:shadow-professional-lg transition-all duration-300">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">{item.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                <p className="text-lg font-bold text-primary mt-2">€{item.price.toFixed(2)}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  title="Modifica piatto"
                                >
                                  <PencilSimple size={10} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    setMenuItems(prev => prev?.map(m => 
                                      m.id === item.id ? { ...m, isActive: !m.isActive } : m
                                    ) || [])
                                  }}
                                >
                                  {item.isActive ? <Eye size={10} /> : <EyeSlash size={10} />}
                                </Button>
                              </div>
                            </div>
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-32 object-cover rounded-lg mt-3"
                              />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-4">
            <ReservationsManager 
              reservations={reservations || []}
              setReservations={setReservations}
              tables={restaurantTables}
              user={user}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsCharts 
              orders={restaurantOrders || []}
              completedOrders={completedOrders || []}
              orderHistory={orderHistory || []}
              menuItems={restaurantMenuItems}
              categories={restaurantCategories}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="max-w-2xl space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Impostazioni Ristorante</h2>
              
              {currentRestaurant && (
                <>
                  <Card className="shadow-professional">
                    <CardHeader>
                      <CardTitle>Informazioni Generali</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="restaurant-name">Nome Ristorante</Label>
                        <Input
                          id="restaurant-name"
                          value={currentRestaurant.name}
                          onChange={(e) => handleUpdateRestaurantSettings({ name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="restaurant-contact">Contatto</Label>
                        <Input
                          id="restaurant-contact"
                          value={currentRestaurant.contact}
                          onChange={(e) => handleUpdateRestaurantSettings({ contact: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="restaurant-hours">Orari</Label>
                        <Input
                          id="restaurant-hours"
                          value={currentRestaurant.hours}
                          onChange={(e) => handleUpdateRestaurantSettings({ hours: e.target.value })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-professional">
                    <CardHeader>
                      <CardTitle>Modalità Coperto</CardTitle>
                      <CardDescription>
                        Applica un costo fisso per persona a tutti i tavoli
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="cover-charge"
                          checked={currentRestaurant.coverChargePerPerson > 0}
                          onCheckedChange={(checked) => {
                            handleUpdateRestaurantSettings({
                              coverChargePerPerson: checked ? 2.00 : 0
                            })
                          }}
                        />
                        <Label htmlFor="cover-charge">Attiva coperto</Label>
                      </div>
                      {currentRestaurant.coverChargePerPerson > 0 && (
                        <div>
                          <Label htmlFor="cover-amount">Costo per persona (€)</Label>
                          <Input
                            id="cover-amount"
                            type="number"
                            step="0.50"
                            value={currentRestaurant.coverChargePerPerson}
                            onChange={(e) => handleUpdateRestaurantSettings({
                              coverChargePerPerson: parseFloat(e.target.value) || 0
                            })}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-professional">
                    <CardHeader>
                      <CardTitle>Modalità All You Can Eat</CardTitle>
                      <CardDescription>
                        Costo fisso per persona con limite di ordini
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="all-you-can-eat"
                          checked={currentRestaurant.allYouCanEat.enabled}
                          onCheckedChange={(enabled) => {
                            handleUpdateRestaurantSettings({
                              allYouCanEat: { ...currentRestaurant.allYouCanEat, enabled }
                            })
                          }}
                        />
                        <Label htmlFor="all-you-can-eat">Attiva All You Can Eat</Label>
                      </div>
                      {currentRestaurant.allYouCanEat.enabled && (
                        <>
                          <div>
                            <Label htmlFor="ayce-price">Prezzo per persona (€)</Label>
                            <Input
                              id="ayce-price"
                              type="number"
                              step="0.50"
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
                            <Label htmlFor="ayce-max-orders">Numero massimo di ordini</Label>
                            <Input
                              id="ayce-max-orders"
                              type="number"
                              value={currentRestaurant.allYouCanEat.maxOrders}
                              onChange={(e) => handleUpdateRestaurantSettings({
                                allYouCanEat: {
                                  ...currentRestaurant.allYouCanEat,
                                  maxOrders: parseInt(e.target.value) || 3
                                }
                              })}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-professional border-destructive/20">
                    <CardHeader>
                      <CardTitle className="text-destructive">Zona Pericolosa</CardTitle>
                      <CardDescription>
                        Azioni irreversibili - usare con cautela
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="destructive" 
                        onClick={handleClearAllData}
                        className="w-full"
                      >
                        Cancella Tutti i Dati
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code - {selectedTable?.name}</DialogTitle>
            <DialogDescription>
              I clienti possono scansionare questo QR code per accedere al menu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="QR Code" className="border rounded-lg" />
              )}
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                PIN: <span className="font-bold text-primary text-lg">{selectedTable?.pin}</span>
              </p>
              <p className="text-xs text-muted-foreground break-all">
                {selectedTable?.qrCode}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedTable?.qrCode) {
                    navigator.clipboard.writeText(selectedTable.qrCode)
                    toast.success('Link copiato negli appunti')
                  }
                }}
                className="flex-1"
              >
                Copia Link
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedTable?.qrCode) {
                    window.open(selectedTable.qrCode, '_blank')
                  }
                }}
                className="flex-1"
              >
                Testa QR Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Bill Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conto - {selectedTable?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTable && (
              <>
                <div className="space-y-2">
                  {restaurantOrders
                    .filter(o => o.tableId === selectedTable.id)
                    .map(order => (
                      <div key={order.id} className="border rounded-lg p-3">
                        <div className="text-sm font-medium">Ordine #{order.id.slice(-4)}</div>
                        {order.items.map(item => {
                          const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                          return (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{menuItem?.name} x{item.quantity}</span>
                              <span>€{((menuItem?.price || 0) * item.quantity).toFixed(2)}</span>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                </div>
                
                {selectedTable.customerCount && currentRestaurant && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span>Clienti: {selectedTable.customerCount}</span>
                    </div>
                    {currentRestaurant.allYouCanEat.enabled ? (
                      <div className="flex justify-between">
                        <span>All You Can Eat:</span>
                        <span>€{(currentRestaurant.allYouCanEat.pricePerPerson * selectedTable.customerCount).toFixed(2)}</span>
                      </div>
                    ) : (
                      currentRestaurant.coverChargePerPerson > 0 && (
                        <div className="flex justify-between">
                          <span>Coperto:</span>
                          <span>€{(currentRestaurant.coverChargePerPerson * selectedTable.customerCount).toFixed(2)}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
                
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Totale:</span>
                    <span>€{calculateTableTotal(selectedTable.id).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Remove individual orders
                      const orderIds = restaurantOrders
                        .filter(o => o.tableId === selectedTable.id)
                        .map(o => o.id)
                      
                      orderIds.forEach(orderId => {
                        setOrders(prev => prev?.filter(o => o.id !== orderId) || [])
                      })
                      
                      toast.success('Ordini eliminati')
                      setShowTableDialog(false)
                    }}
                    className="flex-1"
                  >
                    Elimina Ordini
                  </Button>
                  <Button
                    onClick={() => handleMarkTableAsPaid(selectedTable.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Segna come Pagato
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RestaurantDashboard
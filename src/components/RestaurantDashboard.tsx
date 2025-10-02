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
import { Plus, MapPin, BookOpen, Clock, ChartBar, Gear, SignOut, Trash, Eye, EyeSlash, QrCode, PencilSimple, Calendar, List, ClockCounterClockwise } from '@phosphor-icons/react'
import type { User, Table, MenuItem, Order, Restaurant, Reservation, OrderHistory, MenuCategory } from '../App'
import TimelineReservations from './TimelineReservations'

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
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showMenuDialog, setShowMenuDialog] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  
  const restaurantMenuItems = menuItems?.filter(item => item.restaurantId === user.restaurantId) || []
  const restaurantTables = tables?.filter(table => table.restaurantId === user.restaurantId) || []
  const restaurantOrders = orders?.filter(order => order.restaurantId === user.restaurantId) || []
  const restaurantCompletedOrders = completedOrders?.filter(order => order.restaurantId === user.restaurantId) || []
  const restaurantReservations = reservations?.filter(reservation => reservation.restaurantId === user.restaurantId) || []
  const restaurantOrderHistory = orderHistory?.filter(history => history.restaurantId === user.restaurantId) || []
  const restaurantCategories = categories?.filter(cat => cat.restaurantId === user.restaurantId) || []

  const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString()
  const generateQrCode = (tableId: string) => `${window.location.origin}?table=${tableId}`

  const handleCreateTable = () => {
    if (!newTableName.trim()) {
      toast.error('Inserisci un nome per il tavolo')
      return
    }

    const newTable: Table = {
      id: Date.now().toString(),
      name: newTableName,
      isActive: true,
      pin: generatePin(),
      qrCode: generateQrCode(Date.now().toString()),
      restaurantId: user.restaurantId!,
      status: 'available'
    }

    setTables([...(tables || []), newTable])
    setNewTableName('')
    toast.success('Tavolo creato con successo')
  }

  const handleToggleTable = (tableId: string) => {
    setTables(tables?.map(table => 
      table.id === tableId 
        ? { ...table, isActive: !table.isActive }
        : table
    ) || [])
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
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}min fa`
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
      {/* Sidebar */}
      <div
        id="sidebar"
        className={`${
          sidebarExpanded ? 'w-64' : 'w-16'
        } bg-white shadow-professional-lg transition-all duration-300 ease-in-out border-r border-border/20 flex flex-col`}
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
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Ordini Attivi</h2>
              <Badge variant="secondary" className="text-sm">
                {restaurantOrders.length} {restaurantOrders.length === 1 ? 'ordine' : 'ordini'}
              </Badge>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {restaurantOrders.map(order => {
                const table = restaurantTables.find(t => t.id === order.tableId)
                
                return (
                  <Card key={order.id} className="bg-white border-l-4 border-l-yellow-400 shadow-professional hover:shadow-professional-lg transition-all duration-300 hover-lift">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold">{table?.name || 'Tavolo sconosciuto'}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {getTimeAgo(order.timestamp)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {order.items.map((item) => {
                          const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                          const completedQuantity = item.completedQuantity || 0
                          const remainingQuantity = item.quantity - completedQuantity
                          
                          return (
                            <div key={item.id} className="p-3 bg-card-gradient rounded-lg border border-liquid shadow-sm">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {item.quantity}x {menuItem?.name || 'Piatto sconosciuto'}
                                  </div>
                                  {item.notes && (
                                    <div className="text-xs text-muted-foreground italic mt-1">
                                      {item.notes}
                                    </div>
                                  )}
                                  {completedQuantity > 0 && (
                                    <div className="text-xs text-green-600 font-medium mt-1">
                                      ✓ {completedQuantity} pronti
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {remainingQuantity > 0 && (
                                <Button 
                                  onClick={() => handleCompleteDish(order.id, item.id)}
                                  size="sm"
                                  className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 text-xs py-1.5"
                                >
                                  Pronto ({remainingQuantity} da fare)
                                </Button>
                              )}
                              
                              {remainingQuantity === 0 && (
                                <div className="w-full py-1.5 text-center bg-green-100 text-green-700 rounded text-xs font-medium">
                                  ✓ Completato
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              
              {restaurantOrders.length === 0 && (
                <Card className="col-span-full shadow-professional">
                  <CardContent className="text-center py-8">
                    <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nessun ordine attivo</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Completed Orders Section */}
            {restaurantCompletedOrders.length > 0 && (
              <>
                <Separator className="my-6" />
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">Ordini Completati</h3>
                  <Badge variant="secondary" className="text-sm">
                    {restaurantCompletedOrders.length} {restaurantCompletedOrders.length === 1 ? 'completato' : 'completati'}
                  </Badge>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {restaurantCompletedOrders.map(order => {
                    const table = restaurantTables.find(t => t.id === order.tableId)
                    
                    return (
                      <Card key={order.id} className="bg-green-50 border-l-4 border-l-green-400 shadow-professional hover:shadow-professional-lg transition-all duration-300 hover-lift">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold">{table?.name || 'Tavolo sconosciuto'}</CardTitle>
                            <Badge variant="outline" className="text-xs bg-green-100">
                              Completato
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            {order.items.map((item, index) => {
                              const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                              return (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span className="font-medium">{item.quantity}x {menuItem?.name || 'Piatto sconosciuto'}</span>
                                </div>
                              )
                            })}
                          </div>
                          <Separator />
                          <Button 
                            variant="outline"
                            onClick={() => handleUncompleteOrder(order.id)}
                            className="w-full text-sm shadow-sm hover:shadow-md transition-all duration-200"
                          >
                            Riporta in Attesa
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
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
                <Card key={table.id} className={`shadow-professional hover:shadow-professional-lg transition-all duration-300 ${!table.isActive ? 'opacity-50' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{table.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleTable(table.id)}
                          className="h-6 w-6 p-0"
                          title={table.isActive ? 'Disattiva tavolo' : 'Attiva tavolo'}
                        >
                          {table.isActive ? <Eye size={16} /> : <EyeSlash size={16} />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTable(table)
                          setShowQrDialog(true)
                        }}
                        className="text-xs"
                      >
                        <QrCode size={14} className="mr-1" />
                        QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTable(table)
                          setShowTableDialog(true)
                        }}
                        className="text-xs"
                      >
                        Conto
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <PencilSimple size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTable(table.id)}
                        className="text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">PIN: {table.pin}</p>
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
                                  <p className="font-medium">{category.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {categoryItemsCount} piatt{categoryItemsCount === 1 ? 'o' : 'i'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
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
                            <div className="flex gap-2">
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
            <TimelineReservations 
              user={user}
              tables={tables || []}
              reservations={reservations || []}
              setReservations={setReservations}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Analitiche</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="shadow-professional">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{restaurantOrders.length}</div>
                    <p className="text-sm text-muted-foreground">Ordini in Attesa</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-professional">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{restaurantCompletedOrders.length}</div>
                    <p className="text-sm text-muted-foreground">Ordini Oggi</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-professional">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      €{(restaurantOrders.reduce((sum, order) => sum + order.total, 0) + 
                          restaurantCompletedOrders.reduce((sum, order) => sum + order.total, 0)).toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Ricavi Oggi</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Impostazioni</h2>
            </div>
            
            <Card className="shadow-professional">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="restaurantName">Nome Ristorante</Label>
                    <Input
                      id="restaurantName"
                      placeholder="Nome del ristorante"
                    />
                  </div>
                  <div>
                    <Label htmlFor="restaurantEmail">Email</Label>
                    <Input
                      id="restaurantEmail"
                      type="email"
                      placeholder="email@ristorante.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="restaurantPhone">Telefono</Label>
                    <Input
                      id="restaurantPhone"
                      placeholder="Numero di telefono"
                    />
                  </div>
                  <Button className="w-full">
                    Salva Impostazioni
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Storico Ordini</h2>
            </div>
            
            {restaurantOrderHistory.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <ClockCounterClockwise size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessun ordine nello storico</p>
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
                <p className="text-sm font-mono text-muted-foreground break-all px-4">
                  {selectedTable?.qrCode}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                URL per test: <strong className="font-mono text-primary">{selectedTable?.qrCode}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                PIN attuale: <strong className="text-2xl font-bold text-primary">{selectedTable?.pin}</strong>
              </p>
              <Button 
                onClick={() => {
                  if (selectedTable?.qrCode) {
                    window.open(selectedTable.qrCode, '_blank')
                  }
                }}
                className="w-full mt-4"
              >
                Testa QR Code
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
                          // Delete all orders for this table
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
                          // Move orders to history and mark as paid
                          const orderHistoryEntries: OrderHistory[] = tableOrders.map(order => ({
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
                            paidAt: Date.now()
                          }))
                          
                          setOrderHistory([...(orderHistory || []), ...orderHistoryEntries])
                          setOrders(orders?.filter(o => o.tableId !== selectedTable?.id) || [])
                          setCompletedOrders(completedOrders?.filter(o => o.tableId !== selectedTable?.id) || [])
                          
                          // Generate new PIN for the table
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
    </div>
  )
}

export default RestaurantDashboard
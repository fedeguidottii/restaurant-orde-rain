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
import { User, Table, MenuItem, Order, Restaurant } from '../App'
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
  CreditCard
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
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [orderViewMode, setOrderViewMode] = useState<'tables' | 'dishes'>('tables')
  const [editingTable, setEditingTable] = useState<Table | null>(null)

  const restaurant = restaurants?.find(r => r.id === user.restaurantId)
  const restaurantTables = tables?.filter(t => t.restaurantId === user.restaurantId) || []
  const restaurantMenuItems = menuItems?.filter(m => m.restaurantId === user.restaurantId) || []
  const restaurantOrders = orders?.filter(o => o.restaurantId === user.restaurantId) || []
  const restaurantCompletedOrders = completedOrders?.filter(o => o.restaurantId === user.restaurantId) || []

  const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString()

  const getTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60))
    return `${minutes} min fa`
  }

  const handleCreateTable = () => {
    if (!newTable.name) {
      toast.error('Inserisci il nome del tavolo')
      return
    }

    const table: Table = {
      id: `table-${Date.now()}`,
      name: newTable.name,
      isActive: true,
      pin: generatePin(),
      qrCode: `${window.location.origin}?table=table-${Date.now()}`,
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
    toast.success('Tavolo eliminato')
  }

  const handleDeleteMenuItem = (menuId: string) => {
    setMenuItems((current) => (current || []).filter(m => m.id !== menuId))
    toast.success('Piatto eliminato')
  }

  const pendingOrdersCount = restaurantOrders.filter(o => o.status === 'waiting').length
  const todayOrders = restaurantOrders.filter(o => 
    new Date(o.timestamp).toDateString() === new Date().toDateString()
  ).length
  const todayRevenue = restaurantOrders
    .filter(o => new Date(o.timestamp).toDateString() === new Date().toDateString())
    .reduce((sum, o) => sum + o.total, 0)

  const getTableBill = (tableId: string) => {
    const tableOrders = [...restaurantOrders, ...restaurantCompletedOrders].filter(o => o.tableId === tableId)
    const total = tableOrders.reduce((sum, o) => sum + o.total, 0)
    return { orders: tableOrders, total }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`${sidebarExpanded ? 'w-64' : 'w-16'} transition-all duration-300 bg-card border-r flex flex-col`}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-3 ${!sidebarExpanded && 'justify-center'}`}>
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <ChefHat weight="bold" size={20} className="text-primary-foreground" />
              </div>
              {sidebarExpanded && (
                <div>
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
              className="p-1"
            >
              {sidebarExpanded ? <CaretLeft size={16} /> : <CaretRight size={16} />}
            </Button>
          </div>
        </div>

        <nav className="flex-1 px-2">
          <div className="space-y-1">
            <Button
              variant={activeSection === 'orders' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'}`}
              onClick={() => setActiveSection('orders')}
            >
              <Bell size={16} />
              {sidebarExpanded && <span className="ml-2">Ordini</span>}
              {sidebarExpanded && pendingOrdersCount > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  {pendingOrdersCount}
                </Badge>
              )}
            </Button>
            
            <Button
              variant={activeSection === 'tables' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'}`}
              onClick={() => setActiveSection('tables')}
            >
              <Square size={16} />
              {sidebarExpanded && <span className="ml-2">Tavoli</span>}
            </Button>
            
            <Button
              variant={activeSection === 'menu' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'}`}
              onClick={() => setActiveSection('menu')}
            >
              <List size={16} />
              {sidebarExpanded && <span className="ml-2">Menù</span>}
            </Button>
            
            <Button
              variant={activeSection === 'analytics' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'}`}
              onClick={() => setActiveSection('analytics')}
            >
              <ChartBar size={16} />
              {sidebarExpanded && <span className="ml-2">Analitiche</span>}
            </Button>
            
            <Button
              variant={activeSection === 'settings' ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${!sidebarExpanded && 'px-2'}`}
              onClick={() => setActiveSection('settings')}
            >
              <Gear size={16} />
              {sidebarExpanded && <span className="ml-2">Impostazioni</span>}
            </Button>
          </div>
        </nav>

        <div className="p-2">
          <Button variant="outline" onClick={onLogout} className={`w-full ${!sidebarExpanded && 'px-2'}`}>
            <SignOut size={16} />
            {sidebarExpanded && <span className="ml-2">Esci</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Orders Section */}
          {activeSection === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Gestione Ordini</h2>
                <div className="flex items-center gap-2">
                  <Select value={orderViewMode} onValueChange={(value: 'tables' | 'dishes') => setOrderViewMode(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tables">Per Tavoli</SelectItem>
                      <SelectItem value="dishes">Per Piatti</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {restaurantOrders.length === 0 ? (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    Nessun ordine ricevuto oggi.
                  </div>
                ) : (
                  restaurantOrders
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((order) => {
                      const table = restaurantTables.find(t => t.id === order.tableId)
                      return (
                        <Card key={order.id} className="max-w-sm">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                {table?.name || 'Tavolo sconosciuto'}
                              </CardTitle>
                              <Badge 
                                variant={
                                  order.status === 'waiting' ? 'destructive' :
                                  order.status === 'preparing' ? 'default' :
                                  order.status === 'served' ? 'secondary' : 'outline'
                                }
                              >
                                {order.status === 'waiting' && 'In Attesa'}
                                {order.status === 'preparing' && 'In Preparazione'}
                                {order.status === 'served' && 'Servito'}
                                {order.status === 'completed' && 'Completato'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getTimeAgo(order.timestamp)} • €{order.total.toFixed(2)}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {order.items.map((item, index) => {
                              const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                              return (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <div>
                                    <span>{item.quantity}x {menuItem?.name || 'Piatto non trovato'}</span>
                                    {item.notes && (
                                      <p className="text-muted-foreground text-xs italic">Note: {item.notes}</p>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCompleteOrderItem(order.id, index)}
                                    className="ml-2"
                                  >
                                    <CheckCircle size={14} className="text-green-600" />
                                  </Button>
                                </div>
                              )
                            })}
                          </CardContent>
                        </Card>
                      )
                    })
                )}
              </div>

              {/* Completed Orders Section */}
              {restaurantCompletedOrders.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">Ordini Completati</h3>
                  <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {restaurantCompletedOrders.map((order) => {
                      const table = restaurantTables.find(t => t.id === order.tableId)
                      return (
                        <Card key={order.id} className="max-w-sm bg-muted/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                {table?.name || 'Tavolo sconosciuto'}
                              </CardTitle>
                              <Badge variant="outline">Completato</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getTimeAgo(order.timestamp)} • €{order.total.toFixed(2)}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {order.items.map((item, index) => {
                              const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                              return (
                                <div key={index} className="flex justify-between items-center text-sm">
                                  <div>
                                    <span>{item.quantity}x {menuItem?.name || 'Piatto non trovato'}</span>
                                    {item.notes && (
                                      <p className="text-muted-foreground text-xs italic">Note: {item.notes}</p>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUncompleteOrderItem(order.id)}
                                    className="ml-2"
                                  >
                                    <Circle size={14} className="text-muted-foreground" />
                                  </Button>
                                </div>
                              )
                            })}
                          </CardContent>
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Gestione Tavoli</h2>
                <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus size={16} />
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

              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {restaurantTables.map((table) => {
                  const bill = getTableBill(table.id)
                  const isPaid = (paidTables || []).includes(table.id)
                  
                  return (
                    <Card key={table.id} className={`${!table.isActive ? 'opacity-50' : ''} ${isPaid ? 'bg-green-50 border-green-200' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Square size={20} weight={table.isActive ? 'fill' : 'regular'} />
                            <CardTitle className="text-lg">{table.name}</CardTitle>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">PIN: {table.pin}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTable(table)}
                          >
                            Modifica
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTable(table)
                              setShowQRDialog(true)
                            }}
                          >
                            <QrCode size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Show bill dialog
                            }}
                          >
                            <Receipt size={14} />
                          </Button>
                        </div>
                        {bill.total > 0 && !isPaid && (
                          <div className="pt-2 border-t">
                            <div className="flex justify-between items-center text-sm">
                              <span>Totale conto:</span>
                              <span className="font-semibold">€{bill.total.toFixed(2)}</span>
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => handleMarkTableAsPaid(table.id)}
                            >
                              Segna come Pagato
                            </Button>
                          </div>
                        )}
                        {isPaid && (
                          <div className="text-center text-sm text-green-600 font-medium">
                            ✓ Pagato
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleTable(table.id)}
                            className="flex-1"
                          >
                            {table.isActive ? <EyeSlash size={14} /> : <Eye size={14} />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTable(table.id)}
                          >
                            <Trash size={14} />
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

          {/* Menu Section */}
          {activeSection === 'menu' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Gestione Menù</h2>
                <div className="flex gap-2">
                  <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Plus size={16} />
                        Nuova Categoria
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crea Nuova Categoria</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="categoryName">Nome Categoria</Label>
                          <Input
                            id="categoryName"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Es: Pizze"
                          />
                        </div>
                        <Button onClick={handleCreateCategory} className="w-full">
                          Crea Categoria
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus size={16} />
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
                      <h3 className="text-xl font-semibold text-primary">{category}</h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryItems.map((item) => (
                          <Card key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{item.name}</CardTitle>
                                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-primary">€{item.price.toFixed(2)}</div>
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
                                  className="flex-1"
                                >
                                  {item.isActive ? <EyeSlash size={14} /> : <Eye size={14} />}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteMenuItem(item.id)}
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
                <div className="text-center text-muted-foreground py-8">
                  Nessun piatto nel menù. Aggiungi il primo piatto per iniziare.
                </div>
              )}
            </div>
          )}

          {/* Analytics Section */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Dashboard Analitiche</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Calendar size={16} />
                    Oggi
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ordini in Attesa</CardTitle>
                    <Bell className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-accent">{pendingOrdersCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ordini Oggi</CardTitle>
                    <ClockCounterClockwise className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{todayOrders}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ricavi Oggi</CardTitle>
                    <Money className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">€{todayRevenue.toFixed(2)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Scontrino Medio</CardTitle>
                    <Receipt className="h-4 w-4 text-secondary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-secondary">
                      €{todayOrders > 0 ? (todayRevenue / todayOrders).toFixed(2) : '0.00'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
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
                      <span className="font-semibold">{restaurantOrders.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tavoli Pagati:</span>
                      <span className="font-semibold">{(paidTables || []).length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
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
                        {restaurantOrders.length > 0 
                          ? `${Math.round((restaurantCompletedOrders.length / (restaurantOrders.length + restaurantCompletedOrders.length)) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Impostazioni Ristorante</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informazioni Ristorante</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome Ristorante</Label>
                      <Input value={restaurant?.name || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Contatto</Label>
                      <Input value={restaurant?.contact || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Orari</Label>
                      <Input value={restaurant?.hours || ''} disabled />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Per modificare queste informazioni, contatta l'amministratore del sistema.
                    </p>
                  </CardContent>
                </Card>

                <Card>
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
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code - {selectedTable?.name}</DialogTitle>
            <DialogDescription>
              Scansiona questo codice per accedere al tavolo
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-48 h-48 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
              <QrCode size={64} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              PIN: {selectedTable?.pin}
            </p>
            <Button className="w-full">
              <DownloadSimple size={16} className="mr-2" />
              Scarica QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
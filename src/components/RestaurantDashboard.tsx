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
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: ''
  })
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [historyFilters, setHistoryFilters] = useState({
    dateFrom: '',
    dateTo: '',
    tableId: 'all',
    customerName: ''
  })

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

  const [newReservation, setNewReservation] = useState({
    customerName: '',
    customerPhone: '',
    guests: 2,
    time: '',
    tableId: ''
  })

  const addReservation = (date: string, time: string, tableId: string) => {
    setNewReservation({ ...newReservation, time, tableId })
  }

  const saveReservation = () => {
    if (!newReservation.customerName || !newReservation.time || !newReservation.tableId) {
      toast.error('Tutti i campi sono obbligatori')
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

    let status = table.status
    let statusColor = 'bg-gray-100 text-gray-700'
    let statusText = 'Disponibile'

    switch (status) {
      case 'available':
        statusColor = 'bg-green-100 text-green-700 border-green-200'
        statusText = 'Disponibile'
        break
      case 'waiting-order':
        statusColor = 'bg-blue-100 text-blue-700 border-blue-200'
        statusText = 'Attesa Ordine'
        break
      case 'order-ready':
        statusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200'
        statusText = 'Pronto da Servire'
        break
      case 'eating':
        statusColor = 'bg-orange-100 text-orange-700 border-orange-200'
        statusText = 'Stanno Mangiando'
        break
      case 'waiting-bill':
        statusColor = 'bg-purple-100 text-purple-700 border-purple-200'
        statusText = 'Attesa Conto'
        break
      case 'cleaning':
        statusColor = 'bg-gray-100 text-gray-700 border-gray-200'
        statusText = 'Da Pulire'
        break
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
          <Button variant="outline" onClick={onLogout}>
            Logout
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
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.timestamp).toLocaleTimeString()}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {order.items.map(item => {
                        const menuItem = (menuItems || []).find(m => m.id === item.menuItemId)
                        return (
                          <div key={item.menuItemId} className="flex items-center justify-between text-sm">
                            <span>{item.quantity}x {menuItem?.name || 'Item sconosciuto'}</span>
                            <span>€{((menuItem?.price || 0) * item.quantity).toFixed(2)}</span>
                          </div>
                        )
                      })}
                      <Separator />
                      <div className="flex items-center justify-between font-medium">
                        <span>Totale</span>
                        <span>€{order.total.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          onClick={() => advanceOrderStatus(order.id)}
                          disabled={order.status === 'completed'}
                        >
                          {order.status === 'waiting' && 'Inizia Preparazione'}
                          {order.status === 'preparing' && 'Pronto da Servire'}
                          {order.status === 'served' && 'Consegnato'}
                          {order.status === 'completed' && 'Completato'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {(orders || []).length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessun ordine attivo</p>
                </CardContent>
              </Card>
            )}
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
                    <Button onClick={addTable}>Aggiungi Tavolo</Button>
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
            <Dialog open={!!newReservation.time} onOpenChange={() => setNewReservation({ ...newReservation, time: '', tableId: '' })}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuova Prenotazione</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {(tables || []).find(t => t.id === newReservation.tableId)?.name} - {newReservation.time}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="customer-name">Nome Cliente</Label>
                    <Input
                      id="customer-name"
                      value={newReservation.customerName}
                      onChange={(e) => setNewReservation({ ...newReservation, customerName: e.target.value })}
                      placeholder="Mario Rossi"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone">Telefono</Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      value={newReservation.customerPhone}
                      onChange={(e) => setNewReservation({ ...newReservation, customerPhone: e.target.value })}
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
                      value={newReservation.guests}
                      onChange={(e) => setNewReservation({ ...newReservation, guests: parseInt(e.target.value) || 2 })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveReservation} className="flex-1">Salva Prenotazione</Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setNewReservation({ ...newReservation, time: '', tableId: '' })}
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
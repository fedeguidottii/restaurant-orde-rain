import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Bell
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

  const [newTable, setNewTable] = useState({ name: '' })
  const [newMenuItem, setNewMenuItem] = useState({ name: '', description: '', price: '', category: '' })
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showMenuDialog, setShowMenuDialog] = useState(false)

  const restaurant = restaurants?.find(r => r.id === user.restaurantId)
  const restaurantTables = tables?.filter(t => t.restaurantId === user.restaurantId) || []
  const restaurantMenuItems = menuItems?.filter(m => m.restaurantId === user.restaurantId) || []
  const restaurantOrders = orders?.filter(o => o.restaurantId === user.restaurantId) || []

  const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString()

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

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((current) => 
      (current || []).map(o => 
        o.id === orderId ? { ...o, status } : o
      )
    )
    toast.success('Stato ordine aggiornato')
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <ChefHat weight="bold" size={20} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {restaurant?.name || 'Ristorante'}
                </h1>
                <p className="text-sm text-muted-foreground">Ciao, {user.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pendingOrdersCount > 0 && (
                <div className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-full">
                  <Bell size={16} />
                  <span className="text-sm font-medium">{pendingOrdersCount} nuovi ordini</span>
                </div>
              )}
              <Button variant="outline" onClick={onLogout} className="flex items-center gap-2">
                <SignOut size={16} />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="orders" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="orders">Ordini</TabsTrigger>
            <TabsTrigger value="tables">Tavoli</TabsTrigger>
            <TabsTrigger value="menu">Menù</TabsTrigger>
            <TabsTrigger value="analytics">Analitiche</TabsTrigger>
            <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          </TabsList>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6">
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
                <CheckCircle className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">€{todayRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell size={20} className="text-primary" />
                  Gestione Ordini
                </CardTitle>
                <CardDescription>Visualizza e gestisci gli ordini in arrivo dai tavoli</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {restaurantOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nessun ordine ricevuto oggi.
                    </p>
                  ) : (
                    restaurantOrders
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((order) => {
                        const table = restaurantTables.find(t => t.id === order.tableId)
                        return (
                          <div key={order.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">
                                  {table?.name || 'Tavolo sconosciuto'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(order.timestamp).toLocaleString('it-IT')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
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
                                <span className="font-semibold">€{order.total.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {order.items.map((item, index) => {
                                const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                                return (
                                  <div key={index} className="flex justify-between items-center text-sm">
                                    <span>{item.quantity}x {menuItem?.name || 'Piatto non trovato'}</span>
                                    {item.notes && (
                                      <span className="text-muted-foreground italic">Note: {item.notes}</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            <div className="flex gap-2 pt-2">
                              {order.status === 'waiting' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                >
                                  Accetta Ordine
                                </Button>
                              )}
                              {order.status === 'preparing' && (
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                                >
                                  Segna come Servito
                                </Button>
                              )}
                              {order.status === 'served' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                >
                                  Completa Ordine
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode size={20} className="text-primary" />
                      Gestione Tavoli
                    </CardTitle>
                    <CardDescription>Crea e gestisci i tavoli del ristorante</CardDescription>
                  </div>
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
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {restaurantTables.map((table) => (
                    <div key={table.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{table.name}</h3>
                        <p className="text-sm text-muted-foreground">PIN: {table.pin}</p>
                        <p className="text-xs text-muted-foreground">QR: {table.qrCode}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={table.isActive ? "default" : "secondary"}>
                          {table.isActive ? "Attivo" : "Inattivo"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleTable(table.id)}
                        >
                          {table.isActive ? <EyeSlash size={16} /> : <Eye size={16} />}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTable(table.id)}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {restaurantTables.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nessun tavolo configurato. Crea il primo tavolo per iniziare.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat size={20} className="text-primary" />
                      Gestione Menù
                    </CardTitle>
                    <CardDescription>Crea e modifica il menù digitale</CardDescription>
                  </div>
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
                              <SelectItem value="Antipasti">Antipasti</SelectItem>
                              <SelectItem value="Primi">Primi</SelectItem>
                              <SelectItem value="Secondi">Secondi</SelectItem>
                              <SelectItem value="Contorni">Contorni</SelectItem>
                              <SelectItem value="Dolci">Dolci</SelectItem>
                              <SelectItem value="Bevande">Bevande</SelectItem>
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {restaurantMenuItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{item.category}</Badge>
                          <span className="font-semibold text-primary">€{item.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Disponibile" : "Non Disponibile"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleMenuItem(item.id)}
                        >
                          {item.isActive ? <EyeSlash size={16} /> : <Eye size={16} />}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMenuItem(item.id)}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {restaurantMenuItems.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nessun piatto nel menù. Aggiungi il primo piatto per iniziare.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analitiche Ristorante</CardTitle>
                <CardDescription>Panoramica delle performance del tuo ristorante</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Statistiche Generali</h3>
                    <div className="space-y-2">
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
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Performance Oggi</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Ordini Ricevuti:</span>
                        <span className="font-semibold">{todayOrders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ricavi:</span>
                        <span className="font-semibold text-primary">€{todayRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Scontrino Medio:</span>
                        <span className="font-semibold">
                          €{todayOrders > 0 ? (todayRevenue / todayOrders).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Impostazioni Ristorante</CardTitle>
                <CardDescription>Modifica le informazioni del tuo ristorante</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { Table, MenuItem, Order, MenuCategory } from '../App'
import { 
  ChefHat, 
  Plus, 
  Minus, 
  ShoppingCart, 
  X,
  Check,
  ClockCounterClockwise,
  Lock,
  Eye,
  EyeSlash
} from '@phosphor-icons/react'

interface Props {
  tableId: string
  onExit: () => void
}

interface CartItem {
  menuItemId: string
  quantity: number
  notes?: string
}

export default function CustomerMenu({ tableId, onExit }: Props) {
  const [tables] = useKV<Table[]>('tables', [])
  const [menuItems] = useKV<MenuItem[]>('menuItems', [])
  const [categories] = useKV<MenuCategory[]>('menuCategories', [])
  const [orders, setOrders] = useKV<Order[]>('orders', [])
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCart, setShowCart] = useState(false)
  const [itemNotes, setItemNotes] = useState<{ [key: string]: string }>({})
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [enteredPin, setEnteredPin] = useState('')
  const [isPinVerified, setIsPinVerified] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const table = tables?.find(t => t.id === tableId)
  const restaurantMenuItems = menuItems?.filter(m => 
    m.restaurantId === table?.restaurantId && m.isActive
  ) || []

  const restaurantCategories = categories?.filter(cat => 
    cat.restaurantId === table?.restaurantId && cat.isActive
  ).sort((a, b) => a.order - b.order) || []
  
  const filteredItems = selectedCategory === 'all' 
    ? restaurantMenuItems 
    : restaurantMenuItems.filter(item => item.category === selectedCategory)

  const cartTotal = cart.reduce((total, cartItem) => {
    const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
    return total + (menuItem?.price || 0) * cartItem.quantity
  }, 0)

  // Check PIN on mount
  useEffect(() => {
    if (table && !isPinVerified) {
      setShowPinDialog(true)
    }
  }, [table, isPinVerified])

  const handlePinVerification = () => {
    if (table && enteredPin === table.pin) {
      setIsPinVerified(true)
      setShowPinDialog(false)
      toast.success(`Benvenuto al ${table.name}!`)
    } else {
      toast.error('PIN non corretto')
    }
  }

  const addToCart = (menuItemId: string) => {
    if (!isPinVerified) {
      setShowPinDialog(true)
      return
    }
    setCart(current => {
      const existingItem = current.find(item => item.menuItemId === menuItemId)
      if (existingItem) {
        return current.map(item =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...current, { menuItemId, quantity: 1 }]
    })
  }

  const removeFromCart = (menuItemId: string) => {
    setCart(current => {
      const existingItem = current.find(item => item.menuItemId === menuItemId)
      if (existingItem && existingItem.quantity > 1) {
        return current.map(item =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      return current.filter(item => item.menuItemId !== menuItemId)
    })
  }

  const updateItemNotes = (menuItemId: string, notes: string) => {
    setCart(current =>
      current.map(item =>
        item.menuItemId === menuItemId
          ? { ...item, notes }
          : item
      )
    )
  }

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      toast.error('Il carrello è vuoto')
      return
    }

    const order: Order = {
      id: `order-${Date.now()}`,
      tableId,
      restaurantId: table!.restaurantId,
      items: cart.map((item, index) => ({
        id: `${Date.now()}-${index}`,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes,
        completedQuantity: 0
      })),
      status: 'waiting',
      timestamp: Date.now(),
      total: cartTotal
    }

    setOrders((current) => [...(current || []), order])
    setCart([])
    setItemNotes({})
    setShowCart(false)
    toast.success('Ordine inviato con successo!')
  }

  const getItemQuantityInCart = (menuItemId: string) => {
    const cartItem = cart.find(item => item.menuItemId === menuItemId)
    return cartItem?.quantity || 0
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md shadow-liquid-lg bg-order-card">
          <CardHeader>
            <CardTitle>Tavolo non trovato</CardTitle>
            <CardDescription>Il tavolo richiesto non esiste o non è attivo</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onExit} className="w-full bg-liquid-gradient shadow-liquid">
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-primary/5">
      {/* PIN Verification Dialog */}
      <Dialog open={showPinDialog} onOpenChange={() => {}}>
        <DialogContent className="shadow-liquid-lg bg-order-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-primary">
              <Lock size={32} className="mx-auto mb-2" />
              Accesso Tavolo
            </DialogTitle>
            <DialogDescription className="text-center">
              Inserisci il PIN temporaneo per ordinare dal {table.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN Temporaneo</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Inserisci PIN"
                  className="pr-10 shadow-liquid text-center text-2xl font-bold"
                  maxLength={4}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeSlash size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
            <Button 
              onClick={handlePinVerification} 
              className="w-full bg-liquid-gradient shadow-liquid text-lg font-bold py-3"
              disabled={!enteredPin}
            >
              <Check size={20} className="mr-2" />
              Accedi al Menù
            </Button>
            <Button variant="outline" onClick={onExit} className="w-full">
              Torna Indietro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isPinVerified && (
        <>
          {/* Header */}
          <header className="border-b bg-order-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-liquid border-liquid">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-liquid-gradient rounded-lg flex items-center justify-center shadow-liquid">
                    <ChefHat weight="bold" size={24} className="text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Menù Digitale</h1>
                    <p className="text-muted-foreground">{table.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Dialog open={showCart} onOpenChange={setShowCart}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2 relative bg-liquid-gradient shadow-liquid hover:shadow-liquid-lg transition-all duration-300">
                        <ShoppingCart size={20} />
                        Carrello
                        {cart.length > 0 && (
                          <Badge className="absolute -top-2 -right-2 px-2 min-w-[24px] h-6 text-sm bg-accent animate-pulse">
                            {cart.reduce((sum, item) => sum + item.quantity, 0)}
                          </Badge>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md shadow-liquid-lg bg-order-card">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Il Tuo Ordine</DialogTitle>
                        <DialogDescription>
                          Controlla i piatti selezionati prima di inviare l'ordine
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {cart.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            Il carrello è vuoto
                          </p>
                        ) : (
                          <>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {cart.map((cartItem) => {
                                const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
                                if (!menuItem) return null
                                
                                return (
                                  <div key={cartItem.menuItemId} className="p-3 bg-liquid-gradient rounded-lg border-liquid shadow-liquid">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1">
                                        <h4 className="font-bold text-lg">{menuItem.name}</h4>
                                        <p className="text-muted-foreground">
                                          {cartItem.quantity}x €{menuItem.price.toFixed(2)} = €{(menuItem.price * cartItem.quantity).toFixed(2)}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => removeFromCart(cartItem.menuItemId)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Minus size={14} />
                                        </Button>
                                        <span className="w-8 text-center font-bold">{cartItem.quantity}</span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => addToCart(cartItem.menuItemId)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Plus size={14} />
                                        </Button>
                                      </div>
                                    </div>
                                    <Textarea
                                      placeholder="Note speciali per questo piatto..."
                                      value={cartItem.notes || ''}
                                      onChange={(e) => updateItemNotes(cartItem.menuItemId, e.target.value)}
                                      className="h-16 text-sm shadow-liquid"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                            <div className="border-t pt-4">
                              <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-xl">Totale:</span>
                                <span className="font-bold text-primary text-2xl">
                                  €{cartTotal.toFixed(2)}
                                </span>
                              </div>
                              <Button onClick={handlePlaceOrder} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-3 shadow-liquid-lg">
                                <Check size={20} className="mr-2" />
                                Invia Ordine
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" onClick={onExit} className="shadow-liquid">
                    <X size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-8">
            {/* Category Filter */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === 'all' ? "default" : "outline"}
                onClick={() => setSelectedCategory('all')}
                className={`whitespace-nowrap flex-shrink-0 shadow-liquid transition-all duration-300 ${
                  selectedCategory === 'all' ? 'bg-liquid-gradient shadow-liquid-lg' : ''
                }`}
              >
                Tutto
              </Button>
              {restaurantCategories?.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`whitespace-nowrap flex-shrink-0 shadow-liquid transition-all duration-300 ${
                    selectedCategory === category.name ? 'bg-liquid-gradient shadow-liquid-lg' : ''
                  }`}
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Menu Items */}
            <div className="grid gap-6">
              {filteredItems.length === 0 ? (
                <Card className="shadow-liquid-lg bg-order-card">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Nessun piatto disponibile in questa categoria</p>
                  </CardContent>
                </Card>
              ) : (
                filteredItems.map((item) => {
                  const quantityInCart = getItemQuantityInCart(item.id)
                  
                  return (
                    <Card key={item.id} className="shadow-liquid-lg bg-order-card border-liquid overflow-hidden hover:shadow-liquid-lg transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
                      {item.image && (
                        <div className="relative">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                      )}
                      <CardContent className="p-6 relative">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-foreground mb-2">{item.name}</h3>
                            <p className="text-muted-foreground mb-4 leading-relaxed">{item.description}</p>
                            <div className="text-3xl font-bold text-primary mb-4">€{item.price.toFixed(2)}</div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            {quantityInCart > 0 && (
                              <Badge className="bg-accent text-accent-foreground font-bold text-lg px-3 py-1 animate-pulse">
                                {quantityInCart} nel carrello
                              </Badge>
                            )}
                            <div className="flex items-center gap-2">
                              {quantityInCart > 0 && (
                                <Button
                                  variant="outline"
                                  size="lg"
                                  onClick={() => removeFromCart(item.id)}
                                  className="h-12 w-12 shadow-liquid"
                                >
                                  <Minus size={20} />
                                </Button>
                              )}
                              <Button
                                size="lg"
                                onClick={() => addToCart(item.id)}
                                className="bg-liquid-gradient shadow-liquid-lg hover:shadow-[0_12px_48px_-12px_rgba(201,161,82,0.5)] transition-all duration-300 px-6 py-3 font-bold text-lg"
                              >
                                <Plus size={20} className="mr-2" />
                                Aggiungi
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
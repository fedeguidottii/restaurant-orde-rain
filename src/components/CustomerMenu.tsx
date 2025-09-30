import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { Table, MenuItem, Order } from '../App'
import { 
  ChefHat, 
  Plus, 
  Minus, 
  ShoppingCart, 
  X,
  Check,
  ClockCounterClockwise
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
  const [orders, setOrders] = useKV<Order[]>('orders', [])
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCart, setShowCart] = useState(false)
  const [itemNotes, setItemNotes] = useState<{ [key: string]: string }>({})

  const table = tables?.find(t => t.id === tableId)
  const restaurantMenuItems = menuItems?.filter(m => 
    m.restaurantId === table?.restaurantId && m.isActive
  ) || []

  const categories = ['all', ...new Set(restaurantMenuItems.map(item => item.category))]
  const filteredItems = selectedCategory === 'all' 
    ? restaurantMenuItems 
    : restaurantMenuItems.filter(item => item.category === selectedCategory)

  const cartTotal = cart.reduce((total, cartItem) => {
    const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
    return total + (menuItem?.price || 0) * cartItem.quantity
  }, 0)

  const addToCart = (menuItemId: string) => {
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
      items: cart,
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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Tavolo non trovato</CardTitle>
            <CardDescription>Il tavolo richiesto non esiste o non è attivo</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onExit} className="w-full">
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
                <h1 className="text-xl font-bold text-foreground">Menù Digitale</h1>
                <p className="text-sm text-muted-foreground">{table.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={showCart} onOpenChange={setShowCart}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 relative">
                    <ShoppingCart size={16} />
                    Carrello
                    {cart.length > 0 && (
                      <Badge className="absolute -top-2 -right-2 px-1 min-w-[20px] h-5 text-xs">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Il Tuo Ordine</DialogTitle>
                    <DialogDescription>
                      Controlla i piatti selezionati prima di inviare l'ordine
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Il carrello è vuoto
                      </p>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {cart.map((cartItem) => {
                            const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
                            if (!menuItem) return null
                            
                            return (
                              <div key={cartItem.menuItemId} className="flex justify-between items-start p-3 border rounded-lg">
                                <div className="flex-1">
                                  <h4 className="font-medium">{menuItem.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {cartItem.quantity}x €{menuItem.price.toFixed(2)}
                                  </p>
                                  {cartItem.notes && (
                                    <p className="text-xs text-muted-foreground italic mt-1">
                                      Note: {cartItem.notes}
                                    </p>
                                  )}
                                  <div className="mt-2">
                                    <Textarea
                                      placeholder="Note speciali..."
                                      value={cartItem.notes || ''}
                                      onChange={(e) => updateItemNotes(cartItem.menuItemId, e.target.value)}
                                      className="h-16 text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeFromCart(cartItem.menuItemId)}
                                  >
                                    <Minus size={14} />
                                  </Button>
                                  <span className="w-8 text-center">{cartItem.quantity}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addToCart(cartItem.menuItemId)}
                                  >
                                    <Plus size={14} />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-semibold">Totale:</span>
                            <span className="font-bold text-primary text-lg">
                              €{cartTotal.toFixed(2)}
                            </span>
                          </div>
                          <Button onClick={handlePlaceOrder} className="w-full">
                            <Check size={16} className="mr-2" />
                            Invia Ordine
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={onExit}>
                <X size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap flex-shrink-0"
            >
              {category === 'all' ? 'Tutto' : category}
            </Button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="grid gap-6">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  {selectedCategory === 'all' 
                    ? 'Nessun piatto disponibile al momento' 
                    : `Nessun piatto disponibile nella categoria ${selectedCategory}`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredItems.map((item) => {
              const quantityInCart = getItemQuantityInCart(item.id)
              
              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                          <span className="font-bold text-primary text-lg ml-4">
                            €{item.price.toFixed(2)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-muted-foreground mb-3 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="mb-3">
                            {item.category}
                          </Badge>
                          <div className="flex items-center gap-3">
                            {quantityInCart > 0 ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeFromCart(item.id)}
                                >
                                  <Minus size={16} />
                                </Button>
                                <span className="w-8 text-center font-semibold">
                                  {quantityInCart}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addToCart(item.id)}
                                >
                                  <Plus size={16} />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => addToCart(item.id)}
                                className="flex items-center gap-2"
                              >
                                <Plus size={16} />
                                Aggiungi
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Fixed Cart Button for Mobile */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 right-4 md:hidden">
            <Button
              onClick={() => setShowCart(true)}
              size="lg"
              className="rounded-full shadow-lg flex items-center gap-2"
            >
              <ShoppingCart size={20} />
              <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              <span>€{cartTotal.toFixed(2)}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
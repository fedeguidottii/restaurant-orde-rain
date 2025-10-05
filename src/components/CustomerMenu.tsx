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
  
  // Find the table first to get the restaurant ID
  const table = tables?.find(t => t.id === tableId)
  
  // Use restaurant-specific key for orders
  const [orders, setOrders] = useKV<Order[]>(
    table ? `orders_${table.restaurantId}` : 'orders_default', 
    []
  )
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCart, setShowCart] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [enteredPin, setEnteredPin] = useState('')
  const [isPinVerified, setIsPinVerified] = useState(false)
  const [showPin, setShowPin] = useState(false)

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

  if (!isPinVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-liquid-lg bg-order-card">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-primary flex items-center justify-center gap-2">
              <Lock size={32} />
              Accesso Tavolo
            </CardTitle>
            <CardDescription className="text-center">
              Inserisci il PIN temporaneo per ordinare dal {table.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-primary/5">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/20 shadow-professional">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <ChefHat size={28} />
                {table.name}
              </h1>
              <p className="text-sm text-muted-foreground">Menu Digitale</p>
            </div>
            <div className="flex items-center gap-3">
              {cart.length > 0 && (
                <Button 
                  onClick={() => setShowCart(true)}
                  className="bg-primary hover:bg-primary/90 shadow-gold relative"
                >
                  <ShoppingCart size={16} className="mr-2" />
                  Carrello
                  <Badge 
                    variant="secondary" 
                    className="ml-2 bg-white text-primary absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={onExit}
                className="border-destructive/20 text-destructive hover:bg-destructive/10"
              >
                <X size={16} />
              </Button>
            </div>
          </div>
          
          {/* Category Navigation - Fixed */}
          <div className="mt-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className="flex-shrink-0"
              >
                Tutti
              </Button>
              {restaurantCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.name ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.name)}
                  className="flex-shrink-0"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Menu Items Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const quantityInCart = getItemQuantityInCart(item.id)
            
            return (
              <Card key={item.id} className="overflow-hidden shadow-professional hover:shadow-professional-lg transition-all duration-300 hover-lift bg-order-card">
                {item.image && (
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{item.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">€{item.price.toFixed(2)}</span>
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      {quantityInCart > 0 ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="h-8 w-8 p-0 rounded-full"
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="text-lg font-bold text-primary min-w-[2rem] text-center">
                            {quantityInCart}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addToCart(item.id)}
                            className="h-8 w-8 p-0 rounded-full"
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => addToCart(item.id)}
                          className="flex-1 bg-primary hover:bg-primary/90 shadow-gold"
                        >
                          <Plus size={16} className="mr-2" />
                          Aggiungi
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-12">
              <ChefHat size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Nessun piatto disponibile in questa categoria</p>
            </div>
          )}
        </div>
      </main>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
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
    </div>
  )
}
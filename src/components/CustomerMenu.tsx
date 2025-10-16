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
import { Table, MenuItem, Order, MenuCategory, Restaurant } from '../App'
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
  instanceId?: string
}

export default function CustomerMenu({ tableId, onExit }: Props) {
  const [tables, setTables] = useKV<Table[]>('tables', [])
  const [menuItems] = useKV<MenuItem[]>('menuItems', [])
  const [categories] = useKV<MenuCategory[]>('menuCategories', [])
  const [restaurants] = useKV<Restaurant[]>('restaurants', [])
  
  // Find the table first to get the restaurant ID
  const table = tables?.find(t => t.id === tableId)
  const restaurant = restaurants?.find(r => r.id === table?.restaurantId)
  
  // Use restaurant-specific key for orders
  const [orders, setOrders] = useKV<Order[]>(
    table ? `orders_${table.restaurantId}` : 'orders_default', 
    []
  )
  
  const [cart, setCart] = useState<CartItem[]>([])
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
  
  const itemsByCategory = restaurantCategories.map(category => ({
    category: category.name,
    items: restaurantMenuItems.filter(item => item.category === category.name)
  })).filter(group => group.items.length > 0)

  // Calculate different totals for display
  const cartCalculations = {
    // Items that are charged normally (excluded from AYCE or AYCE disabled)
    regularTotal: cart.reduce((total, cartItem) => {
      const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
      if (menuItem && (!restaurant?.allYouCanEat.enabled || menuItem.excludeFromAllYouCanEat)) {
        return total + menuItem.price * cartItem.quantity
      }
      return total
    }, 0),
    
    // Cover charge
    coverCharge: table?.customerCount && restaurant?.coverChargePerPerson 
      ? restaurant.coverChargePerPerson * table.customerCount 
      : 0,
    
    // All you can eat charge (only for first order typically)
    allYouCanEatCharge: restaurant?.allYouCanEat.enabled && table?.customerCount 
      ? restaurant.allYouCanEat.pricePerPerson * table.customerCount 
      : 0,
    
    // Free items (included in AYCE)
    freeItems: cart.filter(cartItem => {
      const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
      return menuItem && restaurant?.allYouCanEat.enabled && !menuItem.excludeFromAllYouCanEat
    })
  }

  // Legacy cart total for compatibility
  const cartTotal = cartCalculations.regularTotal

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
      return [...current, { menuItemId, quantity: 1, instanceId: `${menuItemId}-${Date.now()}` }]
    })
  }

  const removeFromCart = (instanceId: string) => {
    setCart(current => current.filter(item => item.instanceId !== instanceId))
  }

  const updateQuantity = (instanceId: string, delta: number) => {
    setCart(current =>
      current.map(item => {
        if (item.instanceId === instanceId) {
          const newQuantity = item.quantity + delta
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
        }
        return item
      }).filter(item => item.quantity > 0)
    )
  }

  const updateItemNotes = (instanceId: string, notes: string) => {
    setCart(current =>
      current.map(item =>
        item.instanceId === instanceId
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

    // Check all-you-can-eat limits
    if (restaurant?.allYouCanEat.enabled && table?.remainingOrders !== undefined && table.remainingOrders <= 0) {
      toast.error('Hai raggiunto il limite massimo di ordini per All You Can Eat')
      return
    }

    // Calculate costs based on restaurant settings
    let coverCharge = 0
    let allYouCanEatCharge = 0
    let regularTotal = 0

    if (table?.customerCount && restaurant?.coverChargePerPerson) {
      coverCharge = restaurant.coverChargePerPerson * table.customerCount
    }

    if (restaurant?.allYouCanEat.enabled && table?.customerCount) {
      allYouCanEatCharge = restaurant.allYouCanEat.pricePerPerson * table.customerCount
    }

    // Calculate regular items (items not excluded from all you can eat or when AYCE is disabled)
    cart.forEach(cartItem => {
      const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
      if (menuItem) {
        if (!restaurant?.allYouCanEat.enabled || menuItem.excludeFromAllYouCanEat) {
          regularTotal += menuItem.price * cartItem.quantity
        }
      }
    })

    const order: Order = {
      id: `order-${Date.now()}`,
      tableId,
      restaurantId: table!.restaurantId,
      items: cart.map((item, index) => {
        const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
        return {
          id: `${Date.now()}-${index}`,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
          completedQuantity: 0,
          excludedFromAllYouCanEat: menuItem?.excludeFromAllYouCanEat || false
        }
      }),
      status: 'waiting',
      timestamp: Date.now(),
      total: regularTotal,
      coverCharge: coverCharge > 0 ? coverCharge : undefined,
      allYouCanEatCharge: allYouCanEatCharge > 0 ? allYouCanEatCharge : undefined,
      remainingOrders: table?.remainingOrders
    }

    setOrders((current) => [...(current || []), order])
    
    // Decrease remaining orders for all-you-can-eat
    if (restaurant?.allYouCanEat.enabled && table?.remainingOrders !== undefined) {
      setTables(tables?.map(t => 
        t.id === tableId 
          ? { ...t, remainingOrders: t.remainingOrders! - 1 }
          : t
      ) || [])
    }

    setCart([])
    setShowCart(false)
    toast.success('Ordine inviato con successo!')
  }

  const getItemQuantityInCart = (menuItemId: string) => {
    return cart.filter(item => item.menuItemId === menuItemId).reduce((sum, item) => sum + item.quantity, 0)
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
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Menu Items by Category */}
        <div className="space-y-8">
          {itemsByCategory.map((categoryGroup) => (
            <div key={categoryGroup.category}>
              {/* Category Title Separator */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-primary mb-2">{categoryGroup.category}</h2>
                <div className="h-1 w-20 bg-primary rounded-full"></div>
              </div>
              
              {/* Items Grid for this Category */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {categoryGroup.items.map((item) => {
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
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-primary">
                                {restaurant?.allYouCanEat.enabled && !item.excludeFromAllYouCanEat 
                                  ? 'Incluso' 
                                  : `€${item.price.toFixed(2)}`
                                }
                              </span>
                              {restaurant?.allYouCanEat.enabled && !item.excludeFromAllYouCanEat && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  All You Can Eat
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <Button
                              onClick={() => addToCart(item.id)}
                              className="flex-1 bg-primary hover:bg-primary/90 shadow-gold"
                            >
                              <Plus size={16} className="mr-2" />
                              Aggiungi {quantityInCart > 0 && `(${quantityInCart})`}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
          
          {itemsByCategory.length === 0 && (
            <div className="text-center py-12">
              <ChefHat size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Nessun piatto disponibile al momento</p>
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
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map((cartItem) => {
                    const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
                    if (!menuItem) return null
                    
                    return (
                      <div key={cartItem.instanceId} className="p-3 bg-liquid-gradient rounded-lg border-liquid shadow-liquid">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-bold text-base">{menuItem.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(cartItem.instanceId!, -1)}
                                className="h-7 w-7 p-0 rounded-full"
                              >
                                <Minus size={12} />
                              </Button>
                              <span className="w-8 text-center font-bold text-primary">{cartItem.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(cartItem.instanceId!, 1)}
                                className="h-7 w-7 p-0 rounded-full"
                              >
                                <Plus size={12} />
                              </Button>
                              <span className="text-sm text-muted-foreground ml-2">
                                {restaurant?.allYouCanEat.enabled && !menuItem.excludeFromAllYouCanEat 
                                  ? 'Incluso' 
                                  : `€${(menuItem.price * cartItem.quantity).toFixed(2)}`
                                }
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(cartItem.instanceId!)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Note speciali per questo piatto..."
                          value={cartItem.notes || ''}
                          onChange={(e) => updateItemNotes(cartItem.instanceId!, e.target.value)}
                          className="h-16 text-sm shadow-liquid"
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="border-t pt-4">
                  <div className="space-y-2 mb-4">
                    {/* All You Can Eat Summary */}
                    {restaurant?.allYouCanEat.enabled && cartCalculations.freeItems.length > 0 && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-green-800 mb-1">All You Can Eat</div>
                        {cartCalculations.freeItems.map(cartItem => {
                          const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
                          return menuItem ? (
                            <div key={cartItem.menuItemId} className="text-sm text-green-700">
                              {cartItem.quantity}x {menuItem.name} - Incluso
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                    
                    {/* Regular items */}
                    {cartCalculations.regularTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Piatti:</span>
                        <span>€{cartCalculations.regularTotal.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {/* Cover charge */}
                    {cartCalculations.coverCharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Coperto ({table?.customerCount} persone):</span>
                        <span>€{cartCalculations.coverCharge.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {/* All You Can Eat charge (shown only on first order or if no orders placed yet) */}
                    {cartCalculations.allYouCanEatCharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>All You Can Eat ({table?.customerCount} persone):</span>
                        <span>€{cartCalculations.allYouCanEatCharge.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {restaurant?.allYouCanEat.enabled && table?.remainingOrders !== undefined && (
                      <div className="text-sm text-center p-2 bg-blue-50 rounded">
                        Ordini rimasti: {table.remainingOrders}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-xl">Totale:</span>
                    <span className="font-bold text-primary text-2xl">
                      €{(cartCalculations.regularTotal + cartCalculations.coverCharge + cartCalculations.allYouCanEatCharge).toFixed(2)}
                    </span>
                  </div>
                  <Button 
                    onClick={handlePlaceOrder} 
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-3 shadow-liquid-lg"
                    disabled={restaurant?.allYouCanEat.enabled && table?.remainingOrders !== undefined && table.remainingOrders <= 0}
                  >
                    <Check size={20} className="mr-2" />
                    {restaurant?.allYouCanEat.enabled && table?.remainingOrders !== undefined && table.remainingOrders <= 0 
                      ? 'Limite ordini raggiunto' 
                      : 'Invia Ordine'
                    }
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
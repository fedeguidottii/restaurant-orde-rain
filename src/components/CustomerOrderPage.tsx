import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  EyeSlash,
  Receipt,
  ArrowLeft
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

export default function CustomerOrderPage({ tableId, onExit }: Props) {
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCart, setShowCart] = useState(false)
  const [showBill, setShowBill] = useState(false)
  const [showAddNotes, setShowAddNotes] = useState<string | null>(null)
  const [itemNotes, setItemNotes] = useState('')

  const restaurantMenuItems = menuItems?.filter(m => 
    m.restaurantId === table?.restaurantId && m.isActive
  ) || []

  const restaurantCategories = categories?.filter(cat => 
    cat.restaurantId === table?.restaurantId && cat.isActive
  ).sort((a, b) => a.order - b.order) || []
  
  const filteredItems = selectedCategory === 'all' 
    ? restaurantMenuItems 
    : restaurantMenuItems.filter(item => item.category === selectedCategory)

  // Get table orders for bill calculation
  const tableOrders = orders?.filter(o => o.tableId === tableId) || []
  
  // Calculate bill total
  const calculateBillTotal = () => {
    let total = 0
    
    // Add all completed orders
    tableOrders.forEach(order => {
      total += order.total
    })
    
    // Add cover charge if applicable
    if (table?.customerCount && restaurant?.coverChargePerPerson) {
      if (!restaurant.allYouCanEat.enabled) {
        total += restaurant.coverChargePerPerson * table.customerCount
      }
    }
    
    // Handle all you can eat pricing
    if (restaurant?.allYouCanEat.enabled && table?.customerCount) {
      // For AYCE, replace regular item costs with flat rate
      let regularItemsTotal = 0
      let excludedItemsTotal = 0
      
      tableOrders.forEach(order => {
        order.items.forEach(item => {
          const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
          if (menuItem) {
            if (item.excludedFromAllYouCanEat || menuItem.excludeFromAllYouCanEat) {
              excludedItemsTotal += menuItem.price * item.quantity
            } else {
              regularItemsTotal += menuItem.price * item.quantity
            }
          }
        })
      })
      
      // Replace regular items cost with AYCE price
      total = total - regularItemsTotal + (restaurant.allYouCanEat.pricePerPerson * table.customerCount) + excludedItemsTotal
    }
    
    return total
  }

  const cartTotal = cart.reduce((total, cartItem) => {
    const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
    if (menuItem && (!restaurant?.allYouCanEat.enabled || menuItem.excludeFromAllYouCanEat)) {
      return total + menuItem.price * cartItem.quantity
    }
    return total
  }, 0)

  const addToCart = (menuItemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItemId === menuItemId)
      if (existing) {
        return prev.map(item => 
          item.menuItemId === menuItemId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { menuItemId, quantity: 1 }]
    })
  }

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItemId === menuItemId)
      if (existing && existing.quantity > 1) {
        return prev.map(item => 
          item.menuItemId === menuItemId 
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      return prev.filter(item => item.menuItemId !== menuItemId)
    })
  }

  const updateItemNotes = (menuItemId: string, notes: string) => {
    setCart(prev => prev.map(item => 
      item.menuItemId === menuItemId 
        ? { ...item, notes: notes.trim() || undefined }
        : item
    ))
  }

  const getCartQuantity = (menuItemId: string) => {
    return cart.find(item => item.menuItemId === menuItemId)?.quantity || 0
  }

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error('Aggiungi almeno un piatto al carrello')
      return
    }

    if (!table) {
      toast.error('Tavolo non trovato')
      return
    }

    // Check AYCE remaining orders
    if (restaurant?.allYouCanEat.enabled && table.remainingOrders !== undefined && table.remainingOrders <= 0) {
      toast.error('Hai raggiunto il limite massimo di ordini per l\'all you can eat')
      return
    }

    const orderId = `order-${Date.now()}`
    let orderTotal = 0
    
    const orderItems = cart.map(cartItem => {
      const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
      if (menuItem) {
        const itemTotal = menuItem.price * cartItem.quantity
        
        // Only add to total if not included in AYCE or AYCE is disabled
        if (!restaurant?.allYouCanEat.enabled || menuItem.excludeFromAllYouCanEat) {
          orderTotal += itemTotal
        }
      }
      
      return {
        id: `item-${Date.now()}-${Math.random()}`,
        menuItemId: cartItem.menuItemId,
        quantity: cartItem.quantity,
        notes: cartItem.notes,
        completedQuantity: 0,
        excludedFromAllYouCanEat: menuItem?.excludeFromAllYouCanEat || false
      }
    })

    const newOrder: Order = {
      id: orderId,
      tableId: table.id,
      restaurantId: table.restaurantId,
      items: orderItems,
      status: 'waiting',
      timestamp: Date.now(),
      total: orderTotal
    }

    // Add cover charge on first order
    const isFirstOrder = tableOrders.length === 0
    if (isFirstOrder && restaurant?.coverChargePerPerson && table.customerCount) {
      if (restaurant.allYouCanEat.enabled) {
        newOrder.allYouCanEatCharge = restaurant.allYouCanEat.pricePerPerson * table.customerCount
      } else {
        newOrder.coverCharge = restaurant.coverChargePerPerson * table.customerCount
      }
    }

    setOrders(prev => [...(prev || []), newOrder])
    
    // Update table status and remaining orders for AYCE
    if (restaurant?.allYouCanEat.enabled) {
      const newRemainingOrders = table.remainingOrders !== undefined 
        ? Math.max(0, table.remainingOrders - 1)
        : restaurant.allYouCanEat.maxOrders - 1
        
      setTables(prev => prev?.map(t => 
        t.id === tableId 
          ? { ...t, status: 'waiting-order' as const, remainingOrders: newRemainingOrders }
          : t
      ) || [])
    } else {
      setTables(prev => prev?.map(t => 
        t.id === tableId 
          ? { ...t, status: 'waiting-order' as const }
          : t
      ) || [])
    }

    setCart([])
    setShowCart(false)
    toast.success('Ordine inviato alla cucina!')
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Tavolo non trovato</CardTitle>
            <CardDescription>
              Il codice del tavolo non è valido o il tavolo non è attivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onExit} className="w-full">
              Torna alla home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onExit}>
                <ArrowLeft size={16} />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{restaurant?.name}</h1>
                <p className="text-sm text-muted-foreground">{table.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBill(true)}>
                <Receipt size={16} className="mr-1" />
                Conto
              </Button>
              <Button 
                className="relative" 
                onClick={() => setShowCart(true)}
                disabled={cart.length === 0}
              >
                <ShoppingCart size={16} className="mr-2" />
                Carrello
                {cart.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-accent text-accent-foreground">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* AYCE Status */}
        {restaurant?.allYouCanEat.enabled && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-primary">All You Can Eat Attivo</h3>
                  <p className="text-sm text-muted-foreground">
                    €{restaurant.allYouCanEat.pricePerPerson}/persona
                  </p>
                </div>
                {table.remainingOrders !== undefined && (
                  <Badge variant="outline" className="border-primary text-primary">
                    {table.remainingOrders} ordini rimasti
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className="whitespace-nowrap"
          >
            Tutti
          </Button>
          {restaurantCategories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.name ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category.name)}
              className="whitespace-nowrap"
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => {
            const cartQuantity = getCartQuantity(item.id)
            const isExcludedFromAYCE = restaurant?.allYouCanEat.enabled && item.excludeFromAllYouCanEat
            
            return (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {item.image && (
                  <div className="aspect-video bg-muted">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {item.description}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">€{item.price.toFixed(2)}</div>
                      {isExcludedFromAYCE && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Escluso da AYCE
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {cartQuantity > 0 ? (
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="font-medium min-w-[2rem] text-center">
                        {cartQuantity}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => addToCart(item.id)}
                      >
                        <Plus size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAddNotes(item.id)
                          setItemNotes(cart.find(c => c.menuItemId === item.id)?.notes || '')
                        }}
                        className="ml-auto text-xs"
                      >
                        Note
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => addToCart(item.id)}
                      className="w-full"
                    >
                      <Plus size={16} className="mr-2" />
                      Aggiungi
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carrello</DialogTitle>
            <DialogDescription>
              Rivedi il tuo ordine prima di inviarlo alla cucina
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Il carrello è vuoto
              </p>
            ) : (
              <div className="space-y-4">
                {cart.map(cartItem => {
                  const menuItem = restaurantMenuItems.find(m => m.id === cartItem.menuItemId)
                  if (!menuItem) return null
                  
                  const isExcludedFromAYCE = restaurant?.allYouCanEat.enabled && menuItem.excludeFromAllYouCanEat
                  const itemTotal = menuItem.price * cartItem.quantity
                  
                  return (
                    <div key={cartItem.menuItemId} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{menuItem.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          €{menuItem.price.toFixed(2)} x {cartItem.quantity}
                        </p>
                        {cartItem.notes && (
                          <p className="text-sm text-accent italic mt-1">
                            Note: {cartItem.notes}
                          </p>
                        )}
                        {isExcludedFromAYCE && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Escluso da AYCE
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        {isExcludedFromAYCE || !restaurant?.allYouCanEat.enabled ? (
                          <div className="font-bold">€{itemTotal.toFixed(2)}</div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Incluso</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeFromCart(cartItem.menuItemId)}
                        >
                          <Minus size={14} />
                        </Button>
                        <span className="w-8 text-center">{cartItem.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => addToCart(cartItem.menuItemId)}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {cart.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                {cartTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Totale articoli a pagamento:</span>
                    <span className="font-bold">€{cartTotal.toFixed(2)}</span>
                  </div>
                )}
                {restaurant?.allYouCanEat.enabled && cart.some(item => {
                  const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                  return menuItem && !menuItem.excludeFromAllYouCanEat
                }) && (
                  <div className="text-sm text-muted-foreground">
                    * Articoli inclusi nell'All You Can Eat
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCart(false)} className="flex-1">
                  Continua a ordinare
                </Button>
                <Button onClick={submitOrder} className="flex-1">
                  Invia ordine
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bill Dialog */}
      <Dialog open={showBill} onOpenChange={setShowBill}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conto - {table.name}</DialogTitle>
            <DialogDescription>
              Riepilogo ordini e totale
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {tableOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nessun ordine effettuato
              </p>
            ) : (
              <>
                {tableOrders.map(order => (
                  <div key={order.id} className="space-y-2">
                    <div className="text-sm font-medium">
                      Ordine #{order.id.slice(-4)} - {new Date(order.timestamp).toLocaleTimeString()}
                    </div>
                    {order.items.map(item => {
                      const menuItem = restaurantMenuItems.find(m => m.id === item.menuItemId)
                      if (!menuItem) return null
                      
                      return (
                        <div key={item.id} className="flex justify-between text-sm pl-4">
                          <span>{menuItem.name} x{item.quantity}</span>
                          <span>€{(menuItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  {restaurant?.allYouCanEat.enabled && table.customerCount ? (
                    <div className="flex justify-between">
                      <span>All You Can Eat ({table.customerCount} persone):</span>
                      <span>€{(restaurant.allYouCanEat.pricePerPerson * table.customerCount).toFixed(2)}</span>
                    </div>
                  ) : table.customerCount && restaurant?.coverChargePerPerson ? (
                    <div className="flex justify-between">
                      <span>Coperto ({table.customerCount} persone):</span>
                      <span>€{(restaurant.coverChargePerPerson * table.customerCount).toFixed(2)}</span>
                    </div>
                  ) : null}
                  
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Totale:</span>
                    <span>€{calculateBillTotal().toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Notes Dialog */}
      <Dialog open={showAddNotes !== null} onOpenChange={() => setShowAddNotes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Note</DialogTitle>
            <DialogDescription>
              Specifica eventuali richieste o modifiche per questo piatto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Note per il piatto</Label>
              <Textarea
                id="notes"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="es. senza cipolla, cottura al sangue..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAddNotes(null)}
                className="flex-1"
              >
                Annulla
              </Button>
              <Button 
                onClick={() => {
                  if (showAddNotes) {
                    updateItemNotes(showAddNotes, itemNotes)
                  }
                  setShowAddNotes(null)
                  setItemNotes('')
                }}
                className="flex-1"
              >
                Salva Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
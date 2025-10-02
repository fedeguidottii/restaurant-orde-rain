import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts'
import { Calendar, TrendUp, CurrencyEur, Users, ShoppingBag, Clock, ChartLine, CalendarBlank } from '@phosphor-icons/react'
import type { Order, OrderHistory, MenuItem, MenuCategory } from '../App'

interface AnalyticsChartsProps {
  orders: Order[]
  completedOrders: Order[]
  orderHistory: OrderHistory[]
  menuItems: MenuItem[]
  categories: MenuCategory[]
}

type DateFilter = 'today' | 'yesterday' | 'week' | '2weeks' | 'month' | '3months' | 'custom'

const dateFilters: { value: DateFilter, label: string }[] = [
  { value: 'today', label: 'Oggi' },
  { value: 'yesterday', label: 'Ieri' },
  { value: 'week', label: 'Ultima Settimana' },
  { value: '2weeks', label: 'Ultime 2 Settimane' },
  { value: 'month', label: 'Ultimo Mese' },
  { value: '3months', label: 'Ultimi 3 Mesi' },
  { value: 'custom', label: 'Personalizzato' }
]

const COLORS = ['#C9A152', '#8B7355', '#F4E6D1', '#E8C547', '#D4B366', '#A68B5B', '#F0D86F', '#C09853']

interface DailyData {
  date: string
  orders: number
  revenue: number
  averageValue: number
}

interface HourlyData {
  hour: string
  orders: number
  revenue: number
}

export default function AnalyticsCharts({ orders, completedOrders, orderHistory, menuItems, categories }: AnalyticsChartsProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('week')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Helper function to get date range
  const getDateRange = (filter: DateFilter) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    switch (filter) {
      case 'today':
        return { start: today.getTime(), end: now.getTime() }
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return { start: yesterday.getTime(), end: today.getTime() - 1 }
      case 'week':
        return { start: weekAgo.getTime(), end: now.getTime() }
      case '2weeks':
        const twoWeeksAgo = new Date(today)
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        return { start: twoWeeksAgo.getTime(), end: now.getTime() }
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return { start: monthAgo.getTime(), end: now.getTime() }
      case '3months':
        const threeMonthsAgo = new Date(today)
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
        return { start: threeMonthsAgo.getTime(), end: now.getTime() }
      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate)
          const endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
          return { start: startDate.getTime(), end: endDate.getTime() }
        }
        return { start: weekAgo.getTime(), end: now.getTime() } // Fallback to week
    }
  }

  const dateRange = getDateRange(dateFilter)
  const { start, end } = dateRange

  // Generate sample data for better analytics
  const generateSampleData = () => {
    const sampleOrderHistory: OrderHistory[] = []
    const now = Date.now()
    const threMonthsAgo = now - (90 * 24 * 60 * 60 * 1000)
    
    // Generate 100 sample orders over the last 3 months
    for (let i = 0; i < 100; i++) {
      const randomTime = threMonthsAgo + Math.random() * (now - threMonthsAgo)
      const randomItems = Math.floor(Math.random() * 4) + 1 // 1-4 items
      const items: Array<{
        menuItemId: string
        name: string
        quantity: number
        price: number
        notes?: string
      }> = []
      let total = 0
      
      for (let j = 0; j < randomItems; j++) {
        const randomMenuItem = menuItems[Math.floor(Math.random() * menuItems.length)]
        const quantity = Math.floor(Math.random() * 3) + 1
        items.push({
          menuItemId: randomMenuItem.id,
          name: randomMenuItem.name,
          quantity,
          price: randomMenuItem.price
        })
        total += randomMenuItem.price * quantity
      }
      
      sampleOrderHistory.push({
        id: `sample-${i}`,
        tableId: `table-${Math.floor(Math.random() * 5) + 1}`,
        tableName: `Tavolo ${Math.floor(Math.random() * 5) + 1}`,
        restaurantId: 'restaurant-1',
        items,
        total,
        timestamp: randomTime,
        paidAt: randomTime + (Math.random() * 30 * 60 * 1000), // 0-30 minutes later
        customerCount: Math.floor(Math.random() * 6) + 1
      })
    }
    
    return sampleOrderHistory
  }

  const sampleData = useMemo(() => generateSampleData(), [menuItems])
  const allOrderHistory = [...orderHistory, ...sampleData]

  // Filter data based on date range
  const filteredCompletedOrders = completedOrders.filter(order => 
    order.timestamp >= start && order.timestamp <= end
  )
  
  const filteredOrderHistory = allOrderHistory.filter(order => 
    order.paidAt >= start && order.paidAt <= end
  )

  const allFilteredOrders = [...filteredCompletedOrders, ...filteredOrderHistory]

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalOrders = allFilteredOrders.length
    const totalRevenue = allFilteredOrders.reduce((sum, order) => sum + order.total, 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const activeOrders = orders.length
    
    // Daily data for charts
    const dailyData: DailyData[] = []
    const days = Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)))
    
    for (let i = 0; i < days; i++) {
      const dayStart = start + (i * 24 * 60 * 60 * 1000)
      const dayEnd = dayStart + (24 * 60 * 60 * 1000)
      const dayOrders = allFilteredOrders.filter(order => {
        const orderTime = 'paidAt' in order ? order.paidAt : order.timestamp
        return orderTime >= dayStart && orderTime < dayEnd
      })
      
      const date = new Date(dayStart)
      dailyData.push({
        date: date.toLocaleDateString('it-IT', { month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + order.total, 0),
        averageValue: dayOrders.length > 0 ? dayOrders.reduce((sum, order) => sum + order.total, 0) / dayOrders.length : 0
      })
    }

    // Hourly data for today
    const hourlyData: HourlyData[] = []
    if (dateFilter === 'today') {
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date()
        hourStart.setHours(hour, 0, 0, 0)
        const hourEnd = new Date()
        hourEnd.setHours(hour, 59, 59, 999)
        
        const hourOrders = allFilteredOrders.filter(order => {
          const orderTime = 'paidAt' in order ? order.paidAt : order.timestamp
          return orderTime >= hourStart.getTime() && orderTime <= hourEnd.getTime()
        })
        
        hourlyData.push({
          hour: `${hour}:00`,
          orders: hourOrders.length,
          revenue: hourOrders.reduce((sum, order) => sum + order.total, 0)
        })
      }
    }

    // Category analysis
    const categoryStats = categories.map(category => {
      const categoryOrders = allFilteredOrders.flatMap(order => 
        order.items.filter(item => {
          const menuItem = menuItems.find(m => m.id === item.menuItemId)
          return menuItem?.category === category.name
        })
      )
      
      const totalQuantity = categoryOrders.reduce((sum, item) => sum + item.quantity, 0)
      const totalRevenue = categoryOrders.reduce((sum, item) => {
        const itemPrice = 'price' in item ? item.price : 
          menuItems.find(m => m.id === item.menuItemId)?.price || 0
        return sum + itemPrice * item.quantity
      }, 0)
      
      return {
        name: category.name,
        quantity: totalQuantity,
        revenue: totalRevenue,
        percentage: totalOrders > 0 ? (categoryOrders.length / totalOrders) * 100 : 0
      }
    }).filter(cat => cat.quantity > 0)

    // Most ordered dishes
    const dishStats = menuItems.map(dish => {
      const dishOrders = allFilteredOrders.flatMap(order => 
        order.items.filter(item => item.menuItemId === dish.id)
      )
      
      const totalQuantity = dishOrders.reduce((sum, item) => sum + item.quantity, 0)
      const totalRevenue = totalQuantity * dish.price
      
      return {
        name: dish.name,
        category: dish.category,
        quantity: totalQuantity,
        revenue: totalRevenue
      }
    }).filter(dish => dish.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      activeOrders,
      dailyData,
      hourlyData,
      categoryStats,
      dishStats
    }
  }, [allFilteredOrders, orders, categories, menuItems, dateFilter, start, end])

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-foreground">Analitiche Dettagliate</h2>
        <div className="flex items-center gap-4">
          <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFilters.map(filter => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {dateFilter === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarBlank size={16} />
                  Scegli Date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Data Inizio</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">Data Fine</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ordini Totali</p>
                <p className="text-2xl font-bold text-primary">{analytics.totalOrders}</p>
              </div>
              <ShoppingBag size={24} className="text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ricavi</p>
                <p className="text-2xl font-bold text-primary">€{analytics.totalRevenue.toFixed(2)}</p>
              </div>
              <CurrencyEur size={24} className="text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scontrino Medio</p>
                <p className="text-2xl font-bold text-primary">€{analytics.averageOrderValue.toFixed(2)}</p>
              </div>
              <TrendUp size={24} className="text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ordini in Corso</p>
                <p className="text-2xl font-bold text-primary">{analytics.activeOrders}</p>
              </div>
              <Clock size={24} className="text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Orders Trend Chart */}
        <Card className="shadow-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartLine size={20} />
              Andamento Ordini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="orders" stroke="#C9A152" fill="#C9A152" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend Chart */}
        <Card className="shadow-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrencyEur size={20} />
              Andamento Ricavi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Ricavi']} />
                <Area type="monotone" dataKey="revenue" stroke="#8B7355" fill="#8B7355" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Orders (Today only) */}
        {dateFilter === 'today' && (
          <Card className="shadow-professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Ordini per Ora (Oggi)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#C9A152" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Average Order Value */}
        <Card className="shadow-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendUp size={20} />
              Valore Medio Ordine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Valore Medio']} />
                <Line type="monotone" dataKey="averageValue" stroke="#D4B366" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartLine size={20} />
              Vendite per Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="quantity"
                >
                  {analytics.categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Revenue */}
        <Card className="shadow-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrencyEur size={20} />
              Ricavi per Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.categoryStats} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Ricavi']} />
                <Bar dataKey="revenue" fill="#C9A152" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Dishes */}
      <Card className="shadow-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Piatti Più Ordinati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.dishStats.map((dish, index) => (
              <div key={dish.name} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-semibold">{dish.name}</p>
                    <p className="text-sm text-muted-foreground">{dish.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{dish.quantity}x</p>
                  <p className="text-sm text-muted-foreground">€{dish.revenue.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {analytics.dishStats.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nessun dato disponibile per il periodo selezionato
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import LoginPage from './components/LoginPage'
import AdminDashboard from './components/AdminDashboard'
import RestaurantDashboard from './components/RestaurantDashboard'
import CustomerMenu from './components/CustomerMenu'
import { Toaster } from 'sonner'

export type UserRole = 'admin' | 'restaurant' | 'customer'

export interface User {
  id: string
  username: string
  role: UserRole
  restaurantId?: string
}

export type TableStatus = 'available' | 'waiting-order' | 'order-ready' | 'eating' | 'waiting-bill' | 'cleaning'

export interface Table {
  id: string
  name: string
  isActive: boolean
  pin: string
  qrCode: string
  restaurantId: string
  status: TableStatus
  currentOrderId?: string
  customerCount?: number
  reservationId?: string
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  isActive: boolean
  restaurantId: string
  image?: string
}

export interface MenuCategory {
  id: string
  name: string
  isActive: boolean
  restaurantId: string
  order: number
}

export interface Order {
  id: string
  tableId: string
  restaurantId: string
  items: Array<{
    id: string // Add unique ID for each dish
    menuItemId: string
    quantity: number
    notes?: string
    completedQuantity?: number // Track how many of this item are completed
  }>
  status: 'waiting' | 'preparing' | 'served' | 'completed'
  timestamp: number
  total: number
}

export interface OrderHistory {
  id: string
  tableId: string
  tableName: string
  restaurantId: string
  items: Array<{
    menuItemId: string
    name: string
    quantity: number
    price: number
    notes?: string
  }>
  total: number
  timestamp: number
  paidAt: number
  customerName?: string
  customerPhone?: string
  customerCount?: number
  reservationId?: string
}

export interface Restaurant {
  id: string
  name: string
  contact: string
  hours: string
  isActive: boolean
}

export interface Reservation {
  id: string
  customerName: string
  customerPhone: string
  tableId: string
  date: string
  time: string
  guests: number
  restaurantId: string
}

function App() {
  const [currentUser, setCurrentUser] = useKV<User | null>('currentUser', null)
  const [currentTable, setCurrentTable] = useKV<string | null>('currentTable', null)

  // Initialize default data
  const [users, setUsers] = useKV<User[]>('users', [])
  const [restaurants, setRestaurants] = useKV<Restaurant[]>('restaurants', [])
  const [menuCategories, setMenuCategories] = useKV<MenuCategory[]>('menuCategories', [])
  const [menuItems, setMenuItems] = useKV<MenuItem[]>('menuItems', [])
  const [tables, setTables] = useKV<Table[]>('tables', [])

  // Set up initial admin user and default restaurant
  useEffect(() => {
    if (!users || users.length === 0) {
      const adminUser: User = {
        id: 'admin-1',
        username: 'admin',
        role: 'admin'
      }
      
      const defaultRestaurant: Restaurant = {
        id: 'restaurant-1',
        name: 'Ristorante Demo',
        contact: 'demo@restaurant.com',
        hours: '12:00-23:00',
        isActive: true
      }
      
      const restaurantUser: User = {
        id: 'restaurant-user-1',
        username: 'demo',
        role: 'restaurant',
        restaurantId: 'restaurant-1'
      }

      // Create sample menu categories
      const sampleCategories: MenuCategory[] = [
        { id: 'cat-1', name: 'Antipasti', isActive: true, restaurantId: 'restaurant-1', order: 1 },
        { id: 'cat-2', name: 'Primi Piatti', isActive: true, restaurantId: 'restaurant-1', order: 2 },
        { id: 'cat-3', name: 'Secondi Piatti', isActive: true, restaurantId: 'restaurant-1', order: 3 },
        { id: 'cat-4', name: 'Dolci', isActive: true, restaurantId: 'restaurant-1', order: 4 },
        { id: 'cat-5', name: 'Bevande', isActive: true, restaurantId: 'restaurant-1', order: 5 }
      ]

      // Create sample menu items
      const sampleMenuItems: MenuItem[] = [
        {
          id: 'item-1',
          name: 'Bruschetta al Pomodoro',
          description: 'Pane tostato con pomodori freschi, basilico e olio extravergine',
          price: 8.50,
          category: 'Antipasti',
          isActive: true,
          restaurantId: 'restaurant-1',
          image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: 'item-2',
          name: 'Antipasto Misto',
          description: 'Selezione di salumi, formaggi e verdure marinate',
          price: 14.00,
          category: 'Antipasti',
          isActive: true,
          restaurantId: 'restaurant-1',
          image: 'https://images.unsplash.com/photo-1544124499-58912cbddaad?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: 'item-3',
          name: 'Spaghetti Carbonara',
          description: 'Spaghetti con uova, pecorino romano, guanciale e pepe nero',
          price: 12.00,
          category: 'Primi Piatti',
          isActive: true,
          restaurantId: 'restaurant-1',
          image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: 'item-4',
          name: 'Risotto ai Funghi Porcini',
          description: 'Risotto cremoso con funghi porcini e parmigiano',
          price: 16.00,
          category: 'Primi Piatti',
          isActive: true,
          restaurantId: 'restaurant-1',
          image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: 'item-5',
          name: 'Bistecca alla Fiorentina',
          description: 'Bistecca di manzo alla griglia (800g circa)',
          price: 45.00,
          category: 'Secondi Piatti',
          isActive: true,
          restaurantId: 'restaurant-1',
          image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: 'item-6',
          name: 'Branzino in Crosta di Sale',
          description: 'Branzino fresco cotto in crosta di sale con contorno',
          price: 24.00,
          category: 'Secondi Piatti',
          isActive: true,
          restaurantId: 'restaurant-1',
          image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: 'item-7',
          name: 'Tiramisù',
          description: 'Dolce tradizionale con mascarpone, caffè e cacao',
          price: 7.00,
          category: 'Dolci',
          isActive: true,
          restaurantId: 'restaurant-1',
          image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: 'item-8',
          name: 'Panna Cotta ai Frutti di Bosco',
          description: 'Dolce al cucchiaio con coulis di frutti di bosco',
          price: 6.50,
          category: 'Dolci',
          isActive: true,
          restaurantId: 'restaurant-1',
          image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop&crop=center'
        },
        {
          id: 'item-9',
          name: 'Vino Rosso della Casa',
          description: 'Bottiglia di vino rosso locale (750ml)',
          price: 18.00,
          category: 'Bevande',
          isActive: true,
          restaurantId: 'restaurant-1'
        },
        {
          id: 'item-10',
          name: 'Acqua Naturale',
          description: 'Bottiglia di acqua naturale (1L)',
          price: 3.00,
          category: 'Bevande',
          isActive: true,
          restaurantId: 'restaurant-1'
        }
      ]

      // Create sample tables
      const sampleTables: Table[] = [
        {
          id: 'table-1',
          name: 'Tavolo 1',
          isActive: true,
          pin: '1234',
          qrCode: 'QR-table-1',
          restaurantId: 'restaurant-1',
          status: 'available'
        },
        {
          id: 'table-2',
          name: 'Tavolo 2',
          isActive: true,
          pin: '5678',
          qrCode: 'QR-table-2',
          restaurantId: 'restaurant-1',
          status: 'waiting-order',
          customerCount: 2
        },
        {
          id: 'table-3',
          name: 'Tavolo 3',
          isActive: true,
          pin: '9012',
          qrCode: 'QR-table-3',
          restaurantId: 'restaurant-1',
          status: 'eating',
          customerCount: 4
        },
        {
          id: 'table-4',
          name: 'Tavolo 4',
          isActive: true,
          pin: '3456',
          qrCode: 'QR-table-4',
          restaurantId: 'restaurant-1',
          status: 'available'
        },
        {
          id: 'table-5',
          name: 'Tavolo VIP',
          isActive: true,
          pin: '7890',
          qrCode: 'QR-table-5',
          restaurantId: 'restaurant-1',
          status: 'available'
        }
      ]

      setUsers([adminUser, restaurantUser])
      setRestaurants([defaultRestaurant])
      setMenuCategories(sampleCategories)
      setMenuItems(sampleMenuItems)
      setTables(sampleTables)
    }
  }, [users, setUsers, setRestaurants, setMenuCategories, setMenuItems, setTables])

  // Initialize sample orders after menu items are loaded
  const [orders, setOrders] = useKV<Order[]>(`orders_restaurant-1`, [])
  const [reservations, setReservations] = useKV<Reservation[]>(`reservations_restaurant-1`, [])
  
  useEffect(() => {
    if (menuItems && menuItems.length > 0 && (!orders || orders.length === 0)) {
      const sampleOrders: Order[] = [
        {
          id: 'order-1',
          tableId: 'table-2',
          restaurantId: 'restaurant-1',
          items: [
            { id: 'item-1-1', menuItemId: 'item-1', quantity: 2, notes: 'Senza aglio', completedQuantity: 0 },
            { id: 'item-1-2', menuItemId: 'item-3', quantity: 1, completedQuantity: 0 },
            { id: 'item-1-3', menuItemId: 'item-9', quantity: 1, completedQuantity: 0 }
          ],
          status: 'preparing',
          timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
          total: 42.00
        },
        {
          id: 'order-2',
          tableId: 'table-3',
          restaurantId: 'restaurant-1',
          items: [
            { id: 'item-2-1', menuItemId: 'item-2', quantity: 1, completedQuantity: 0 },
            { id: 'item-2-2', menuItemId: 'item-4', quantity: 2, completedQuantity: 0 },
            { id: 'item-2-3', menuItemId: 'item-6', quantity: 1, completedQuantity: 0 },
            { id: 'item-2-4', menuItemId: 'item-10', quantity: 2, completedQuantity: 0 }
          ],
          status: 'waiting',
          timestamp: Date.now() - 8 * 60 * 1000, // 8 minutes ago
          total: 70.00
        },
        {
          id: 'order-3',
          tableId: 'table-5',
          restaurantId: 'restaurant-1',
          items: [
            { id: 'item-3-1', menuItemId: 'item-5', quantity: 1, notes: 'Cottura media', completedQuantity: 0 },
            { id: 'item-3-2', menuItemId: 'item-7', quantity: 2, completedQuantity: 0 },
            { id: 'item-3-3', menuItemId: 'item-9', quantity: 1, completedQuantity: 0 }
          ],
          status: 'preparing',
          timestamp: Date.now() - 22 * 60 * 1000, // 22 minutes ago
          total: 77.00
        }
      ]
      
      setOrders(sampleOrders)
    }
    
    // Add sample reservations
    if (tables && tables.length > 0 && (!reservations || reservations.length === 0)) {
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const sampleReservations: Reservation[] = [
        {
          id: 'res-1',
          customerName: 'Mario Rossi',
          customerPhone: '+39 333 1234567',
          tableId: 'table-1',
          date: today,
          time: '19:30',
          guests: 4,
          restaurantId: 'restaurant-1'
        },
        {
          id: 'res-2',
          customerName: 'Anna Bianchi',
          customerPhone: '+39 333 2345678',
          tableId: 'table-4',
          date: today,
          time: '20:00',
          guests: 2,
          restaurantId: 'restaurant-1'
        },
        {
          id: 'res-3',
          customerName: 'Famiglia Verdi',
          customerPhone: '+39 333 3456789',
          tableId: 'table-5',
          date: today,
          time: '21:00',
          guests: 6,
          restaurantId: 'restaurant-1'
        },
        {
          id: 'res-4',
          customerName: 'Luca Ferrari',
          customerPhone: '+39 333 4567890',
          tableId: 'table-2',
          date: tomorrow,
          time: '19:00',
          guests: 3,
          restaurantId: 'restaurant-1'
        }
      ]
      
      setReservations(sampleReservations)
    }
  }, [menuItems, orders, setOrders, tables, reservations, setReservations])

  const handleLogin = (user: User) => {
    setCurrentUser(user)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setCurrentTable(null)
  }

  const handleTableAccess = (tableId: string) => {
    setCurrentTable(tableId)
    setCurrentUser({ id: 'customer', username: 'Customer', role: 'customer' })
  }

  if (!currentUser) {
    return (
      <>
        <LoginPage onLogin={handleLogin} onTableAccess={handleTableAccess} />
        <Toaster position="top-center" />
      </>
    )
  }

  return (
    <>
      {currentUser.role === 'admin' && (
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      )}
      {currentUser.role === 'restaurant' && (
        <RestaurantDashboard user={currentUser} onLogout={handleLogout} />
      )}
      {currentUser.role === 'customer' && currentTable && (
        <CustomerMenu tableId={currentTable} onExit={handleLogout} />
      )}
      <Toaster position="top-center" />
    </>
  )
}

export default App
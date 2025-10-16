import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import LoginPage from './components/LoginPage'
import AdminDashboard from './components/AdminDashboard'
import RestaurantDashboard from './components/RestaurantDashboard'
import CustomerMenu from './components/CustomerMenu'
import CustomerOrderPage from './components/CustomerOrderPage'
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
  remainingOrders?: number
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
  excludeFromAllYouCanEat?: boolean
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
    excludedFromAllYouCanEat?: boolean // Track if this item is excluded
  }>
  status: 'waiting' | 'preparing' | 'served' | 'completed'
  timestamp: number
  total: number
  coverCharge?: number
  allYouCanEatCharge?: number
  remainingOrders?: number // For all you can eat mode
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
  coverChargePerPerson: number
  allYouCanEat: {
    enabled: boolean
    pricePerPerson: number
    maxOrders: number
  }
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

  // Check URL parameters for QR code table access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tableParam = urlParams.get('table')
    
    if (tableParam && !currentUser) {
      // QR code access - go directly to customer order page
      setCurrentTable(tableParam)
      setCurrentUser({ id: 'customer', username: 'Customer', role: 'customer' })
      // Clean URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [currentUser, setCurrentTable, setCurrentUser])

  // Initialize default data
  const [users, setUsers] = useKV<User[]>('users', [])
  const [restaurants, setRestaurants] = useKV<Restaurant[]>('restaurants', [])
  const [menuCategories, setMenuCategories] = useKV<MenuCategory[]>('menuCategories', [])
  const [menuItems, setMenuItems] = useKV<MenuItem[]>('menuItems', [])
  const [tables, setTables] = useKV<Table[]>('tables', [])

  // Set up initial admin user and default restaurant (no sample data)
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
        isActive: true,
        coverChargePerPerson: 2.00,
        allYouCanEat: {
          enabled: false,
          pricePerPerson: 25.00,
          maxOrders: 3
        }
      }
      
      const restaurantUser: User = {
        id: 'restaurant-user-1',
        username: 'demo',
        role: 'restaurant',
        restaurantId: 'restaurant-1'
      }

      setUsers([adminUser, restaurantUser])
      setRestaurants([defaultRestaurant])
      setMenuCategories([])
      setMenuItems([])
      setTables([])
    }
  }, [users, setUsers, setRestaurants, setMenuCategories, setMenuItems, setTables])

  // Initialize empty data - NO SAMPLE DATA
  const [orders, setOrders] = useKV<Order[]>(`orders_restaurant-1`, [])
  const [reservations, setReservations] = useKV<Reservation[]>(`reservations_restaurant-1`, [])

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
        <CustomerOrderPage tableId={currentTable} onExit={handleLogout} />
      )}
      <Toaster position="top-center" />
    </>
  )
}

export default App
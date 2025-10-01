import { useState } from 'react'
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
}

export interface Order {
  id: string
  tableId: string
  restaurantId: string
  items: Array<{
    menuItemId: string
    quantity: number
    notes?: string
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
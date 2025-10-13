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

  // Set up initial admin user and default restaurant with sample data
  useEffect(() => {
    if (!users || users.length === 0) {
      const adminUser: User = {
        id: 'admin-1',
        username: 'admin',
        role: 'admin'
      }
      
      const defaultRestaurant: Restaurant = {
        id: 'restaurant-1',
        name: 'Osteria del Borgo',
        contact: 'info@osteriadelborgo.it | +39 011 123 4567',
        hours: '12:00-14:30, 19:00-23:00',
        isActive: true,
        coverChargePerPerson: 3.50,
        allYouCanEat: {
          enabled: true,
          pricePerPerson: 28.00,
          maxOrders: 4
        }
      }
      
      const restaurantUser: User = {
        id: 'restaurant-user-1',
        username: 'osteria',
        role: 'restaurant',
        restaurantId: 'restaurant-1'
      }

      // Additional test restaurant and user
      const testRestaurant: Restaurant = {
        id: 'restaurant-2',
        name: 'Pizzeria Da Mario',
        contact: 'mario@pizzeriadamario.it | +39 011 987 6543',
        hours: '18:00-24:00',
        isActive: true,
        coverChargePerPerson: 2.00,
        allYouCanEat: {
          enabled: false,
          pricePerPerson: 20.00,
          maxOrders: 2
        }
      }

      const testRestaurantUser: User = {
        id: 'restaurant-user-2',
        username: 'mario',
        role: 'restaurant',
        restaurantId: 'restaurant-2'
      }

      // Sample menu categories
      const sampleCategories: MenuCategory[] = [
        { id: 'cat-1', name: 'Antipasti', isActive: true, restaurantId: 'restaurant-1', order: 1 },
        { id: 'cat-2', name: 'Primi Piatti', isActive: true, restaurantId: 'restaurant-1', order: 2 },
        { id: 'cat-3', name: 'Secondi Piatti', isActive: true, restaurantId: 'restaurant-1', order: 3 },
        { id: 'cat-4', name: 'Contorni', isActive: true, restaurantId: 'restaurant-1', order: 4 },
        { id: 'cat-5', name: 'Dolci', isActive: true, restaurantId: 'restaurant-1', order: 5 },
        { id: 'cat-6', name: 'Bevande', isActive: true, restaurantId: 'restaurant-1', order: 6 },
        // Categories for second restaurant
        { id: 'cat-7', name: 'Pizze Rosse', isActive: true, restaurantId: 'restaurant-2', order: 1 },
        { id: 'cat-8', name: 'Pizze Bianche', isActive: true, restaurantId: 'restaurant-2', order: 2 },
        { id: 'cat-9', name: 'Antipasti', isActive: true, restaurantId: 'restaurant-2', order: 3 },
        { id: 'cat-10', name: 'Bevande', isActive: true, restaurantId: 'restaurant-2', order: 4 }
      ]

      // Sample menu items
      const sampleMenuItems: MenuItem[] = [
        // Antipasti
        { id: 'item-1', name: 'Bruschetta alla Pugliese', description: 'Pane tostato con pomodorini freschi, basilico e olio EVO', price: 8.50, category: 'Antipasti', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-2', name: 'Tagliere di Salumi e Formaggi', description: 'Selezione di salumi locali e formaggi stagionati', price: 16.00, category: 'Antipasti', isActive: true, restaurantId: 'restaurant-1', excludeFromAllYouCanEat: true },
        { id: 'item-3', name: 'Antipasto della Casa', description: 'Mix di specialità tradizionali piemontesi', price: 12.00, category: 'Antipasti', isActive: true, restaurantId: 'restaurant-1' },
        
        // Primi Piatti
        { id: 'item-4', name: 'Spaghetti Carbonara', description: 'Pasta con guanciale, uova, pecorino e pepe nero', price: 14.50, category: 'Primi Piatti', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-5', name: 'Risotto ai Porcini', description: 'Risotto cremoso con funghi porcini e grana padano', price: 16.50, category: 'Primi Piatti', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-6', name: 'Tajarin al Tartufo', description: 'Pasta fresca all\'uovo con tartufo bianco d\'Alba', price: 24.00, category: 'Primi Piatti', isActive: true, restaurantId: 'restaurant-1', excludeFromAllYouCanEat: true },
        { id: 'item-7', name: 'Gnocchi al Pomodoro e Basilico', description: 'Gnocchi di patate con salsa di pomodoro fresco', price: 13.00, category: 'Primi Piatti', isActive: true, restaurantId: 'restaurant-1' },
        
        // Secondi Piatti
        { id: 'item-8', name: 'Brasato al Barolo', description: 'Manzo brasato nel vino Barolo con purè di patate', price: 22.00, category: 'Secondi Piatti', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-9', name: 'Scaloppine al Limone', description: 'Fettine di vitello con salsa al limone', price: 18.50, category: 'Secondi Piatti', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-10', name: 'Branzino in Crosta di Sale', description: 'Pesce fresco cotto in crosta di sale grosso', price: 25.00, category: 'Secondi Piatti', isActive: true, restaurantId: 'restaurant-1', excludeFromAllYouCanEat: true },
        { id: 'item-11', name: 'Pollo alle Erbe', description: 'Petto di pollo grigliato con erbe aromatiche', price: 16.00, category: 'Secondi Piatti', isActive: true, restaurantId: 'restaurant-1' },
        
        // Contorni
        { id: 'item-12', name: 'Verdure Grigliate', description: 'Mix di verdure di stagione grigliate', price: 7.50, category: 'Contorni', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-13', name: 'Patate al Rosmarino', description: 'Patate arrosto con rosmarino e aglio', price: 6.00, category: 'Contorni', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-14', name: 'Spinaci Saltati', description: 'Spinaci freschi saltati in padella', price: 5.50, category: 'Contorni', isActive: true, restaurantId: 'restaurant-1' },
        
        // Dolci
        { id: 'item-15', name: 'Tiramisù della Casa', description: 'Tiramisù preparato secondo la ricetta tradizionale', price: 7.00, category: 'Dolci', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-16', name: 'Panna Cotta ai Frutti di Bosco', description: 'Dessert al cucchiaio con salsa ai frutti rossi', price: 6.50, category: 'Dolci', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-17', name: 'Gelato Artigianale', description: 'Tre palline di gelato artigianale (gusti a scelta)', price: 5.50, category: 'Dolci', isActive: true, restaurantId: 'restaurant-1' },
        
        // Bevande
        { id: 'item-18', name: 'Acqua Naturale/Frizzante', description: 'Bottiglia da 75cl', price: 2.50, category: 'Bevande', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-19', name: 'Vino della Casa (Bicchiere)', description: 'Rosso o bianco del territorio', price: 4.50, category: 'Bevande', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-20', name: 'Birra Artigianale', description: 'Birra locale alla spina (33cl)', price: 5.50, category: 'Bevande', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-21', name: 'Coca Cola/Aranciata', description: 'Bibita in lattina', price: 3.50, category: 'Bevande', isActive: true, restaurantId: 'restaurant-1' },
        { id: 'item-22', name: 'Caffè Espresso', description: 'Caffè della tradizione italiana', price: 1.50, category: 'Bevande', isActive: true, restaurantId: 'restaurant-1' },
        
        // Items for Pizzeria Da Mario (restaurant-2)
        // Pizze Rosse
        { id: 'pizza-1', name: 'Margherita', description: 'Pomodoro, mozzarella, basilico', price: 7.50, category: 'Pizze Rosse', isActive: true, restaurantId: 'restaurant-2' },
        { id: 'pizza-2', name: 'Marinara', description: 'Pomodoro, aglio, origano, olio EVO', price: 6.50, category: 'Pizze Rosse', isActive: true, restaurantId: 'restaurant-2' },
        { id: 'pizza-3', name: 'Diavola', description: 'Pomodoro, mozzarella, salame piccante', price: 9.00, category: 'Pizze Rosse', isActive: true, restaurantId: 'restaurant-2' },
        { id: 'pizza-4', name: 'Capricciosa', description: 'Pomodoro, mozzarella, prosciutto, funghi, carciofi, olive', price: 10.50, category: 'Pizze Rosse', isActive: true, restaurantId: 'restaurant-2' },
        { id: 'pizza-5', name: 'Quattro Stagioni', description: 'Pomodoro, mozzarella, prosciutto, funghi, carciofi, olive divise in quattro', price: 11.00, category: 'Pizze Rosse', isActive: true, restaurantId: 'restaurant-2' },
        
        // Pizze Bianche
        { id: 'pizza-6', name: 'Quattro Formaggi', description: 'Mozzarella, gorgonzola, parmigiano, fontina', price: 10.00, category: 'Pizze Bianche', isActive: true, restaurantId: 'restaurant-2' },
        { id: 'pizza-7', name: 'Prosciutto e Funghi', description: 'Mozzarella, prosciutto cotto, funghi champignon', price: 9.50, category: 'Pizze Bianche', isActive: true, restaurantId: 'restaurant-2' },
        { id: 'pizza-8', name: 'Bresaola e Rucola', description: 'Mozzarella, bresaola, rucola, grana, pomodorini', price: 12.00, category: 'Pizze Bianche', isActive: true, restaurantId: 'restaurant-2' },
        
        // Antipasti Pizzeria
        { id: 'pizza-ant-1', name: 'Focaccia', description: 'Focaccia semplice con rosmarino', price: 4.50, category: 'Antipasti', isActive: true, restaurantId: 'restaurant-2' },
        { id: 'pizza-ant-2', name: 'Supplì', description: 'Supplì al telefono (3 pezzi)', price: 6.00, category: 'Antipasti', isActive: true, restaurantId: 'restaurant-2' },
        
        // Bevande Pizzeria
        { id: 'pizza-bev-1', name: 'Coca Cola', description: 'Lattina 33cl', price: 3.00, category: 'Bevande', isActive: true, restaurantId: 'restaurant-2' },
        { id: 'pizza-bev-2', name: 'Birra Moretti', description: 'Bottiglia 66cl', price: 4.50, category: 'Bevande', isActive: true, restaurantId: 'restaurant-2' },
        { id: 'pizza-bev-3', name: 'Acqua', description: 'Bottiglia 50cl', price: 2.00, category: 'Bevande', isActive: true, restaurantId: 'restaurant-2' }
      ]

      // Sample tables
      const sampleTables: Table[] = [
        { id: 'table-1', name: 'Tavolo 1', isActive: true, pin: '1234', qrCode: 'QR-T1-001', restaurantId: 'restaurant-1', status: 'eating', currentOrderId: 'order-1', customerCount: 2 },
        { id: 'table-2', name: 'Tavolo 2', isActive: true, pin: '2345', qrCode: 'QR-T2-002', restaurantId: 'restaurant-1', status: 'order-ready', currentOrderId: 'order-2', customerCount: 4 },
        { id: 'table-3', name: 'Tavolo 3', isActive: true, pin: '3456', qrCode: 'QR-T3-003', restaurantId: 'restaurant-1', status: 'waiting-order' },
        { id: 'table-4', name: 'Tavolo 4', isActive: true, pin: '4567', qrCode: 'QR-T4-004', restaurantId: 'restaurant-1', status: 'available' },
        { id: 'table-5', name: 'Tavolo 5', isActive: true, pin: '5678', qrCode: 'QR-T5-005', restaurantId: 'restaurant-1', status: 'waiting-bill', currentOrderId: 'order-3', customerCount: 3 },
        { id: 'table-6', name: 'Tavolo 6', isActive: true, pin: '6789', qrCode: 'QR-T6-006', restaurantId: 'restaurant-1', status: 'cleaning' },
        { id: 'table-7', name: 'Tavolo 7', isActive: true, pin: '7890', qrCode: 'QR-T7-007', restaurantId: 'restaurant-1', status: 'waiting-order', currentOrderId: 'order-4', customerCount: 2 },
        { id: 'table-8', name: 'Tavolo 8', isActive: true, pin: '8901', qrCode: 'QR-T8-008', restaurantId: 'restaurant-1', status: 'available' },
        
        // Tables for Pizzeria Da Mario
        { id: 'table-p1', name: 'Tavolo 1', isActive: true, pin: '1111', qrCode: 'QR-P1-001', restaurantId: 'restaurant-2', status: 'available' },
        { id: 'table-p2', name: 'Tavolo 2', isActive: true, pin: '2222', qrCode: 'QR-P2-002', restaurantId: 'restaurant-2', status: 'eating', customerCount: 2 },
        { id: 'table-p3', name: 'Tavolo 3', isActive: true, pin: '3333', qrCode: 'QR-P3-003', restaurantId: 'restaurant-2', status: 'available' },
        { id: 'table-p4', name: 'Tavolo 4', isActive: true, pin: '4444', qrCode: 'QR-P4-004', restaurantId: 'restaurant-2', status: 'waiting-order' }
      ]

      setUsers([adminUser, restaurantUser, testRestaurantUser])
      setRestaurants([defaultRestaurant, testRestaurant])
      setMenuCategories(sampleCategories)
      setMenuItems(sampleMenuItems)
      setTables(sampleTables)
    }
  }, [users, setUsers, setRestaurants, setMenuCategories, setMenuItems, setTables])

  // Initialize sample data for orders and reservations
  const [orders, setOrders] = useKV<Order[]>(`orders_restaurant-1`, [])
  const [reservations, setReservations] = useKV<Reservation[]>(`reservations_restaurant-1`, [])
  const [orderHistory, setOrderHistory] = useKV<OrderHistory[]>(`orderHistory_restaurant-1`, [])

  // Add sample orders and reservations
  useEffect(() => {
    if ((orders?.length ?? 0) === 0 && (users?.length ?? 0) > 0) {
      const sampleOrders: Order[] = [
        {
          id: 'order-1',
          tableId: 'table-1',
          restaurantId: 'restaurant-1',
          items: [
            { id: 'dish-1', menuItemId: 'item-1', quantity: 2, notes: 'Poco aglio' },
            { id: 'dish-2', menuItemId: 'item-4', quantity: 1 },
            { id: 'dish-3', menuItemId: 'item-12', quantity: 1 }
          ],
          status: 'served',
          timestamp: Date.now() - 1800000, // 30 minutes ago
          total: 30.50,
          coverCharge: 7.00,
          allYouCanEatCharge: 56.00,
          remainingOrders: 2
        },
        {
          id: 'order-2',
          tableId: 'table-2',
          restaurantId: 'restaurant-1',
          items: [
            { id: 'dish-4', menuItemId: 'item-3', quantity: 1 },
            { id: 'dish-5', menuItemId: 'item-5', quantity: 2, completedQuantity: 2 },
            { id: 'dish-6', menuItemId: 'item-8', quantity: 2, completedQuantity: 1 },
            { id: 'dish-7', menuItemId: 'item-13', quantity: 2 }
          ],
          status: 'preparing',
          timestamp: Date.now() - 900000, // 15 minutes ago
          total: 89.00,
          coverCharge: 14.00,
          allYouCanEatCharge: 112.00,
          remainingOrders: 1
        },
        {
          id: 'order-3',
          tableId: 'table-5',
          restaurantId: 'restaurant-1',
          items: [
            { id: 'dish-8', menuItemId: 'item-6', quantity: 1, excludedFromAllYouCanEat: true },
            { id: 'dish-9', menuItemId: 'item-9', quantity: 1, completedQuantity: 1 },
            { id: 'dish-10', menuItemId: 'item-15', quantity: 2, completedQuantity: 2 },
            { id: 'dish-11', menuItemId: 'item-19', quantity: 2, completedQuantity: 2 }
          ],
          status: 'served',
          timestamp: Date.now() - 3600000, // 1 hour ago
          total: 40.50,
          coverCharge: 10.50,
          allYouCanEatCharge: 84.00
        },
        {
          id: 'order-4',
          tableId: 'table-7',
          restaurantId: 'restaurant-1',
          items: [
            { id: 'dish-12', menuItemId: 'item-2', quantity: 1, excludedFromAllYouCanEat: true },
            { id: 'dish-13', menuItemId: 'item-20', quantity: 2 }
          ],
          status: 'waiting',
          timestamp: Date.now() - 300000, // 5 minutes ago
          total: 27.00,
          coverCharge: 7.00,
          allYouCanEatCharge: 56.00,
          remainingOrders: 3
        }
      ]

      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dayAfter = new Date(today)
      dayAfter.setDate(dayAfter.getDate() + 2)

      const sampleReservations: Reservation[] = [
        {
          id: 'res-1',
          customerName: 'Marco Rossi',
          customerPhone: '+39 333 123 4567',
          tableId: 'table-3',
          date: today.toISOString().split('T')[0],
          time: '20:00',
          guests: 4,
          restaurantId: 'restaurant-1'
        },
        {
          id: 'res-2',
          customerName: 'Giulia Bianchi',
          customerPhone: '+39 339 987 6543',
          tableId: 'table-4',
          date: today.toISOString().split('T')[0],
          time: '20:30',
          guests: 2,
          restaurantId: 'restaurant-1'
        },
        {
          id: 'res-3',
          customerName: 'Francesco Verdi',
          customerPhone: '+39 347 555 1234',
          tableId: 'table-1',
          date: tomorrow.toISOString().split('T')[0],
          time: '19:30',
          guests: 6,
          restaurantId: 'restaurant-1'
        },
        {
          id: 'res-4',
          customerName: 'Anna Neri',
          customerPhone: '+39 338 444 5678',
          tableId: 'table-2',
          date: tomorrow.toISOString().split('T')[0],
          time: '21:00',
          guests: 3,
          restaurantId: 'restaurant-1'
        },
        {
          id: 'res-5',
          customerName: 'Luca Ferrari',
          customerPhone: '+39 345 777 8899',
          tableId: 'table-5',
          date: dayAfter.toISOString().split('T')[0],
          time: '19:00',
          guests: 2,
          restaurantId: 'restaurant-1'
        }
      ]

      // Sample order history (completed orders)
      const sampleOrderHistory: OrderHistory[] = [
        {
          id: 'hist-1',
          tableId: 'table-1',
          tableName: 'Tavolo 1',
          restaurantId: 'restaurant-1',
          items: [
            { menuItemId: 'item-4', name: 'Spaghetti Carbonara', quantity: 2, price: 14.50 },
            { menuItemId: 'item-8', name: 'Brasato al Barolo', quantity: 1, price: 22.00 },
            { menuItemId: 'item-15', name: 'Tiramisù della Casa', quantity: 2, price: 7.00 },
            { menuItemId: 'item-19', name: 'Vino della Casa (Bicchiere)', quantity: 3, price: 4.50 }
          ],
          total: 79.50,
          timestamp: Date.now() - 86400000, // Yesterday
          paidAt: Date.now() - 86000000,
          customerName: 'Roberto Allegri',
          customerPhone: '+39 340 123 4567',
          customerCount: 3
        },
        {
          id: 'hist-2',
          tableId: 'table-2',
          tableName: 'Tavolo 2',
          restaurantId: 'restaurant-1',
          items: [
            { menuItemId: 'item-1', name: 'Bruschetta alla Pugliese', quantity: 1, price: 8.50 },
            { menuItemId: 'item-5', name: 'Risotto ai Porcini', quantity: 1, price: 16.50 },
            { menuItemId: 'item-16', name: 'Panna Cotta ai Frutti di Bosco', quantity: 1, price: 6.50 }
          ],
          total: 35.00,
          timestamp: Date.now() - 172800000, // 2 days ago
          paidAt: Date.now() - 172200000,
          customerName: 'Sofia Colombo',
          customerCount: 2
        },
        {
          id: 'hist-3',
          tableId: 'table-4',
          tableName: 'Tavolo 4',
          restaurantId: 'restaurant-1',
          items: [
            { menuItemId: 'item-2', name: 'Tagliere di Salumi e Formaggi', quantity: 1, price: 16.00 },
            { menuItemId: 'item-6', name: 'Tajarin al Tartufo', quantity: 2, price: 24.00 },
            { menuItemId: 'item-10', name: 'Branzino in Crosta di Sale', quantity: 1, price: 25.00 }
          ],
          total: 89.00,
          timestamp: Date.now() - 259200000, // 3 days ago
          paidAt: Date.now() - 258600000,
          customerName: 'Michele Conti',
          customerPhone: '+39 346 987 1234',
          customerCount: 4
        }
      ]

      setOrders(sampleOrders)
      setReservations(sampleReservations)
      setOrderHistory(sampleOrderHistory)
    }
  }, [orders, users, setOrders, setReservations, setOrderHistory])

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
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { User, Table } from '../App'
import { QrCode, Users, Crown } from '@phosphor-icons/react'

interface Props {
  onLogin: (user: User) => void
  onTableAccess: (tableId: string) => void
}

export default function LoginPage({ onLogin, onTableAccess }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [tableCode, setTableCode] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const [users] = useKV<User[]>('users', [])
  const [tables] = useKV<Table[]>('tables', [])

  // Check for QR code parameters in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tableId = urlParams.get('table')
    const tablePIN = urlParams.get('pin')
    if (tableId) {
      setTableCode(tableId)
      if (tablePIN) {
        setPin(tablePIN)
      }
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    
    // Try admin login first
    const adminUser = (users || []).find(u => u.username === username && u.role === 'admin')
    if (adminUser && password === 'admin123') {
      onLogin(adminUser)
      toast.success('Accesso amministratore effettuato')
      setLoading(false)
      return
    }
    
    // Try restaurant login
    const restaurantUser = (users || []).find(u => u.username === username && u.role === 'restaurant')
    if (restaurantUser && password === 'restaurant123') {
      onLogin(restaurantUser)
      toast.success('Accesso ristorante effettuato')
      setLoading(false)
      return
    }
    
    // Try waiter login (could be added later)
    
    toast.error('Credenziali non valide')
    setLoading(false)
  }

  const handleTableAccess = async () => {
    setLoading(true)
    
    const table = (tables || []).find(t => t.id === tableCode && t.isActive)
    if (table && table.pin === pin) {
      onTableAccess(table.id)
      toast.success(`Accesso al tavolo ${table.name} effettuato`)
    } else {
      toast.error('Codice tavolo o PIN non validi')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-liquid-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-liquid-lg">
            <Users weight="bold" size={32} className="text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Restaurant Manager</h1>
          <p className="text-muted-foreground">Sistema di gestione ordini per ristoranti</p>
        </div>

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 shadow-liquid bg-order-card">
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <QrCode size={16} />
              Cliente
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Crown size={16} />
              Staff
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <Card className="shadow-liquid-lg bg-order-card border-liquid">
              <CardHeader>
                <CardTitle className="text-xl">Accesso Cliente</CardTitle>
                <CardDescription>
                  Scansiona il QR code del tavolo o inserisci i dati manualmente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tableCode">Codice Tavolo</Label>
                  <Input
                    id="tableCode"
                    value={tableCode}
                    onChange={(e) => setTableCode(e.target.value)}
                    placeholder="table-xxxxx"
                    className="shadow-liquid"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN Temporaneo</Label>
                  <Input
                    id="pin"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN a 4 cifre"
                    className="shadow-liquid text-center text-xl font-bold"
                    maxLength={4}
                  />
                </div>
                <Button 
                  onClick={handleTableAccess} 
                  disabled={loading || !tableCode || !pin}
                  className="w-full bg-liquid-gradient shadow-liquid-lg hover:shadow-[0_12px_48px_-12px_rgba(201,161,82,0.5)] transition-all duration-300 text-lg font-bold py-3"
                >
                  {loading ? 'Accesso in corso...' : 'Accedi al Menù'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card className="shadow-liquid-lg bg-order-card border-liquid">
              <CardHeader>
                <CardTitle className="text-xl">Accesso Staff</CardTitle>
                <CardDescription>
                  Accedi come amministratore o gestore del ristorante
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome Utente</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin o nome ristorante"
                    className="shadow-liquid"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="shadow-liquid"
                  />
                </div>
                <Button 
                  onClick={handleLogin} 
                  disabled={loading || !username || !password}
                  className="w-full bg-liquid-gradient shadow-liquid-lg hover:shadow-[0_12px_48px_-12px_rgba(201,161,82,0.5)] transition-all duration-300 text-lg font-bold py-3"
                >
                  {loading ? 'Accesso in corso...' : 'Accedi'}
                </Button>
                
                <div className="text-center pt-4 border-t">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>
                      <Badge variant="outline" className="mr-2">Admin</Badge>
                      Username: admin | Password: admin123
                    </div>
                    <div>
                      <Badge variant="outline" className="mr-2">Ristorante</Badge>
                      Usa il nome del tuo ristorante | Password: restaurant123
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
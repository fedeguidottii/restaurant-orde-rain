import { useState } from 'react'
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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users weight="bold" size={32} className="text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Restaurant Manager</h1>
          <p className="text-muted-foreground">Sistema di gestione ordini per ristoranti</p>
        </div>

        <Tabs defaultValue="staff" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Crown size={16} />
              Staff
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <QrCode size={16} />
              Cliente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle>Accesso Staff</CardTitle>
                <CardDescription>
                  Accedi come amministratore o gestore ristorante
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nome utente</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Inserisci nome utente"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Inserisci password"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleLogin}
                    disabled={loading || !username || !password}
                    className="w-full"
                  >
                    Accedi
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center mb-2">Credenziali demo:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline" className="text-xs">admin / admin123</Badge>
                    <Badge variant="outline" className="text-xs">restaurant / restaurant123</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customer">
            <Card>
              <CardHeader>
                <CardTitle>Accesso Cliente</CardTitle>
                <CardDescription>
                  Scansiona il QR del tavolo e inserisci il PIN
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tableCode">Codice Tavolo</Label>
                    <Input
                      id="tableCode"
                      value={tableCode}
                      onChange={(e) => setTableCode(e.target.value)}
                      placeholder="Es: table-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin">PIN Tavolo</Label>
                    <Input
                      id="pin"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Inserisci PIN a 4 cifre"
                      maxLength={4}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleTableAccess}
                  disabled={loading || !tableCode || !pin}
                  className="w-full"
                >
                  Accedi al Menù
                </Button>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Il PIN ti viene fornito dal personale del ristorante
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
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
  customerMode?: boolean
  presetTableId?: string
}

export default function LoginPage({ onLogin, onTableAccess, customerMode = false, presetTableId = '' }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [tableCode, setTableCode] = useState(presetTableId)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const [users] = useKV<User[]>('users', [])
  const [tables] = useKV<Table[]>('tables', [])

  useEffect(() => {
    if (presetTableId) {
      setTableCode(presetTableId)
    }
  }, [presetTableId])

  const handleLogin = async () => {
    setLoading(true)
    
    const adminUser = (users || []).find(u => u.username === username && u.role === 'admin')
    if (adminUser && password === 'admin123') {
      onLogin(adminUser)
      toast.success('Accesso amministratore effettuato')
      setLoading(false)
      return
    }
    
    const restaurantUser = (users || []).find(u => u.username === username && u.role === 'restaurant')
    if (restaurantUser && password === 'restaurant123') {
      onLogin(restaurantUser)
      toast.success('Accesso ristorante effettuato')
      setLoading(false)
      return
    }
    
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
        {customerMode ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-liquid-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-liquid-lg">
                <QrCode weight="bold" size={32} className="text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Benvenuto!</h1>
              <p className="text-muted-foreground">Inserisci il PIN del tavolo per accedere al menù</p>
            </div>

            <Card className="shadow-liquid-lg bg-order-card border-liquid">
              <CardHeader>
                <CardTitle className="text-xl">Accesso al Tavolo</CardTitle>
                <CardDescription>
                  Inserisci il PIN fornito dal cameriere
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN Temporaneo</Label>
                  <Input
                    id="pin"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="PIN a 4 cifre"
                    maxLength={4}
                    className="shadow-liquid text-center text-2xl font-bold tracking-widest"
                  />
                </div>
                <Button 
                  onClick={handleTableAccess}
                  disabled={loading || !pin}
                  className="w-full bg-liquid-gradient shadow-liquid-lg hover:shadow-[0_12px_48px_-12px_rgba(201,161,82,0.5)] transition-all duration-300 text-lg font-bold py-6"
                >
                  {loading ? 'Accesso in corso...' : 'Accedi al Menù'}
                </Button>

                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    Come funziona:
                  </p>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">1</div>
                      <span>Scansiona il QR code sul tavolo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">2</div>
                      <span>Inserisci il PIN temporaneo fornito</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">3</div>
                      <span>Ordina direttamente dal tuo dispositivo</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-liquid-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-liquid-lg">
                <Users weight="bold" size={32} className="text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Sistema Gestione Ristorante</h1>
              <p className="text-muted-foreground">Accedi al sistema</p>
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
                      <Label htmlFor="pin-manual">PIN Temporaneo</Label>
                      <Input
                        id="pin-manual"
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
                    
                    <div className="text-center pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-3">
                        Come funziona:
                      </p>
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">1</div>
                          <span>Scansiona il QR code sul tavolo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">2</div>
                          <span>Inserisci il PIN temporaneo fornito dal cameriere</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">3</div>
                          <span>Ordina direttamente dal tuo dispositivo</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="staff">
                <Card className="shadow-liquid-lg bg-order-card border-liquid">
                  <CardHeader>
                    <CardTitle className="text-xl">Accesso Staff</CardTitle>
                    <CardDescription>
                      Accesso per amministratori e gestori del ristorante
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
                          Username: demo | Password: restaurant123
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { User } from '../App'
import { Users } from '@phosphor-icons/react'

interface Props {
  onLogin: (user: User) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const [users] = useKV<User[]>('users', [])

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
    
    toast.error('Credenziali non valide')
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
                placeholder="admin, osteria, o mario"
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
                  Username: <strong>admin</strong> | Password: <strong>admin123</strong>
                </div>
                <div>
                  <Badge variant="outline" className="mr-2">Osteria del Borgo</Badge>
                  Username: <strong>osteria</strong> | Password: <strong>restaurant123</strong>
                </div>
                <div>
                  <Badge variant="outline" className="mr-2">Pizzeria Da Mario</Badge>
                  Username: <strong>mario</strong> | Password: <strong>restaurant123</strong>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
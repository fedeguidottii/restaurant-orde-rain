import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { User } from '../App'
import { Users, Eye, EyeSlash } from '@phosphor-icons/react'

interface Props {
  onLogin: (user: User) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
            <CardTitle className="text-xl">Accesso</CardTitle>
            <CardDescription>
              Accedi al sistema di gestione
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome Utente</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Inserisci il nome utente"
                className="shadow-liquid"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci la password"
                  className="shadow-liquid pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeSlash size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={loading || !username || !password}
              className="w-full bg-liquid-gradient shadow-liquid-lg hover:shadow-[0_12px_48px_-12px_rgba(201,161,82,0.5)] transition-all duration-300 text-lg font-bold py-3"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </CardContent>
        </Card>

        {/* Credenziali di esempio */}
        <Card className="mt-4 shadow-liquid border-liquid bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Credenziali di prova</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Amministratore</p>
                <p className="text-xs text-muted-foreground">admin / admin123</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUsername('admin')
                  setPassword('admin123')
                }}
                className="text-xs"
              >
                Usa
              </Button>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Osteria del Borgo</p>
                <p className="text-xs text-muted-foreground">osteria / restaurant123</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUsername('osteria')
                  setPassword('restaurant123')
                }}
                className="text-xs"
              >
                Usa
              </Button>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Pizzeria Da Mario</p>
                <p className="text-xs text-muted-foreground">mario / restaurant123</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUsername('mario')
                  setPassword('restaurant123')
                }}
                className="text-xs"
              >
                Usa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
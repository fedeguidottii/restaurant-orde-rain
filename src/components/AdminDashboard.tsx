import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { User, Restaurant } from '../App'
import { Crown, Plus, Buildings, Users, SignOut, Trash } from '@phosphor-icons/react'

interface Props {
  user: User
  onLogout: () => void
}

export default function AdminDashboard({ user, onLogout }: Props) {
  const [restaurants, setRestaurants] = useKV<Restaurant[]>('restaurants', [])
  const [users, setUsers] = useKV<User[]>('users', [])
  const [newRestaurant, setNewRestaurant] = useState({ name: '', contact: '', hours: '' })
  const [newUser, setNewUser] = useState({ username: '', role: 'restaurant' as const, restaurantId: '' })
  const [showRestaurantDialog, setShowRestaurantDialog] = useState(false)
  const [showUserDialog, setShowUserDialog] = useState(false)

  const handleCreateRestaurant = () => {
    if (!newRestaurant.name || !newRestaurant.contact) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    const restaurant: Restaurant = {
      id: `restaurant-${Date.now()}`,
      name: newRestaurant.name,
      contact: newRestaurant.contact,
      hours: newRestaurant.hours || '09:00-23:00',
      isActive: true
    }

    setRestaurants((current) => [...(current || []), restaurant])
    setNewRestaurant({ name: '', contact: '', hours: '' })
    setShowRestaurantDialog(false)
    toast.success('Ristorante creato con successo')
  }

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.restaurantId) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    const userAccount: User = {
      id: `user-${Date.now()}`,
      username: newUser.username,
      role: newUser.role,
      restaurantId: newUser.restaurantId
    }

    setUsers((current) => [...(current || []), userAccount])
    setNewUser({ username: '', role: 'restaurant', restaurantId: '' })
    setShowUserDialog(false)
    toast.success('Utente creato con successo')
  }

  const handleDeleteRestaurant = (restaurantId: string) => {
    setRestaurants((current) => (current || []).filter(r => r.id !== restaurantId))
    setUsers((current) => (current || []).filter(u => u.restaurantId !== restaurantId))
    toast.success('Ristorante eliminato')
  }

  const handleDeleteUser = (userId: string) => {
    setUsers((current) => (current || []).filter(u => u.id !== userId))
    toast.success('Utente eliminato')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Crown weight="bold" size={20} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Amministrazione</h1>
                <p className="text-sm text-muted-foreground">Ciao, {user.username}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout} className="flex items-center gap-2">
              <SignOut size={16} />
              Esci
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ristoranti Attivi</CardTitle>
                <Buildings className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {(restaurants || []).filter(r => r.isActive).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {(users || []).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utenti Ristorante</CardTitle>
                <Users className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">
                  {(users || []).filter(u => u.role === 'restaurant').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Restaurants Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Buildings size={20} className="text-primary" />
                    Gestione Ristoranti
                  </CardTitle>
                  <CardDescription>Crea e gestisci i ristoranti sulla piattaforma</CardDescription>
                </div>
                <Dialog open={showRestaurantDialog} onOpenChange={setShowRestaurantDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus size={16} />
                      Nuovo Ristorante
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crea Nuovo Ristorante</DialogTitle>
                      <DialogDescription>
                        Inserisci i dettagli del nuovo ristorante da aggiungere al sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="restaurantName">Nome Ristorante</Label>
                        <Input
                          id="restaurantName"
                          value={newRestaurant.name}
                          onChange={(e) => setNewRestaurant(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Es: Trattoria da Mario"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="restaurantContact">Contatto</Label>
                        <Input
                          id="restaurantContact"
                          value={newRestaurant.contact}
                          onChange={(e) => setNewRestaurant(prev => ({ ...prev, contact: e.target.value }))}
                          placeholder="telefono@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="restaurantHours">Orari (opzionale)</Label>
                        <Input
                          id="restaurantHours"
                          value={newRestaurant.hours}
                          onChange={(e) => setNewRestaurant(prev => ({ ...prev, hours: e.target.value }))}
                          placeholder="09:00-23:00"
                        />
                      </div>
                      <Button onClick={handleCreateRestaurant} className="w-full">
                        Crea Ristorante
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(restaurants || []).map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold">{restaurant.name}</h3>
                      <p className="text-sm text-muted-foreground">{restaurant.contact}</p>
                      <p className="text-sm text-muted-foreground">Orari: {restaurant.hours}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                        {restaurant.isActive ? "Attivo" : "Inattivo"}
                      </Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRestaurant(restaurant.id)}
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!restaurants || restaurants.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nessun ristorante registrato. Crea il primo ristorante per iniziare.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Users Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users size={20} className="text-primary" />
                    Gestione Utenti
                  </CardTitle>
                  <CardDescription>Crea e gestisci gli account degli utenti</CardDescription>
                </div>
                <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus size={16} />
                      Nuovo Utente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crea Nuovo Utente</DialogTitle>
                      <DialogDescription>
                        Crea un nuovo account per un gestore ristorante
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Nome utente</Label>
                        <Input
                          id="username"
                          value={newUser.username}
                          onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Es: mario.rossi"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="restaurant">Ristorante</Label>
                        <Select
                          value={newUser.restaurantId}
                          onValueChange={(value) => setNewUser(prev => ({ ...prev, restaurantId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona ristorante" />
                          </SelectTrigger>
                          <SelectContent>
                            {(restaurants || []).map((restaurant) => (
                              <SelectItem key={restaurant.id} value={restaurant.id}>
                                {restaurant.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateUser} className="w-full">
                        Crea Utente
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(users || []).filter(u => u.role === 'restaurant').map((user) => {
                  const restaurant = (restaurants || []).find(r => r.id === user.restaurantId)
                  return (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{user.username}</h3>
                        <p className="text-sm text-muted-foreground">
                          {restaurant ? restaurant.name : 'Ristorante non trovato'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Ristoratore</Badge>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {(!users || users.filter(u => u.role === 'restaurant').length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nessun utente ristoratore creato. Crea il primo account per iniziare.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
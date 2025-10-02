import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Calendar, Clock, Users, PencilSimple, Trash, Plus, Phone, User as UserIcon } from '@phosphor-icons/react'
import type { User, Reservation, Table } from '../App'
import TimelineReservations from './TimelineReservations'

interface ReservationsManagerProps {
  user: User
  tables: Table[]
  reservations: Reservation[]
  setReservations: (reservations: Reservation[]) => void
}

export default function ReservationsManager({ user, tables, reservations, setReservations }: ReservationsManagerProps) {
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  
  // Form states for editing
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    tableId: '',
    date: '',
    time: '',
    guests: 1
  })

  // Get reservation history (completed reservations)
  const [reservationHistory, setReservationHistory] = useKV<Reservation[]>(`reservationHistory_${user.restaurantId}`, [])
  
  const restaurantTables = tables.filter(table => table.restaurantId === user.restaurantId)
  const restaurantReservations = reservations.filter(reservation => reservation.restaurantId === user.restaurantId)
  const restaurantReservationHistory = reservationHistory?.filter(res => res.restaurantId === user.restaurantId) || []

  // Initialize edit form when reservation is selected
  const handleEditReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setEditForm({
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
      tableId: reservation.tableId,
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests
    })
    setShowEditDialog(true)
  }

  // Save edited reservation
  const handleSaveEdit = () => {
    if (!selectedReservation) return

    if (!editForm.customerName.trim() || !editForm.customerPhone.trim() || !editForm.tableId || !editForm.date || !editForm.time) {
      toast.error('Compila tutti i campi obbligatori')
      return
    }

    const updatedReservation: Reservation = {
      ...selectedReservation,
      customerName: editForm.customerName.trim(),
      customerPhone: editForm.customerPhone.trim(),
      tableId: editForm.tableId,
      date: editForm.date,
      time: editForm.time,
      guests: editForm.guests
    }

    setReservations(reservations.map(res => 
      res.id === selectedReservation.id ? updatedReservation : res
    ))
    
    setShowEditDialog(false)
    setSelectedReservation(null)
    toast.success('Prenotazione modificata con successo')
  }

  // Delete reservation
  const handleDeleteReservation = () => {
    if (!selectedReservation) return

    setReservations(reservations.filter(res => res.id !== selectedReservation.id))
    setShowDeleteDialog(false)
    setSelectedReservation(null)
    toast.success('Prenotazione eliminata')
  }

  // Complete reservation (move to history)
  const handleCompleteReservation = (reservation: Reservation) => {
    setReservations(reservations.filter(res => res.id !== reservation.id))
    setReservationHistory([...(reservationHistory || []), reservation])
    toast.success('Prenotazione completata')
  }

  // Get table name
  const getTableName = (tableId: string) => {
    const table = restaurantTables.find(t => t.id === tableId)
    return table?.name || 'Tavolo non trovato'
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Check if reservation is today
  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  // Check if reservation is past
  const isPast = (dateStr: string, timeStr: string) => {
    const now = new Date()
    const reservationDate = new Date(`${dateStr}T${timeStr}`)
    return reservationDate < now
  }

  return (
    <div className="space-y-6">
      {/* Header with Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Prenotazioni</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(true)}
            >
              Storico Prenotazioni
            </Button>
          </div>
        </div>

        {/* Timeline Component */}
        <TimelineReservations 
          user={user}
          tables={tables}
          reservations={reservations}
          setReservations={setReservations}
        />
      </div>

      {/* Reservations List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground">Lista Prenotazioni</h3>
        
        {restaurantReservations.length === 0 ? (
          <Card className="shadow-professional">
            <CardContent className="text-center py-8">
              <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessuna prenotazione attiva</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {restaurantReservations
              .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`)
                const dateB = new Date(`${b.date}T${b.time}`)
                return dateA.getTime() - dateB.getTime()
              })
              .map(reservation => {
                const past = isPast(reservation.date, reservation.time)
                const today = isToday(reservation.date)
                
                return (
                  <Card 
                    key={reservation.id} 
                    className={`shadow-professional hover:shadow-professional-lg transition-all duration-300 cursor-pointer ${
                      past ? 'opacity-60' : ''
                    } ${today ? 'border-l-4 border-l-primary' : ''}`}
                    onClick={() => handleEditReservation(reservation)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <UserIcon size={18} />
                          {reservation.customerName}
                        </CardTitle>
                        <div className="flex gap-1">
                          {today && <Badge variant="default">Oggi</Badge>}
                          {past && <Badge variant="secondary">Passata</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={16} className="text-muted-foreground" />
                          <span>{reservation.customerPhone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={16} className="text-muted-foreground" />
                          <span>{formatDate(reservation.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={16} className="text-muted-foreground" />
                          <span>{reservation.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users size={16} className="text-muted-foreground" />
                          <span>{reservation.guests} {reservation.guests === 1 ? 'persona' : 'persone'}</span>
                        </div>
                        <div className="text-sm font-medium text-primary">
                          {getTableName(reservation.tableId)}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditReservation(reservation)
                          }}
                          className="flex-1"
                        >
                          <PencilSimple size={14} className="mr-1" />
                          Modifica
                        </Button>
                        {!past && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCompleteReservation(reservation)
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Completata
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedReservation(reservation)
                            setShowDeleteDialog(true)
                          }}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            }
          </div>
        )}
      </div>

      {/* Edit Reservation Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifica Prenotazione</DialogTitle>
            <DialogDescription>
              Modifica i dettagli della prenotazione
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="edit-customer-name">Nome Cliente *</Label>
                <Input
                  id="edit-customer-name"
                  value={editForm.customerName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Nome e cognome"
                />
              </div>
              <div>
                <Label htmlFor="edit-customer-phone">Telefono *</Label>
                <Input
                  id="edit-customer-phone"
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="+39 333 123 4567"
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="edit-date">Data *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-time">Orario *</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-guests">Ospiti *</Label>
                <Input
                  id="edit-guests"
                  type="number"
                  min="1"
                  max="20"
                  value={editForm.guests}
                  onChange={(e) => setEditForm(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-table">Tavolo *</Label>
              <Select 
                value={editForm.tableId} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, tableId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tavolo" />
                </SelectTrigger>
                <SelectContent>
                  {restaurantTables.map(table => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-primary hover:bg-primary/90"
              >
                Salva Modifiche
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Prenotazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa prenotazione? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="bg-muted/30 p-4 rounded-lg">
              <p><strong>Cliente:</strong> {selectedReservation.customerName}</p>
              <p><strong>Data:</strong> {formatDate(selectedReservation.date)}</p>
              <p><strong>Orario:</strong> {selectedReservation.time}</p>
              <p><strong>Tavolo:</strong> {getTableName(selectedReservation.tableId)}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteReservation}
            >
              Elimina Prenotazione
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reservation History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Storico Prenotazioni</DialogTitle>
            <DialogDescription>
              Tutte le prenotazioni completate
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {restaurantReservationHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessuna prenotazione nello storico
              </p>
            ) : (
              <div className="space-y-3">
                {restaurantReservationHistory
                  .sort((a, b) => {
                    const dateA = new Date(`${a.date}T${a.time}`)
                    const dateB = new Date(`${b.date}T${b.time}`)
                    return dateB.getTime() - dateA.getTime()
                  })
                  .map(reservation => (
                    <Card key={reservation.id} className="border-l-4 border-l-green-400">
                      <CardContent className="p-4">
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="font-semibold">{reservation.customerName}</p>
                            <p className="text-sm text-muted-foreground">{reservation.customerPhone}</p>
                          </div>
                          <div>
                            <p className="text-sm">{formatDate(reservation.date)}</p>
                            <p className="text-sm text-muted-foreground">{reservation.time}</p>
                          </div>
                          <div>
                            <p className="text-sm">{getTableName(reservation.tableId)}</p>
                            <p className="text-sm text-muted-foreground">{reservation.guests} ospiti</p>
                          </div>
                          <div className="flex items-center">
                            <Badge variant="default" className="bg-green-600">Completata</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                }
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
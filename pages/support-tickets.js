import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

export default function SupportTicketsScreen() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('open')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [tickets, setTickets] = useState([])
  const [agents, setAgents] = useState([])
  const [newResponse, setNewResponse] = useState('')
  const [ticketMessages, setTicketMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingResponse, setSendingResponse] = useState(false)
  const chatChannelRef = useRef(null)
  const chatScrollRef = useRef(null)

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'technical',
    priority: 'medium',
    assigned_to: '',
    user_type: 'passenger',
  })

  // Fetch support agents
  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('support_agents')
        .select('id, user:users(id, full_name), specialties, current_ticket_count, max_concurrent_tickets')
        .eq('is_active', true)

      if (error) throw error

      const agentsList = data.map(agent => ({
        id: agent.user.id,
        name: agent.user.full_name,
        specialties: agent.specialties,
        currentTickets: agent.current_ticket_count,
        maxTickets: agent.max_concurrent_tickets,
      }))

      setAgents(agentsList)
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  // Fetch tickets from Supabase
  const fetchTickets = async () => {
    try {
      setLoading(true)

      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setTickets(ticketsData || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
      alert('Error al cargar tickets: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const ticketsPollingRef = useRef(null)
  const showDetailModalRef = useRef(false)

  useEffect(() => {
    showDetailModalRef.current = showDetailModal
  }, [showDetailModal])

  useEffect(() => {
    setMounted(true)
    fetchAgents()
    fetchTickets()

    // Poll for new tickets every 5 seconds
    ticketsPollingRef.current = setInterval(() => {
      // Only refresh ticket list if no chat modal is open (to avoid interrupting chat)
      if (!showDetailModalRef.current) {
        fetchTickets()
      }
    }, 5000)

    return () => {
      if (ticketsPollingRef.current) clearInterval(ticketsPollingRef.current)
    }
  }, [])

  const openTickets = tickets.filter((t) => t.status === 'open')
  const inProgressTickets = tickets.filter((t) => t.status === 'in_progress')
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed')

  const stats = {
    open: openTickets.length,
    inProgress: inProgressTickets.length,
    resolved: resolvedTickets.length,
    urgent: tickets.filter((t) => t.priority === 'urgent' && !['resolved', 'closed'].includes(t.status)).length,
    overdue: tickets.filter((t) => !['resolved', 'closed'].includes(t.status) && t.sla_breached).length,
  }

  const getCategoryConfig = (category) => {
    switch (category) {
      case 'technical':
        return { label: 'Técnico', color: 'bg-blue-100 text-blue-800', icon: '🔧' }
      case 'payment':
        return { label: 'Pago', color: 'bg-green-100 text-green-800', icon: '💳' }
      case 'security':
        return { label: 'Seguridad', color: 'bg-red-100 text-red-800', icon: '🔒' }
      case 'account':
        return { label: 'Cuenta', color: 'bg-purple-100 text-purple-800', icon: '👤' }
      case 'trip':
        return { label: 'Viaje', color: 'bg-yellow-100 text-yellow-800', icon: '🚕' }
      case 'other':
        return { label: 'Otro', color: 'bg-gray-100 text-gray-800', icon: '💬' }
      default:
        return { label: 'Otro', color: 'bg-gray-100 text-gray-800', icon: '❓' }
    }
  }

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'urgent':
        return {
          label: 'Urgente',
          color: 'bg-red-500 text-white',
          icon: '🚨',
          maxTime: '1 hora',
        }
      case 'high':
        return {
          label: 'Alta',
          color: 'bg-orange-500 text-white',
          icon: '⚠️',
          maxTime: '4 horas',
        }
      case 'medium':
        return {
          label: 'Media',
          color: 'bg-yellow-500 text-white',
          icon: '⏰',
          maxTime: '24 horas',
        }
      case 'low':
        return {
          label: 'Baja',
          color: 'bg-green-500 text-white',
          icon: '✓',
          maxTime: '48 horas',
        }
      default:
        return {
          label: 'Sin prioridad',
          color: 'bg-gray-500 text-white',
          icon: '➖',
          maxTime: 'N/A',
        }
    }
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'open':
        return { label: 'Abierto', color: 'bg-blue-100 text-blue-800', icon: '📬' }
      case 'in_progress':
        return { label: 'En Proceso', color: 'bg-yellow-100 text-yellow-800', icon: '🔄' }
      case 'waiting_user':
        return { label: 'Esperando Usuario', color: 'bg-purple-100 text-purple-800', icon: '⏳' }
      case 'resolved':
        return { label: 'Resuelto', color: 'bg-green-100 text-green-800', icon: '✅' }
      case 'closed':
        return { label: 'Cerrado', color: 'bg-gray-100 text-gray-800', icon: '🔒' }
      default:
        return { label: 'Desconocido', color: 'bg-gray-100 text-gray-800', icon: '❓' }
    }
  }

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      // Create ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert([{
          subject: newTicket.subject,
          description: newTicket.description,
          category: newTicket.category,
          priority: newTicket.priority,
          user_type: newTicket.user_type,
          assigned_to: newTicket.assigned_to || null,
        }])
        .select()
        .single()

      if (ticketError) throw ticketError

      // Create initial response with description
      const { error: responseError } = await supabase
        .from('ticket_responses')
        .insert([{
          ticket_id: ticketData.id,
          user_id: ticketData.user_id,
          message: newTicket.description,
          is_internal: false,
        }])

      if (responseError) throw responseError

      // Auto-assign if no agent selected
      if (!newTicket.assigned_to) {
        await supabase.rpc('auto_assign_ticket', {
          p_ticket_id: ticketData.id,
          p_category: newTicket.category
        })
      }

      setShowCreateModal(false)
      setNewTicket({
        subject: '',
        description: '',
        category: 'technical',
        priority: 'medium',
        assigned_to: '',
        user_type: 'passenger',
      })
      
      alert('Ticket creado exitosamente')
      fetchTickets()
    } catch (error) {
      console.error('Error creating ticket:', error)
      alert('Error al crear ticket: ' + error.message)
    }
  }

  const loadTicketMessages = async (ticketId) => {
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('id, user_id, message, created_at, is_internal')
        .eq('ticket_id', ticketId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true })
      if (error) throw error
      setTicketMessages(data || [])
    } catch (e) {
      console.error('Error loading messages:', e)
    } finally {
      setLoadingMessages(false)
    }
  }

  const pollingRef = useRef(null)

  const startAdminPolling = (ticketId) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('ticket_responses')
          .select('id, user_id, message, created_at, is_internal')
          .eq('ticket_id', ticketId)
          .eq('is_internal', false)
          .order('created_at', { ascending: true })
        if (error || !data) return
        setTicketMessages((prev) => {
          if (prev.length === data.length) return prev
          return data
        })
      } catch (e) {
        // Silent fail
      }
    }, 3000)
  }

  const stopAdminPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const handleViewTicket = async (ticket) => {
    setSelectedTicket(ticket)
    setTicketMessages([])
    setShowDetailModal(true)
    await loadTicketMessages(ticket.id)
    startAdminPolling(ticket.id)
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (ticketMessages.length > 0) {
      setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }
  }, [ticketMessages])

  const handleCloseDetail = () => {
    stopAdminPolling()
    setShowDetailModal(false)
    setSelectedTicket(null)
    setTicketMessages([])
    setNewResponse('')
  }

  const handleChangeStatus = async (ticketId, newStatus) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId)

      if (error) throw error

      alert(`Ticket actualizado a: ${getStatusConfig(newStatus).label}`)
      fetchTickets()
    } catch (error) {
      console.error('Error updating ticket status:', error)
      alert('Error al actualizar ticket: ' + error.message)
    }
  }

  const handleReassignAgent = async (ticketId, newAgentId) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: newAgentId,
          assigned_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq('id', ticketId)

      if (error) throw error

      const agent = agents.find(a => a.id === newAgentId)
      alert(`Ticket reasignado a: ${agent?.name || 'Agente'}`)
      fetchTickets()
    } catch (error) {
      console.error('Error reassigning ticket:', error)
      alert('Error al reasignar ticket: ' + error.message)
    }
  }

  const handleAddResponse = async (ticketId) => {
    if (!newResponse.trim()) return
    const text = newResponse.trim()
    setSendingResponse(true)
    setNewResponse('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('ticket_responses')
        .insert([{
          ticket_id: ticketId,
          user_id: user?.id || null,
          message: text,
          is_internal: false,
        }])
        .select()
        .single()
      if (error) throw error
      // Add confirmed message to chat immediately
      setTicketMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev
        return [...prev, data]
      })
      setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 50)
      // Mark ticket as in_progress if it was open
      if (selectedTicket?.status === 'open') {
        await supabase.from('support_tickets').update({ status: 'in_progress' }).eq('id', ticketId)
        setSelectedTicket((t) => ({ ...t, status: 'in_progress' }))
        fetchTickets()
      }
    } catch (error) {
      console.error('Error adding response:', error)
      setNewResponse(text) // restore on error
      alert('Error al enviar respuesta: ' + error.message)
    } finally {
      setSendingResponse(false)
    }
  }

  const renderTicketCard = (ticket) => {
    const categoryConfig = getCategoryConfig(ticket.category)
    const priorityConfig = getPriorityConfig(ticket.priority)
    const statusConfig = getStatusConfig(ticket.status)
    const isOverdue = !['resolved', 'closed'].includes(ticket.status) && ticket.sla_breached
    
    const createdDate = new Date(ticket.created_at)
    const timeElapsed = ticket.response_time_minutes || Math.floor((new Date() - createdDate) / 60000)

    return (
      <div
        key={ticket.id}
        className={`bg-white rounded-lg p-6 shadow-sm border-l-4 ${
          isOverdue ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900">{ticket.subject}</h3>
              {isOverdue && (
                <span className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold">
                  ⏰ RETRASADO
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{ticket.ticket_number}</p>
            <p className="text-sm text-gray-700">{ticket.description}</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${priorityConfig.color}`}>
              {priorityConfig.icon} {priorityConfig.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryConfig.color}`}>
              {categoryConfig.icon} {categoryConfig.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Usuario</p>
            <p className="text-sm font-semibold text-gray-900">{ticket.user?.full_name || 'Sin usuario'}</p>
            <p className="text-xs text-gray-500">
              {ticket.user_type === 'driver' ? 'Conductor' : 'Pasajero'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Agente Asignado</p>
            <p className="text-sm font-semibold text-gray-900">
              {ticket.assigned_agent?.full_name || 'Sin asignar'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Tiempo de Respuesta</p>
            <p
              className={`text-sm font-semibold ${
                isOverdue ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {timeElapsed} min / {priorityConfig.maxTime}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Estado</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusConfig.color}`}>
              {statusConfig.icon} {statusConfig.label}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleViewTicket(ticket)}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
          >
            👁️ Ver Detalles
          </button>
          {ticket.status === 'open' && (
            <button
              onClick={() => handleChangeStatus(ticket.id, 'in_progress')}
              className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
            >
              🔄 En Proceso
            </button>
          )}
          {ticket.status === 'in_progress' && (
            <button
              onClick={() => handleChangeStatus(ticket.id, 'resolved')}
              className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
            >
              ✅ Resolver
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>GO!T Admin - Soporte por Tickets</title>
        <meta name="description" content="Sistema de tickets de soporte" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Soporte por Tickets</h1>
              <p className="text-gray-600 mt-1">Sistema de Atención al Cliente</p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center gap-2"
            >
              <span>➕</span>
              <span>Nuevo Ticket</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setSelectedTab('open')}
            className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm text-left hover:shadow-md hover:bg-blue-50 transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 mb-1">Abiertos</p>
            <p className="text-3xl font-bold text-blue-600">{stats.open}</p>
          </button>

          <button
            onClick={() => setSelectedTab('in_progress')}
            className="bg-white rounded-lg p-6 border-l-4 border-yellow-500 shadow-sm text-left hover:shadow-md hover:bg-yellow-50 transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 mb-1">En Proceso</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.inProgress}</p>
          </button>

          <button
            onClick={() => setSelectedTab('resolved')}
            className="bg-white rounded-lg p-6 border-l-4 border-green-500 shadow-sm text-left hover:shadow-md hover:bg-green-50 transition-all cursor-pointer"
          >
            <p className="text-sm text-gray-600 mb-1">Resueltos</p>
            <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
          </button>

          <button
            onClick={() => { setSelectedTab('open') }}
            className="bg-white rounded-lg p-6 border-l-4 border-red-500 shadow-sm text-left hover:shadow-md hover:bg-red-50 transition-all cursor-pointer"
            title="Filtra tickets abiertos con prioridad urgente"
          >
            <p className="text-sm text-gray-600 mb-1">Urgentes</p>
            <p className="text-3xl font-bold text-red-600">{stats.urgent}</p>
          </button>

          <button
            onClick={() => setSelectedTab('open')}
            className="bg-white rounded-lg p-6 border-l-4 border-orange-500 shadow-sm text-left hover:shadow-md hover:bg-orange-50 transition-all cursor-pointer"
            title="Filtra tickets abiertos con SLA vencido"
          >
            <p className="text-sm text-gray-600 mb-1">Retrasados</p>
            <p className="text-3xl font-bold text-orange-600">{stats.overdue}</p>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab('open')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                selectedTab === 'open'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📬 Abiertos ({stats.open})
            </button>
            <button
              onClick={() => setSelectedTab('in_progress')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                selectedTab === 'in_progress'
                  ? 'bg-yellow-50 text-yellow-600 border-b-2 border-yellow-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🔄 En Proceso ({stats.inProgress})
            </button>
            <button
              onClick={() => setSelectedTab('resolved')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                selectedTab === 'resolved'
                  ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ✅ Resueltos ({stats.resolved})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary mb-4"></div>
            <p className="text-gray-600">Cargando tickets...</p>
          </div>
        )}

        {/* Ticket Lists */}
        {!loading && (
        <div className="grid grid-cols-1 gap-4">
          {selectedTab === 'open' && openTickets.map(renderTicketCard)}
          {selectedTab === 'in_progress' && inProgressTickets.map(renderTicketCard)}
          {selectedTab === 'resolved' && resolvedTickets.map(renderTicketCard)}

          {((selectedTab === 'open' && openTickets.length === 0) ||
            (selectedTab === 'in_progress' && inProgressTickets.length === 0) ||
            (selectedTab === 'resolved' && resolvedTickets.length === 0)) && (
            <div className="bg-white rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">
                {selectedTab === 'open' && '📬'}
                {selectedTab === 'in_progress' && '🔄'}
                {selectedTab === 'resolved' && '✅'}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay tickets {selectedTab === 'open' && 'abiertos'}
                {selectedTab === 'in_progress' && 'en proceso'}
                {selectedTab === 'resolved' && 'resueltos'}
              </h3>
              <p className="text-gray-600">Los tickets aparecerán aquí</p>
            </div>
          )}
        </div>
        )}

        {/* Create Ticket Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">➕ Nuevo Ticket</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Asunto del Ticket *
                  </label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    placeholder="Ej: Error al procesar pago"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Descripción Detallada *
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Describe el problema con el mayor detalle posible..."
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Categoría *
                    </label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="technical">🔧 Técnico</option>
                      <option value="payment">💳 Pago</option>
                      <option value="security">🔒 Seguridad</option>
                      <option value="account">👤 Cuenta</option>
                      <option value="trip">🚕 Viaje</option>
                      <option value="other">💬 Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Prioridad *
                    </label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">✓ Baja (48 horas)</option>
                      <option value="medium">⏰ Media (24 horas)</option>
                      <option value="high">⚠️ Alta (4 horas)</option>
                      <option value="urgent">🚨 Urgente (1 hora)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Asignar Agente
                  </label>
                  <select
                    value={newTicket.assigned_to}
                    onChange={(e) => setNewTicket({ ...newTicket, assigned_to: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin asignar (se asignará automáticamente)</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.currentTickets}/{agent.maxTickets} tickets)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Tipo de Usuario *
                  </label>
                  <select
                    value={newTicket.user_type}
                    onChange={(e) => setNewTicket({ ...newTicket, user_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="passenger">Pasajero</option>
                    <option value="driver">Conductor</option>
                  </select>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    ⏱️ Tiempos de Respuesta (SLA)
                  </h4>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>• <strong>Urgente:</strong> Respuesta en menos de 1 hora</li>
                    <li>• <strong>Alta:</strong> Respuesta en menos de 4 horas</li>
                    <li>• <strong>Media:</strong> Respuesta en menos de 24 horas</li>
                    <li>• <strong>Baja:</strong> Respuesta en menos de 48 horas</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateTicket}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  ✅ Crear Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal — Chat View */}
        {showDetailModal && selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full flex flex-col" style={{ height: '90vh' }}>

              {/* Header */}
              <div className="border-b border-gray-200 p-5 flex justify-between items-start shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{selectedTicket.user_type === 'driver' ? '🚖' : '👤'}</span>
                    <h2 className="text-xl font-bold text-gray-900">{selectedTicket.subject}</h2>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusConfig(selectedTicket.status).color}`}>
                      {getStatusConfig(selectedTicket.status).icon} {getStatusConfig(selectedTicket.status).label}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPriorityConfig(selectedTicket.priority).color}`}>
                      {getPriorityConfig(selectedTicket.priority).label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedTicket.ticket_number || selectedTicket.id?.slice(0,8).toUpperCase()} &nbsp;·&nbsp;
                    {selectedTicket.user_type === 'driver' ? 'Conductor' : 'Pasajero'} &nbsp;·&nbsp;
                    {getCategoryConfig(selectedTicket.category).icon} {getCategoryConfig(selectedTicket.category).label} &nbsp;·&nbsp;
                    {new Date(selectedTicket.created_at).toLocaleString('es-MX')}
                  </p>
                </div>
                <button onClick={handleCloseDetail} className="text-gray-400 hover:text-gray-700 text-3xl leading-none ml-4">
                  ×
                </button>
              </div>

              {/* Status actions bar */}
              <div className="flex gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
                {selectedTicket.status === 'open' && (
                  <button
                    onClick={() => { handleChangeStatus(selectedTicket.id, 'in_progress'); setSelectedTicket(t => ({ ...t, status: 'in_progress' })) }}
                    className="px-4 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium"
                  >
                    🔄 Marcar En Proceso
                  </button>
                )}
                {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
                  <button
                    onClick={() => { handleChangeStatus(selectedTicket.id, 'resolved'); setSelectedTicket(t => ({ ...t, status: 'resolved' })) }}
                    className="px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                  >
                    ✅ Resolver
                  </button>
                )}
                {selectedTicket.status === 'resolved' && (
                  <button
                    onClick={() => { handleChangeStatus(selectedTicket.id, 'closed'); setSelectedTicket(t => ({ ...t, status: 'closed' })) }}
                    className="px-4 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
                  >
                    🔒 Cerrar Ticket
                  </button>
                )}
                <div className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                  Chat en vivo
                </div>
              </div>

              {/* Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
                {loadingMessages && (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {!loadingMessages && ticketMessages.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-2">💬</p>
                    <p className="text-sm">No hay mensajes aún. El conductor escribirá aquí.</p>
                  </div>
                )}
                {ticketMessages.map((msg) => {
                  const isAdmin = msg.user_id !== selectedTicket.user_id
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                        isAdmin
                          ? 'bg-green-500 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                      }`}>
                        <p className={`text-xs font-semibold mb-1 ${isAdmin ? 'text-green-100' : 'text-blue-500'}`}>
                          {isAdmin ? '🎧 Soporte GO!T' : '🚖 Conductor'}
                        </p>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className={`text-xs mt-1 text-right ${isAdmin ? 'text-green-100' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Reply input */}
              {!['resolved', 'closed'].includes(selectedTicket.status) && (
                <div className="border-t border-gray-200 p-4 shrink-0 bg-white">
                  <div className="flex gap-3 items-end">
                    <textarea
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddResponse(selectedTicket.id) } }}
                      placeholder="Escribe tu respuesta al conductor... (Enter para enviar)"
                      rows={2}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none text-sm"
                    />
                    <button
                      onClick={() => handleAddResponse(selectedTicket.id)}
                      disabled={!newResponse.trim() || sendingResponse}
                      className="px-5 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
                    >
                      {sendingResponse ? '...' : '➤ Enviar'}
                    </button>
                  </div>
                </div>
              )}
              {['resolved', 'closed'].includes(selectedTicket.status) && (
                <div className="border-t border-gray-200 p-4 shrink-0 bg-gray-50 text-center text-sm text-gray-400">
                  Este ticket está {selectedTicket.status === 'resolved' ? 'resuelto' : 'cerrado'} — no se pueden enviar más mensajes.
                </div>
              )}

            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}

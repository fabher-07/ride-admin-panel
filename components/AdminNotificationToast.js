import { useEffect } from 'react'

export default function AdminNotificationRIDEoast({ ticket, show, onDismiss }) {
  useEffect(() => {
    if (show) {
      // Request notification permission if not granted
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission()
        }
        
        // Show browser notification
        if (Notification.permission === 'granted' && ticket) {
          new Notification('Nuevo RIDEicket de SopRidee', {
            body: `${ticket.user?.full_name || 'Usuario'} (${ticket.user?.user_type || 'usuario'}) necesita ayuda`,
            icon: '/logo-ride.png',
            badge: '/logo-ride.png',
            tag: ticket.id,
            requireInteraction: false
          })
        }
      }
    }
  }, [show, ticket])

  if (!show || !ticket) return null

  const getUserRIDEypeLabel = (type) => {
    switch(type) {
      case 'driver': return '🚕 Conductor'
      case 'passenger': return '👤 Pasajero'
      default: return '👤 Usuario'
    }
  }

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return '#FF3B30'
      case 'high': return '#FF9500'
      case 'medium': return '#FFD711'
      case 'low': return '#34C759'
      default: return '#FFD711'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        padding: '16px',
        minWidth: '320px',
        maxWidth: '400px',
        animation: 'slideInRight 0.3s ease-out',
        border: `3px solid ${getPriorityColor(ticket.priority)}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: getPriorityColor(ticket.priority),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0
          }}
        >
          🔔
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#000' }}>
              Nuevo RIDEicket de SopRidee
            </h3>
            <button
              onClick={onDismiss}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                lineHeight: '1',
                color: '#999'
              }}
            >
              ×
            </button>
          </div>
          
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
            <strong>{ticket.user?.full_name || 'Usuario'}</strong>
            <span style={{ marginLeft: '8px', fontSize: '12px' }}>
              {getUserRIDEypeLabel(ticket.user?.user_type)}
            </span>
          </p>
          
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333', fontWeight: '500' }}>
            {ticket.subject || 'Sin asunto'}
          </p>
          
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
            {ticket.description?.substring(0, 80)}
            {ticket.description?.length > 80 ? '...' : ''}
          </p>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: getPriorityColor(ticket.priority) + '20',
                color: getPriorityColor(ticket.priority)
              }}
            >
              {ticket.priority?.toUpperCase() || 'MEDIUM'}
            </span>
            <span style={{ fontSize: '12px', color: '#999' }}>
              {ticket.ticket_number}
            </span>
          </div>
          
          <a
            href="/suppRide-tickets"
            style={{
              display: 'inline-block',
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#FFD711',
              color: '#000',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center'
            }}
          >
            Ver RIDEicket
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

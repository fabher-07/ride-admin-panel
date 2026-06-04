import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import ProtectedRoute from './ProtectedRoute'
import AdminNotificationToast from './AdminNotificationToast'
import { useAdminNotifications } from '../hooks/useAdminNotifications'

const SIDEBAR_SCROLL_KEY = 'admin_sidebar_scroll'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { unreadCount, latestTicket, showNotification, dismissNotification } = useAdminNotifications(user?.id)
  const navRef = useRef(null)

  // Restaurar scroll del sidebar al montar
  useEffect(() => {
    const savedScroll = sessionStorage.getItem(SIDEBAR_SCROLL_KEY)
    if (navRef.current && savedScroll !== null) {
      navRef.current.scrollTop = parseInt(savedScroll, 10)
    } else if (navRef.current) {
      // Si no hay scroll guardado, hacer visible el enlace activo
      const activeLink = navRef.current.querySelector('a.bg-primary')
      if (activeLink) {
        activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [router.pathname])

  // Guardar scroll del sidebar continuamente (navegación Next.js + reload)
  useEffect(() => {
    let timeout
    const saveScroll = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (navRef.current) {
          sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(navRef.current.scrollTop))
        }
      }, 100)
    }

    const el = navRef.current
    if (el) {
      el.addEventListener('scroll', saveScroll)
    }
    window.addEventListener('beforeunload', saveScroll)

    return () => {
      clearTimeout(timeout)
      if (el) el.removeEventListener('scroll', saveScroll)
      window.removeEventListener('beforeunload', saveScroll)
    }
  }, [])

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      await signOut()
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-secondary text-white transition-all duration-300 flex flex-col overflow-hidden ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Header / Logo */}
        <div className="p-6 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            {sidebarOpen && (
              <img src="/favicon.png" alt="RIDE Logo" className="h-10 w-auto rounded-full" />
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:text-primary transition-colors"
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav ref={navRef} className="flex-1 overflow-y-auto px-6 pb-4 space-y-1">
          {/* Dashboard */}
            <Link
              href="/"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">📊</span>
              {sidebarOpen && <span>Tablero</span>}
            </Link>

            {/* Gestión de Usuarios */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuarios</div>}
            <Link
              href="/drivers"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/drivers'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🚕</span>
              {sidebarOpen && <span>Conductores</span>}
            </Link>
            <Link
              href="/driver-metrics"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/driver-metrics'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">📊</span>
              {sidebarOpen && <span>Métricas Conductores</span>}
            </Link>
            <Link
              href="/pending-approvals"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/pending-approvals'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">⏳</span>
              {sidebarOpen && <span>Aprobaciones</span>}
            </Link>
            <Link
              href="/blocked-drivers"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/blocked-drivers'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🚫</span>
              {sidebarOpen && <span>Bloqueados</span>}
            </Link>
            <Link
              href="/passengers"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/passengers'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">👥</span>
              {sidebarOpen && <span>Pasajeros</span>}
            </Link>

            {/* Operaciones */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Operaciones</div>}
            <Link
              href="/map"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/map'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🗺️</span>
              {sidebarOpen && <span>Mapa en Vivo</span>}
            </Link>
            <Link
              href="/trips"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/trips'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">📋</span>
              {sidebarOpen && <span>Viajes Activos</span>}
            </Link>
            <Link
              href="/past-trips"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/past-trips'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">📊</span>
              {sidebarOpen && <span>Viajes Pasados</span>}
            </Link>

            {/* Finanzas */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Finanzas</div>}
            <Link
              href="/payments"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/payments'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💳</span>
              {sidebarOpen && <span>Pagos</span>}
            </Link>
            <Link
              href="/financial-report"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/financial-report'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💰</span>
              {sidebarOpen && <span>Reportes</span>}
            </Link>
            <Link
              href="/fare-configuration"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/fare-configuration'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💵</span>
              {sidebarOpen && <span>Tarifas</span>}
            </Link>
            <Link
              href="/invoices"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/invoices'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🧾</span>
              {sidebarOpen && <span>Facturas CFDI</span>}
            </Link>
            <Link
              href="/rewards"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/rewards'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🎁</span>
              {sidebarOpen && <span>Recompensas</span>}
            </Link>
            <Link
              href="/assign-rewards"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/assign-rewards'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🏆</span>
              {sidebarOpen && <span>Asignar Bonos</span>}
            </Link>
            <Link
              href="/disputes"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/disputes'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">⚖️</span>
              {sidebarOpen && <span>Disputas</span>}
            </Link>
            <Link
              href="/reconciliation"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/reconciliation'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🏦</span>
              {sidebarOpen && <span>Conciliación</span>}
            </Link>
            <Link
              href="/bank-reconciliation"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/bank-reconciliation'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💳</span>
              {sidebarOpen && <span>Reconciliación Bancaria</span>}
            </Link>
            <Link
              href="/debt-payments"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/debt-payments'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💸</span>
              {sidebarOpen && <span>Pagos Deuda</span>}
            </Link>

            {/* Marketing y Soporte */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Marketing</div>}
            <Link
              href="/advertising-campaigns"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/advertising-campaigns'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">📢</span>
              {sidebarOpen && <span>Publicidad</span>}
            </Link>
            <Link
              href="/promotions"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/promotions'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🎁</span>
              {sidebarOpen && <span>Promociones</span>}
            </Link>
            <Link
              href="/support-tickets"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/support-tickets'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
              style={{ position: 'relative' }}
            >
              <span className="text-xl">🎫</span>
              {sidebarOpen && <span>Soporte</span>}
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: sidebarOpen ? '12px' : '8px',
                    backgroundColor: '#FF3B30',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    minWidth: '20px',
                    textAlign: 'center',
                    animation: 'pulse 2s infinite'
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/chatbot"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/chatbot'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🤖</span>
              {sidebarOpen && <span>Chatbot</span>}
            </Link>

            {/* Sistema */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sistema</div>}
            <Link
              href="/alerts"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/alerts'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🚨</span>
              {sidebarOpen && <span>Alertas</span>}
            </Link>
            <Link
              href="/backup-security"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/backup-security'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💾</span>
              {sidebarOpen && <span>Backups</span>}
            </Link>
            <Link
              href="/security"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/security'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🔐</span>
              {sidebarOpen && <span>Seguridad MFA</span>}
            </Link>
            <Link
              href="/platform-configuration"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/platform-configuration'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">⚙️</span>
              {sidebarOpen && <span>Configuración</span>}
            </Link>
          </nav>

          {/* User Info & Logout */}
          <div className="shrink-0 p-6 border-t border-gray-700">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors mb-3"
            >
              <span className="text-xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
              {sidebarOpen && (
                <span className="text-sm">
                  {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                </span>
              )}
            </button>
            {user && (
              <>
                {sidebarOpen && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400">Sesión iniciada como:</p>
                    <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <span className="text-xl">🚪</span>
                  {sidebarOpen && <span>Cerrar Sesión</span>}
                </button>
              </>
            )}
          </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <div className="p-8">{children}</div>
      </main>

      {/* Real-time Notification Toast */}
      <AdminNotificationToast
        ticket={latestTicket}
        show={showNotification}
        onDismiss={dismissNotification}
      />

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
    </ProtectedRoute>
  )
}

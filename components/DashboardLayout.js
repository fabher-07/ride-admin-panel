import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from './ProtectedRoute'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      await signOut()
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-secondary text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            {sidebarOpen && (
              <h1 className="text-2xl font-bold text-primary">GO!T Admin</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:text-primary transition-colors"
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>

          <nav className="space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            {/* Dashboard */}
            <a
              href="/"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">📊</span>
              {sidebarOpen && <span>Tablero</span>}
            </a>

            {/* Gestión de Usuarios */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuarios</div>}
            <a
              href="/drivers"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/drivers'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🚕</span>
              {sidebarOpen && <span>Conductores</span>}
            </a>
            <a
              href="/pending-approvals"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/pending-approvals'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">⏳</span>
              {sidebarOpen && <span>Aprobaciones</span>}
            </a>
            <a
              href="/blocked-drivers"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/blocked-drivers'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🚫</span>
              {sidebarOpen && <span>Bloqueados</span>}
            </a>
            <a
              href="/passengers"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/passengers'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">👥</span>
              {sidebarOpen && <span>Pasajeros</span>}
            </a>

            {/* Operaciones */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Operaciones</div>}
            <a
              href="/map"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/map'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🗺️</span>
              {sidebarOpen && <span>Mapa en Vivo</span>}
            </a>
            <a
              href="/trips"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/trips'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">📋</span>
              {sidebarOpen && <span>Viajes Activos</span>}
            </a>
            <a
              href="/past-trips"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/past-trips'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">📊</span>
              {sidebarOpen && <span>Viajes Pasados</span>}
            </a>

            {/* Finanzas */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Finanzas</div>}
            <a
              href="/payments"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/payments'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💳</span>
              {sidebarOpen && <span>Pagos</span>}
            </a>
            <a
              href="/financial-report"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/financial-report'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💰</span>
              {sidebarOpen && <span>Reportes</span>}
            </a>
            <a
              href="/fare-configuration"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/fare-configuration'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💵</span>
              {sidebarOpen && <span>Tarifas</span>}
            </a>
            <a
              href="/invoices"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/invoices'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🧾</span>
              {sidebarOpen && <span>Facturas CFDI</span>}
            </a>
            <a
              href="/disputes"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/disputes'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">⚖️</span>
              {sidebarOpen && <span>Disputas</span>}
            </a>
            <a
              href="/reconciliation"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/reconciliation'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🏦</span>
              {sidebarOpen && <span>Conciliación</span>}
            </a>

            {/* Marketing y Soporte */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Marketing</div>}
            <a
              href="/advertising-campaigns"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/advertising-campaigns'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">📢</span>
              {sidebarOpen && <span>Publicidad</span>}
            </a>
            <a
              href="/promotions"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/promotions'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🎁</span>
              {sidebarOpen && <span>Promociones</span>}
            </a>
            <a
              href="/support-tickets"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/support-tickets'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🎫</span>
              {sidebarOpen && <span>Soporte</span>}
            </a>

            {/* Sistema */}
            {sidebarOpen && <div className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sistema</div>}
            <a
              href="/alerts"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/alerts'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🚨</span>
              {sidebarOpen && <span>Alertas</span>}
            </a>
            <a
              href="/backup-security"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/backup-security'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">💾</span>
              {sidebarOpen && <span>Backups</span>}
            </a>
            <a
              href="/security"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/security'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🔐</span>
              {sidebarOpen && <span>Seguridad MFA</span>}
            </a>
            <a
              href="/platform-configuration"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                router.pathname === '/platform-configuration'
                  ? 'bg-primary text-black font-medium'
                  : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">⚙️</span>
              {sidebarOpen && <span>Configuración</span>}
            </a>
          </nav>

          {/* User Info & Logout */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
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
    </div>
    </ProtectedRoute>
  )
}

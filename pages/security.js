import { useState, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'

export default function SecurityPage() {
  const { user, getMFAStatus, enrollMFA, verifyMFA, unenrollMFA } = useAuth()
  const [mfaStatus, setMfaStatus] = useState({ isEnrolled: false, factors: [] })
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollData, setEnrollData] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadMFAStatus()
  }, [])

  const loadMFAStatus = async () => {
    setLoading(true)
    const status = await getMFAStatus()
    setMfaStatus(status)
    setLoading(false)
  }

  const handleEnroll = async () => {
    setEnrolling(true)
    setError('')
    const result = await enrollMFA()
    if (result.success) {
      setEnrollData(result)
    } else {
      setError(result.error || 'Error al configurar MFA')
    }
    setEnrolling(false)
  }

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      setError('El codigo debe tener 6 digitos')
      return
    }
    setVerifying(true)
    setError('')
    const result = await verifyMFA(enrollData.factorId, verifyCode)
    if (result.success) {
      setSuccess('MFA activado correctamente')
      setEnrollData(null)
      setVerifyCode('')
      await loadMFAStatus()
    } else {
      setError(result.error || 'Codigo incorrecto')
    }
    setVerifying(false)
  }

  const handleUnenroll = async (factorId) => {
    if (!confirm('¿Desactivar autenticacion de dos factores?')) return
    setError('')
    const result = await unenrollMFA(factorId)
    if (result.success) {
      setSuccess('MFA desactivado')
      await loadMFAStatus()
    } else {
      setError(result.error || 'Error al desactivar MFA')
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seguridad</h1>
          <p className="text-gray-500 mt-1">Gestiona la autenticaci&oacute;n de dos factores (MFA)</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">✅</span>
            <p className="text-sm text-green-700">{success}</p>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600">&times;</button>
          </div>
        )}

        {/* Current user info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Cuenta</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-gray-900">{user?.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Rol</span>
              <span className="text-sm font-medium text-gray-900">{user?.user_type || 'admin'}</span>
            </div>
          </div>
        </div>

        {/* MFA Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Autenticaci&oacute;n de Dos Factores (TOTP)</h3>
            {!loading && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                mfaStatus.isEnrolled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {mfaStatus.isEnrolled ? 'Activo' : 'Inactivo'}
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">Cargando estado MFA...</p>
          ) : mfaStatus.isEnrolled ? (
            /* MFA is active */
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4 flex items-start gap-3">
                <span className="text-2xl">🔐</span>
                <div>
                  <p className="text-sm font-medium text-green-800">MFA est&aacute; activo</p>
                  <p className="text-xs text-green-600 mt-1">
                    Tu cuenta est&aacute; protegida con autenticaci&oacute;n de dos factores.
                    Necesitar&aacute;s tu app de autenticaci&oacute;n para iniciar sesi&oacute;n.
                  </p>
                </div>
              </div>

              {mfaStatus.factors.map(factor => (
                <div key={factor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{factor.friendly_name || 'TOTP'}</p>
                    <p className="text-xs text-gray-400">ID: {factor.id.slice(0, 12)}...</p>
                  </div>
                  <button
                    onClick={() => handleUnenroll(factor.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Desactivar
                  </button>
                </div>
              ))}
            </div>
          ) : enrollData ? (
            /* Enrollment in progress — show QR */
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">Paso 1: Escanea el c&oacute;digo QR</p>
                <p className="text-xs text-blue-600 mb-4">
                  Usa Google Authenticator, Authy, o cualquier app TOTP compatible.
                </p>
                <div className="flex justify-center bg-white rounded-lg p-4">
                  {/* QR Code as image from Supabase */}
                  <img
                    src={enrollData.qrCode}
                    alt="QR Code MFA"
                    className="w-48 h-48"
                  />
                </div>
                <div className="mt-3 p-2 bg-gray-100 rounded text-center">
                  <p className="text-xs text-gray-500 mb-1">O ingresa este c&oacute;digo manualmente:</p>
                  <p className="text-sm font-mono font-bold text-gray-900 select-all">{enrollData.secret}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Paso 2: Ingresa el c&oacute;digo de 6 d&iacute;gitos</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleVerify}
                    disabled={verifying || verifyCode.length !== 6}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {verifying ? 'Verificando...' : 'Verificar'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setEnrollData(null); setVerifyCode('') }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          ) : (
            /* MFA not enrolled — show enable button */
            <div className="space-y-4">
              <div className="bg-yellow-50 rounded-lg p-4 flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800">MFA no est&aacute; activo</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Se recomienda activar la autenticaci&oacute;n de dos factores para proteger
                    el acceso al panel de administraci&oacute;n.
                  </p>
                </div>
              </div>

              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {enrolling ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Configurando...
                  </>
                ) : (
                  '🔐 Activar MFA (TOTP)'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Security recommendations */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recomendaciones de Seguridad</h3>
          <div className="space-y-3">
            {[
              { icon: mfaStatus.isEnrolled ? '✅' : '❌', text: 'Autenticacion de dos factores (MFA)', done: mfaStatus.isEnrolled },
              { icon: '✅', text: 'Conexion HTTPS encriptada', done: true },
              { icon: '✅', text: 'Row Level Security (RLS) en base de datos', done: true },
              { icon: '✅', text: 'Rate limiting en endpoints de pago', done: true },
              { icon: '✅', text: 'Logs de auditoria inmutables', done: true },
              { icon: '✅', text: 'Secret keys solo en servidor (Edge Functions)', done: true },
              { icon: '✅', text: 'Verificacion de firma en webhooks Stripe', done: true },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${item.done ? 'bg-green-50' : 'bg-red-50'}`}>
                <span>{item.icon}</span>
                <span className={`text-sm ${item.done ? 'text-green-800' : 'text-red-800'}`}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

import { useState, useEffect } from 'react'
import Head from 'next/head'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const EMPTY_FORM = {
  title: '',
  description: '',
  code: '',
  discount: '',
  type: 'percentage',
  min_amount: 0,
  max_discount: 0,
  valid_until: '',
  is_active: true,
  is_new: true,
}

export default function PromotionsPage() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (mounted) fetchPromotions() }, [mounted])

  const fetchPromotions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setPromotions(data || [])
    } catch (err) {
      setError('Error al cargar promociones: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingPromo(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  const openEdit = (promo) => {
    setEditingPromo(promo)
    setForm({
      title: promo.title,
      description: promo.description,
      code: promo.code,
      discount: promo.discount,
      type: promo.type,
      min_amount: promo.min_amount,
      max_discount: promo.max_discount,
      valid_until: promo.valid_until ? promo.valid_until.split('T')[0] : '',
      is_active: promo.is_active,
      is_new: promo.is_new,
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.code.trim() || !form.discount.trim() || !form.valid_until) {
      setError('Título, código, descuento y fecha de expiración son obligatorios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        code: form.code.trim().toUpperCase(),
        discount: form.discount.trim(),
        type: form.type,
        min_amount: Number(form.min_amount) || 0,
        max_discount: Number(form.max_discount) || 0,
        valid_until: form.valid_until,
        is_active: form.is_active,
        is_new: form.is_new,
      }

      if (editingPromo) {
        const { error } = await supabase
          .from('promotions')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingPromo.id)
        if (error) throw error
        showSuccess('Promoción actualizada correctamente')
      } else {
        const { error } = await supabase
          .from('promotions')
          .insert([payload])
        if (error) throw error
        showSuccess('Promoción creada correctamente')
      }

      setShowModal(false)
      fetchPromotions()
    } catch (err) {
      setError('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (promo) => {
    if (!confirm(`¿Eliminar la promoción "${promo.title}" (${promo.code})? Esta acción no se puede deshacer.`)) return
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promo.id)
      if (error) throw error
      showSuccess('Promoción eliminada')
      fetchPromotions()
    } catch (err) {
      setError('Error al eliminar: ' + err.message)
    }
  }

  const handleToggleActive = async (promo) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !promo.is_active, updated_at: new Date().toISOString() })
        .eq('id', promo.id)
      if (error) throw error
      fetchPromotions()
    } catch (err) {
      setError('Error al actualizar: ' + err.message)
    }
  }

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const filtered = promotions.filter(p => {
    if (filterStatus === 'active') return p.is_active
    if (filterStatus === 'inactive') return !p.is_active
    return true
  })

  const isExpired = (dateStr) => dateStr && new Date(dateStr) < new Date()

  if (!mounted) return null

  return (
    <DashboardLayout>
      <Head><title>Promociones | GO!T Admin</title></Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🎁 Promociones</h1>
            <p className="text-gray-500 mt-1">Gestiona las promociones visibles en la app para pasajeros</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span> Nueva Promoción
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <span>⚠️</span> {error}
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <span>✅</span> {successMsg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-3xl font-bold text-gray-900">{promotions.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Activas</p>
            <p className="text-3xl font-bold text-green-600">{promotions.filter(p => p.is_active).length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500">Inactivas</p>
            <p className="text-3xl font-bold text-gray-400">{promotions.filter(p => !p.is_active).length}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === f
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Inactivas'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="animate-spin text-4xl mr-3">⏳</div>
              <span>Cargando promociones...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <span className="text-6xl mb-4">🎁</span>
              <p className="text-lg font-medium">No hay promociones</p>
              <p className="text-sm mt-1">Crea tu primera promoción con el botón de arriba</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Promoción</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Descuento</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Vence</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(promo => (
                  <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {promo.is_new && (
                          <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">NUEVO</span>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{promo.title}</p>
                          <p className="text-sm text-gray-500">{promo.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-800 font-mono text-sm px-3 py-1 rounded-lg">
                        {promo.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-gray-900">{promo.discount}</span>
                      {promo.type === 'percentage' && <span className="text-gray-500 text-sm ml-1">OFF</span>}
                      {promo.min_amount > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">Mín. ${promo.min_amount}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {promo.valid_until ? (
                        <span className={`text-sm ${isExpired(promo.valid_until) ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                          {isExpired(promo.valid_until) ? '⚠️ Expirada' : new Date(promo.valid_until).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin fecha</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(promo)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          promo.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {promo.is_active ? '✅ Activa' : '⏸ Inactiva'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(promo)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(promo)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPromo ? '✏️ Editar Promoción' : '🎁 Nueva Promoción'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="ej. 50% OFF en tu primer viaje"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="ej. Descuento del 50% en tu primer viaje con GO!T"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código * (se convierte a mayúsculas)</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="ej. BIENVENIDO50"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento *</label>
                  <input
                    type="text"
                    value={form.discount}
                    onChange={e => setForm({ ...form, discount: e.target.value })}
                    placeholder="ej. 50% o $30"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed">Monto fijo</option>
                    <option value="referral">Referido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vence el *</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={e => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto mínimo ($)</label>
                  <input
                    type="number"
                    value={form.min_amount}
                    onChange={e => setForm({ ...form, min_amount: e.target.value })}
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento máximo ($)</label>
                  <input
                    type="number"
                    value={form.max_discount}
                    onChange={e => setForm({ ...form, max_discount: e.target.value })}
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded accent-yellow-400"
                  />
                  <span className="text-sm text-gray-700">Activa (visible en la app)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_new}
                    onChange={e => setForm({ ...form, is_new: e.target.checked })}
                    className="w-4 h-4 rounded accent-yellow-400"
                  />
                  <span className="text-sm text-gray-700">Mostrar badge "NUEVO"</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingPromo ? 'Actualizar' : 'Crear Promoción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

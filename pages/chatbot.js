import { useState, useEffect } from 'react'
import Head from 'next/head'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const CATEGORIES = ['general', 'viajes', 'pagos', 'promociones', 'soporte', 'seguridad', 'cuenta', 'legal', 'conductores', 'tecnico']

const EMPTY_FORM = {
  category: 'general',
  keywords: '',
  question: '',
  answer: '',
  fallback: '',
  priority: 0,
  is_active: true,
}

export default function ChatbotAdminPage() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('knowledge') // knowledge | interactions | analytics
  const [entries, setEntries] = useState([])
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [interactionFilter, setInteractionFilter] = useState('all') // all | matched | unmatched

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    fetchEntries()
    fetchInteractions()
  }, [mounted])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chatbot_knowledge_base')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      setError('Error al cargar la base de conocimiento: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchInteractions = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setInteractions(data || [])
    } catch (err) {
      console.error('Error fetching interactions:', err)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  const openEdit = (entry) => {
    setEditing(entry)
    setForm({
      category: entry.category || 'general',
      keywords: (entry.keywords || []).join(', '),
      question: entry.question || '',
      answer: entry.answer || '',
      fallback: entry.fallback || '',
      priority: entry.priority || 0,
      is_active: entry.is_active !== false,
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.answer.trim()) {
      setError('La respuesta es obligatoria.')
      return
    }
    const keywordsArr = form.keywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean)

    if (keywordsArr.length === 0) {
      setError('Debes incluir al menos una palabra clave.')
      return
    }

    try {
      setSaving(true)
      setError('')
      const payload = {
        category: form.category,
        keywords: keywordsArr,
        question: form.question.trim() || null,
        answer: form.answer.trim(),
        fallback: form.fallback.trim() || null,
        priority: parseInt(form.priority, 10) || 0,
        is_active: !!form.is_active,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }

      if (editing) {
        const { error } = await supabase
          .from('chatbot_knowledge_base')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        setSuccess('Entrada actualizada correctamente.')
      } else {
        payload.created_by = user?.id || null
        const { error } = await supabase
          .from('chatbot_knowledge_base')
          .insert([payload])
        if (error) throw error
        setSuccess('Entrada creada correctamente.')
      }
      setShowModal(false)
      fetchEntries()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entry) => {
    if (!confirm(`¿Eliminar la entrada "${entry.question || entry.keywords?.[0]}"?`)) return
    try {
      const { error } = await supabase
        .from('chatbot_knowledge_base')
        .delete()
        .eq('id', entry.id)
      if (error) throw error
      setSuccess('Entrada eliminada.')
      fetchEntries()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al eliminar: ' + err.message)
    }
  }

  const handleToggleActive = async (entry) => {
    try {
      const { error } = await supabase
        .from('chatbot_knowledge_base')
        .update({ is_active: !entry.is_active, updated_at: new Date().toISOString() })
        .eq('id', entry.id)
      if (error) throw error
      fetchEntries()
    } catch (err) {
      setError('Error al actualizar estado: ' + err.message)
    }
  }

  const filteredEntries = entries.filter(e => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false
    if (filterStatus === 'active' && !e.is_active) return false
    if (filterStatus === 'inactive' && e.is_active) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matches =
        (e.question || '').toLowerCase().includes(q) ||
        (e.answer || '').toLowerCase().includes(q) ||
        (e.keywords || []).some(k => k.toLowerCase().includes(q))
      if (!matches) return false
    }
    return true
  })

  const filteredInteractions = interactions.filter(i => {
    if (interactionFilter === 'matched' && !i.matched) return false
    if (interactionFilter === 'unmatched' && i.matched) return false
    return true
  })

  const stats = {
    total: entries.length,
    active: entries.filter(e => e.is_active).length,
    inactive: entries.filter(e => !e.is_active).length,
    interactions: interactions.length,
    matched: interactions.filter(i => i.matched).length,
    unmatched: interactions.filter(i => !i.matched).length,
    matchRate: interactions.length
      ? Math.round((interactions.filter(i => i.matched).length / interactions.length) * 100)
      : 0,
  }

  if (!mounted) return null

  return (
    <DashboardLayout>
      <Head>
        <title>Chatbot · Admin RIDE</title>
      </Head>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🤖 Chatbot</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitorea las interacciones del asistente virtual y mejora sus respuestas.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="📚" label="Entradas activas" value={stats.active} subtitle={`de ${stats.total} totales`} />
        <StatCard icon="💬" label="Interacciones" value={stats.interactions} subtitle="últimas 200" />
        <StatCard icon="✅" label="Tasa de respuesta" value={`${stats.matchRate}%`} subtitle={`${stats.matched} resueltas`} />
        <StatCard icon="❓" label="Sin respuesta" value={stats.unmatched} subtitle="oportunidades" highlight={stats.unmatched > 0} />
      </div>

      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
        <TabButton active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')}>
          Base de conocimiento
        </TabButton>
        <TabButton active={activeTab === 'interactions'} onClick={() => setActiveTab('interactions')}>
          Interacciones {stats.unmatched > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
              {stats.unmatched}
            </span>
          )}
        </TabButton>
      </div>

      {activeTab === 'knowledge' && (
        <>
          {/* Toolbar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="🔎 Buscar pregunta, respuesta o palabra clave..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm w-64"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
              >
                <option value="all">Todas las categorías</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
              >
                <option value="all">Todas</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
              </select>
            </div>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              + Nueva entrada
            </button>
          </div>

          {/* Knowledge base list */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay entradas que coincidan con los filtros.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  <tr>
                    <th className="px-4 py-3">Pregunta / Categoría</th>
                    <th className="px-4 py-3">Palabras clave</th>
                    <th className="px-4 py-3 w-24">Prioridad</th>
                    <th className="px-4 py-3 w-24">Estado</th>
                    <th className="px-4 py-3 w-40">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {entry.question || <span className="text-gray-400 italic">Sin pregunta</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{entry.category}</span>
                          <span className="ml-2 line-clamp-1">{entry.answer.substring(0, 80)}...</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(entry.keywords || []).slice(0, 4).map(k => (
                            <span key={k} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{k}</span>
                          ))}
                          {(entry.keywords || []).length > 4 && (
                            <span className="text-xs text-gray-500">+{entry.keywords.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{entry.priority}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(entry)}
                          className={`px-2 py-1 text-xs rounded font-medium ${
                            entry.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {entry.is_active ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => openEdit(entry)}
                          className="text-blue-600 hover:underline mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'interactions' && (
        <>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4 flex gap-2">
            <select
              value={interactionFilter}
              onChange={(e) => setInteractionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            >
              <option value="all">Todas las interacciones</option>
              <option value="matched">Solo respondidas</option>
              <option value="unmatched">Solo sin respuesta</option>
            </select>
            <button
              onClick={fetchInteractions}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              ↻ Refrescar
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            {filteredInteractions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aún no hay interacciones registradas.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  <tr>
                    <th className="px-4 py-3 w-32">Fecha</th>
                    <th className="px-4 py-3">Pregunta del usuario</th>
                    <th className="px-4 py-3">Respuesta del bot</th>
                    <th className="px-4 py-3 w-24">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInteractions.map(i => (
                    <tr key={i.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(i.created_at).toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {i.question}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-md">
                        <div className="line-clamp-2">{i.answer}</div>
                      </td>
                      <td className="px-4 py-3">
                        {i.matched ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">✓ Resuelta</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">✗ Sin match</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal create/edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editing ? 'Editar entrada' : 'Nueva entrada'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pregunta de ejemplo
                </label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="¿Cómo solicito un viaje?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Palabras clave (separadas por coma) *
                </label>
                <input
                  type="text"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="solicitar, pedir, viaje, taxi"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  El bot busca coincidencias con estas palabras en los mensajes del usuario.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Respuesta *
                </label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  rows={6}
                  placeholder="Para solicitar un viaje:&#10;&#10;1. Abre RIDE..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mensaje de respaldo (fallback)
                </label>
                <input
                  type="text"
                  value={form.fallback}
                  onChange={(e) => setForm({ ...form, fallback: e.target.value })}
                  placeholder="¿Quieres agendar una llamada con un agente humano?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mensaje opcional que se sugiere si el usuario necesita escalar a un agente humano.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prioridad
                  </label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mayor número = aparece primero al empatar</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado
                  </label>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Entrada activa</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

function StatCard({ icon, label, value, subtitle, highlight }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 ${highlight ? 'border-2 border-red-300' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary text-gray-900 dark:text-white'
          : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

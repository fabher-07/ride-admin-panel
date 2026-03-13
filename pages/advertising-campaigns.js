import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function AdvertisingCampaignsScreen() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedTab, setSelectedTab] = useState('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)

  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  // New campaign form
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    budget: '',
    startDate: '',
    endDate: '',
    targetAudience: 'all',
    adType: 'banner',
    imageFormat: 'banner',
    brand_name: '',
    emoji: '🎁',
    cta_text: 'Ver más',
    cta_url: '',
    background_color: '#000000',
    cost_per_impression: '0.01',
    cost_per_click: '0.50',
    // Audience targeting
    locationTargeting: 'all',
    specificLocations: [],
    scheduleTargeting: 'all_day',
    scheduleStart: '08:00',
    scheduleEnd: '20:00',
    userTypeTargeting: 'all',
    behaviorTargeting: [],
  })

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageError, setImageError] = useState('')

  // Real campaigns from Supabase
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) fetchCampaigns()
  }, [mounted])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('advertising_campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map((c) => {
        const ctr = c.impressions_count > 0
          ? ((c.clicks_count / c.impressions_count) * 100).toFixed(1)
          : 0
        const daysRemaining = Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
        return {
          id: c.id,
          name: c.brand_name + ' - ' + c.title,
          brand_name: c.brand_name,
          title: c.title,
          description: c.description,
          status: c.status,
          budget: parseFloat(c.budget_total) || 0,
          spent: parseFloat(c.total_spent) || 0,
          startDate: c.start_date?.split('T')[0] || '',
          endDate: c.end_date?.split('T')[0] || '',
          targetAudience: c.target_audience,
          adType: 'banner',
          impressions: c.impressions_count || 0,
          clicks: c.clicks_count || 0,
          conversions: 0,
          ctr: parseFloat(ctr),
          conversionRate: 0,
          daysRemaining,
          emoji: c.emoji,
          image_url: c.image_url,
          cta_text: c.cta_text,
          cta_url: c.cta_url,
          background_color: c.background_color,
          cost_per_impression: c.cost_per_impression,
          cost_per_click: c.cost_per_click,
          priority: c.priority,
        }
      })
      setCampaigns(mapped)
    } catch (err) {
      console.error('Error fetching campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  const activeCampaigns = campaigns.filter((c) => c.status === 'active')
  const pausedCampaigns = campaigns.filter((c) => c.status === 'paused')
  const completedCampaigns = campaigns.filter((c) => c.status === 'completed')

  const stats = {
    active: activeCampaigns.length,
    paused: pausedCampaigns.length,
    completed: completedCampaigns.length,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
    totalSpent: campaigns.reduce((sum, c) => sum + c.spent, 0),
    totalImpressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
    totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Por favor selecciona un archivo de imagen válido')
      return
    }

    // Create image to check dimensions
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (event) => {
      img.src = event.target.result

      img.onload = () => {
        const { width, height } = img
        let isValid = false
        let expectedFormat = ''

        // Validate dimensions based on selected format
        switch (newCampaign.imageFormat) {
          case 'banner':
            isValid = width === 728 && height === 90
            expectedFormat = '728 x 90 píxeles'
            break
          case 'square':
            isValid = width === 250 && height === 250
            expectedFormat = '250 x 250 píxeles'
            break
          case 'native':
            isValid = width === 1200 && height === 627
            expectedFormat = '1200 x 627 píxeles'
            break
        }

        if (!isValid) {
          setImageError(
            `Dimensiones incorrectas. Se esperaba ${expectedFormat}, pero la imagen es ${width} x ${height} píxeles.`
          )
          setImagePreview(null)
          setUploadedImage(null)
        } else {
          setImageError('')
          setImagePreview(event.target.result)
          setUploadedImage(file)
        }
      }
    }

    reader.readAsDataURL(file)
  }

  const handleCreateCampaign = async () => {
    if (!newCampaign.brand_name || !newCampaign.name || !newCampaign.budget || !newCampaign.startDate || !newCampaign.endDate) {
      alert('Por favor completa todos los campos requeridos (Marca, Título, Presupuesto, Fechas)')
      return
    }

    try {
      // Upload image to Supabase Storage if provided
      let imageUrl = null
      if (uploadedImage) {
        const ext = uploadedImage.name.split('.').pop()
        const fileName = `campaign_${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('ad-images')
          .upload(fileName, uploadedImage, { contentType: uploadedImage.type, upsert: true })

        if (uploadErr) {
          console.error('Image upload error:', uploadErr)
        } else {
          const { data: urlData } = supabase.storage.from('ad-images').getPublicUrl(fileName)
          imageUrl = urlData?.publicUrl || null
        }
      }

      const payload = {
        brand_name: newCampaign.brand_name,
        title: newCampaign.name,
        description: newCampaign.description,
        background_color: newCampaign.background_color,
        emoji: newCampaign.emoji,
        image_url: imageUrl,
        cta_text: newCampaign.cta_text,
        cta_url: newCampaign.cta_url,
        priority: 5,
        status: 'active',
        target_audience: newCampaign.targetAudience,
        start_date: new Date(newCampaign.startDate).toISOString(),
        end_date: new Date(newCampaign.endDate).toISOString(),
        budget_total: parseFloat(newCampaign.budget) || 0,
        cost_per_impression: parseFloat(newCampaign.cost_per_impression) || 0.01,
        cost_per_click: parseFloat(newCampaign.cost_per_click) || 0.50,
      }

      const { error } = await supabase.from('advertising_campaigns').insert([payload])
      if (error) throw error

      setShowCreateModal(false)
      setNewCampaign({
        name: '', description: '', budget: '', startDate: '', endDate: '',
        targetAudience: 'all', adType: 'banner', imageFormat: 'banner',
        brand_name: '', emoji: '🎁', cta_text: 'Ver más', cta_url: '',
        background_color: '#000000', cost_per_impression: '0.01', cost_per_click: '0.50',
        locationTargeting: 'all', specificLocations: [], scheduleTargeting: 'all_day',
        scheduleStart: '08:00', scheduleEnd: '20:00', userTypeTargeting: 'all', behaviorTargeting: [],
      })
      setUploadedImage(null)
      setImagePreview(null)
      setImageError('')
      await fetchCampaigns()
      alert('Campaña creada exitosamente')
    } catch (err) {
      console.error('Error creating campaign:', err)
      alert('Error al crear campaña: ' + err.message)
    }
  }

  const handleActivateCampaign = async (campaign) => {
    try {
      const { error } = await supabase
        .from('advertising_campaigns')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', campaign.id)
      if (error) throw error
      await fetchCampaigns()
      alert(`Campaña "${campaign.name}" activada`)
    } catch (err) {
      alert('Error al activar: ' + err.message)
    }
  }

  const handlePauseCampaign = async (campaign) => {
    try {
      const { error } = await supabase
        .from('advertising_campaigns')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', campaign.id)
      if (error) throw error
      await fetchCampaigns()
      alert(`Campaña "${campaign.name}" pausada`)
    } catch (err) {
      alert('Error al pausar: ' + err.message)
    }
  }

  const handleEditCampaign = (campaign) => {
    setSelectedCampaign(campaign)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('advertising_campaigns')
        .update({
          brand_name: selectedCampaign.brand_name || selectedCampaign.name?.split(' - ')[0],
          title: selectedCampaign.title || selectedCampaign.name?.split(' - ')[1] || selectedCampaign.name,
          description: selectedCampaign.description,
          budget_total: parseFloat(selectedCampaign.budget) || 0,
          start_date: selectedCampaign.startDate ? new Date(selectedCampaign.startDate).toISOString() : undefined,
          end_date: selectedCampaign.endDate ? new Date(selectedCampaign.endDate).toISOString() : undefined,
          target_audience: selectedCampaign.targetAudience,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCampaign.id)
      if (error) throw error
      setShowEditModal(false)
      await fetchCampaigns()
      alert('Campaña actualizada exitosamente')
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    }
  }

  const handleViewResults = (campaign) => {
    setSelectedCampaign(campaign)
    setShowResultsModal(true)
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return {
          label: 'Activa',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '🟢',
        }
      case 'paused':
        return {
          label: 'Pausada',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏸️',
        }
      case 'completed':
        return {
          label: 'Terminada',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '✅',
        }
      default:
        return {
          label: 'Desconocido',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
        }
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const renderCampaignCard = (campaign) => {
    const statusConfig = getStatusConfig(campaign.status)
    const budgetUsed = (campaign.spent / campaign.budget) * 100

    return (
      <div
        key={campaign.id}
        className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}
          >
            {statusConfig.icon} {statusConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Presupuesto</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(campaign.budget)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Gastado: {formatCurrency(campaign.spent)} ({budgetUsed.toFixed(0)}%)
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Fechas</p>
            <p className="text-sm font-semibold text-gray-900">
              {campaign.startDate} → {campaign.endDate}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {campaign.status === 'completed'
                ? 'Finalizada'
                : `${campaign.daysRemaining} días restantes`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-600">Impresiones</p>
            <p className="text-lg font-bold text-blue-600">
              {campaign.impressions.toLocaleString()}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-600">Clicks</p>
            <p className="text-lg font-bold text-purple-600">
              {campaign.clicks.toLocaleString()}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-600">CTR</p>
            <p className="text-lg font-bold text-green-600">{campaign.ctr}%</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-600">Conversiones</p>
            <p className="text-lg font-bold text-orange-600">{campaign.conversions}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {campaign.status === 'paused' && (
            <button
              onClick={() => handleActivateCampaign(campaign)}
              className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
            >
              ▶️ Activar
            </button>
          )}
          {campaign.status === 'active' && (
            <button
              onClick={() => handlePauseCampaign(campaign)}
              className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
            >
              ⏸️ Pausar
            </button>
          )}
          {campaign.status !== 'completed' && (
            <button
              onClick={() => handleEditCampaign(campaign)}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
            >
              ✏️ Editar
            </button>
          )}
          <button
            onClick={() => handleViewResults(campaign)}
            className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors font-medium text-sm"
          >
            📊 Ver Resultados
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>GO!T Admin - Campañas Publicitarias</title>
        <meta name="description" content="Gestión de campañas publicitarias" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Campañas Publicitarias</h1>
              <p className="text-gray-600 mt-1">Gestión de Publicidad y Marketing</p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center gap-2"
            >
              <span>➕</span>
              <span>Nueva Campaña</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border-l-4 border-green-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Campañas Activas</p>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-yellow-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Campañas Pausadas</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.paused}</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-gray-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Campañas Terminadas</p>
            <p className="text-3xl font-bold text-gray-600">{stats.completed}</p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Presupuesto Total</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalBudget)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Gastado: {formatCurrency(stats.totalSpent)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab('active')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                selectedTab === 'active'
                  ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🟢 Activas ({stats.active})
            </button>
            <button
              onClick={() => setSelectedTab('paused')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                selectedTab === 'paused'
                  ? 'bg-yellow-50 text-yellow-600 border-b-2 border-yellow-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ⏸️ Pausadas ({stats.paused})
            </button>
            <button
              onClick={() => setSelectedTab('completed')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                selectedTab === 'completed'
                  ? 'bg-gray-50 text-gray-600 border-b-2 border-gray-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ✅ Terminadas ({stats.completed})
            </button>
          </div>
        </div>

        {/* Campaign Lists */}
        <div className="grid grid-cols-1 gap-4">
          {selectedTab === 'active' &&
            (activeCampaigns.length > 0 ? (
              activeCampaigns.map(renderCampaignCard)
            ) : (
              <div className="bg-white rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📢</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay campañas activas
                </h3>
                <p className="text-gray-600">Crea una nueva campaña para empezar</p>
              </div>
            ))}

          {selectedTab === 'paused' &&
            (pausedCampaigns.length > 0 ? (
              pausedCampaigns.map(renderCampaignCard)
            ) : (
              <div className="bg-white rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">⏸️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay campañas pausadas
                </h3>
                <p className="text-gray-600">Las campañas pausadas aparecerán aquí</p>
              </div>
            ))}

          {selectedTab === 'completed' &&
            (completedCampaigns.length > 0 ? (
              completedCampaigns.map(renderCampaignCard)
            ) : (
              <div className="bg-white rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay campañas terminadas
                </h3>
                <p className="text-gray-600">Las campañas completadas aparecerán aquí</p>
              </div>
            ))}
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">➕ Nueva Campaña</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Nombre de la Marca *
                    </label>
                    <input
                      type="text"
                      value={newCampaign.brand_name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, brand_name: e.target.value })}
                      placeholder="Ej: Coca-Cola"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Emoji de la Marca
                    </label>
                    <input
                      type="text"
                      value={newCampaign.emoji}
                      onChange={(e) => setNewCampaign({ ...newCampaign, emoji: e.target.value })}
                      placeholder="🥤"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Título del Anuncio *
                  </label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="Ej: 2x1 en bebidas"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={newCampaign.description}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, description: e.target.value })
                    }
                    placeholder="Describe la oferta o promoción..."
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Texto del Botón (CTA)
                    </label>
                    <input
                      type="text"
                      value={newCampaign.cta_text}
                      onChange={(e) => setNewCampaign({ ...newCampaign, cta_text: e.target.value })}
                      placeholder="Ver oferta"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      URL de Destino
                    </label>
                    <input
                      type="url"
                      value={newCampaign.cta_url}
                      onChange={(e) => setNewCampaign({ ...newCampaign, cta_url: e.target.value })}
                      placeholder="https://www.marca.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Color de Fondo
                    </label>
                    <input
                      type="color"
                      value={newCampaign.background_color}
                      onChange={(e) => setNewCampaign({ ...newCampaign, background_color: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Costo/Impresión (MXN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCampaign.cost_per_impression}
                      onChange={(e) => setNewCampaign({ ...newCampaign, cost_per_impression: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Costo/Click (MXN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCampaign.cost_per_click}
                      onChange={(e) => setNewCampaign({ ...newCampaign, cost_per_click: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Presupuesto Total *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900">$</span>
                    <input
                      type="number"
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                      placeholder="50000"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, startDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Fecha de Fin *
                    </label>
                    <input
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, endDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Audiencia Objetivo
                  </label>
                  <select
                    value={newCampaign.targetAudience}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, targetAudience: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="passengers">Pasajeros</option>
                    <option value="drivers">Conductores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Tipo de Anuncio
                  </label>
                  <select
                    value={newCampaign.adType}
                    onChange={(e) => setNewCampaign({ ...newCampaign, adType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="banner">Banner</option>
                    <option value="video">Video</option>
                    <option value="notification">Notificación Push</option>
                  </select>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    📸 Subir Imagen Publicitaria
                  </h3>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Formato de Imagen *
                    </label>
                    <select
                      value={newCampaign.imageFormat}
                      onChange={(e) => {
                        setNewCampaign({ ...newCampaign, imageFormat: e.target.value })
                        setUploadedImage(null)
                        setImagePreview(null)
                        setImageError('')
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="banner">Banner Horizontal (728 x 90 px)</option>
                      <option value="square">Cuadrado (250 x 250 px)</option>
                      <option value="native">Nativo Grande (1200 x 627 px)</option>
                    </select>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      📐 Formatos Aceptados
                    </h4>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li>
                        • <strong>Banner Horizontal:</strong> 728 x 90 píxeles (para header)
                      </li>
                      <li>
                        • <strong>Cuadrado:</strong> 250 x 250 píxeles (para sidebar)
                      </li>
                      <li>
                        • <strong>Nativo Grande:</strong> 1200 x 627 píxeles (para feed)
                      </li>
                    </ul>
                    <p className="text-xs text-gray-600 mt-2">
                      Formatos de archivo: JPG, PNG, GIF (máx. 5MB)
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Seleccionar Imagen *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {imageError && (
                      <p className="text-sm text-red-600 mt-2">❌ {imageError}</p>
                    )}
                  </div>

                  {imagePreview && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        👁️ Vista Previa
                      </h4>
                      <div className="flex justify-center items-center bg-white rounded-lg p-4 border border-gray-300">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-w-full h-auto"
                          style={{
                            maxHeight:
                              newCampaign.imageFormat === 'banner'
                                ? '90px'
                                : newCampaign.imageFormat === 'square'
                                ? '250px'
                                : '400px',
                          }}
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-xs text-green-600 font-semibold">
                          ✅ Imagen válida -{' '}
                          {newCampaign.imageFormat === 'banner' && '728 x 90 px'}
                          {newCampaign.imageFormat === 'square' && '250 x 250 px'}
                          {newCampaign.imageFormat === 'native' && '1200 x 627 px'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    🎯 Segmentación de Audiencia
                  </h3>

                  {/* Location Targeting */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      📍 Ubicación
                    </label>
                    <select
                      value={newCampaign.locationTargeting}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, locationTargeting: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                    >
                      <option value="all">Todas las ubicaciones</option>
                      <option value="specific_city">Ciudad específica</option>
                      <option value="specific_zones">Zonas específicas</option>
                    </select>

                    {newCampaign.locationTargeting === 'specific_city' && (
                      <select
                        multiple
                        value={newCampaign.specificLocations}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            specificLocations: Array.from(
                              e.target.selectedOptions,
                              (option) => option.value
                            ),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        size="4"
                      >
                        <option value="puebla">Puebla</option>
                        <option value="acapulco">Acapulco</option>
                        <option value="cdmx">Ciudad de México</option>
                        <option value="guadalajara">Guadalajara</option>
                        <option value="monterrey">Monterrey</option>
                      </select>
                    )}

                    {newCampaign.locationTargeting === 'specific_zones' && (
                      <select
                        multiple
                        value={newCampaign.specificLocations}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            specificLocations: Array.from(
                              e.target.selectedOptions,
                              (option) => option.value
                            ),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        size="4"
                      >
                        <option value="centro">Centro Histórico</option>
                        <option value="angelopolis">Angelópolis</option>
                        <option value="aeropuerto">Zona Aeropuerto</option>
                        <option value="cholula">Cholula</option>
                        <option value="zavaleta">Zavaleta</option>
                      </select>
                    )}

                    {(newCampaign.locationTargeting === 'specific_city' ||
                      newCampaign.locationTargeting === 'specific_zones') && (
                      <p className="text-xs text-gray-600 mt-2">
                        Mantén presionado Ctrl (Cmd en Mac) para seleccionar múltiples opciones
                      </p>
                    )}
                  </div>

                  {/* Schedule Targeting */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      🕐 Horario de Visualización
                    </label>
                    <select
                      value={newCampaign.scheduleTargeting}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, scheduleTargeting: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                    >
                      <option value="all_day">Todo el día (24 horas)</option>
                      <option value="business_hours">Horario comercial (8AM - 8PM)</option>
                      <option value="morning">Mañana (6AM - 12PM)</option>
                      <option value="afternoon">Tarde (12PM - 6PM)</option>
                      <option value="evening">Noche (6PM - 12AM)</option>
                      <option value="custom">Horario personalizado</option>
                    </select>

                    {newCampaign.scheduleTargeting === 'custom' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Hora Inicio</label>
                          <input
                            type="time"
                            value={newCampaign.scheduleStart}
                            onChange={(e) =>
                              setNewCampaign({ ...newCampaign, scheduleStart: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Hora Fin</label>
                          <input
                            type="time"
                            value={newCampaign.scheduleEnd}
                            onChange={(e) =>
                              setNewCampaign({ ...newCampaign, scheduleEnd: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Type Targeting */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      👥 Tipo de Usuario
                    </label>
                    <select
                      value={newCampaign.userTypeTargeting}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, userTypeTargeting: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Todos los usuarios</option>
                      <option value="new">Nuevos registrados (menos de 30 días)</option>
                      <option value="frequent">Usuarios frecuentes (10+ viajes)</option>
                      <option value="inactive">Usuarios inactivos (30+ días sin viaje)</option>
                      <option value="premium">Usuarios premium</option>
                    </select>
                  </div>

                  {/* Behavior Targeting */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      🎬 Comportamiento del Usuario
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newCampaign.behaviorTargeting.includes('airport_searches')}
                          onChange={(e) => {
                            const behaviors = e.target.checked
                              ? [...newCampaign.behaviorTargeting, 'airport_searches']
                              : newCampaign.behaviorTargeting.filter(
                                  (b) => b !== 'airport_searches'
                                )
                            setNewCampaign({ ...newCampaign, behaviorTargeting: behaviors })
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Usuarios que buscan viajes al aeropuerto
                        </span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newCampaign.behaviorTargeting.includes('long_distance')}
                          onChange={(e) => {
                            const behaviors = e.target.checked
                              ? [...newCampaign.behaviorTargeting, 'long_distance']
                              : newCampaign.behaviorTargeting.filter((b) => b !== 'long_distance')
                            setNewCampaign({ ...newCampaign, behaviorTargeting: behaviors })
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Usuarios que hacen viajes largos (15+ km)
                        </span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newCampaign.behaviorTargeting.includes('night_trips')}
                          onChange={(e) => {
                            const behaviors = e.target.checked
                              ? [...newCampaign.behaviorTargeting, 'night_trips']
                              : newCampaign.behaviorTargeting.filter((b) => b !== 'night_trips')
                            setNewCampaign({ ...newCampaign, behaviorTargeting: behaviors })
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Usuarios que viajan de noche (10PM - 6AM)
                        </span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newCampaign.behaviorTargeting.includes('business_travelers')}
                          onChange={(e) => {
                            const behaviors = e.target.checked
                              ? [...newCampaign.behaviorTargeting, 'business_travelers']
                              : newCampaign.behaviorTargeting.filter(
                                  (b) => b !== 'business_travelers'
                                )
                            setNewCampaign({ ...newCampaign, behaviorTargeting: behaviors })
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Viajeros de negocios (horario laboral, zonas corporativas)
                        </span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newCampaign.behaviorTargeting.includes('weekend_users')}
                          onChange={(e) => {
                            const behaviors = e.target.checked
                              ? [...newCampaign.behaviorTargeting, 'weekend_users']
                              : newCampaign.behaviorTargeting.filter((b) => b !== 'weekend_users')
                            setNewCampaign({ ...newCampaign, behaviorTargeting: behaviors })
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Usuarios que viajan principalmente los fines de semana
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      📊 Resumen de Segmentación
                    </h4>
                    <div className="text-xs text-gray-700 space-y-1">
                      <p>
                        <strong>Ubicación:</strong>{' '}
                        {newCampaign.locationTargeting === 'all'
                          ? 'Todas las ubicaciones'
                          : newCampaign.locationTargeting === 'specific_city'
                          ? `Ciudades: ${newCampaign.specificLocations.join(', ') || 'Ninguna seleccionada'}`
                          : `Zonas: ${newCampaign.specificLocations.join(', ') || 'Ninguna seleccionada'}`}
                      </p>
                      <p>
                        <strong>Horario:</strong>{' '}
                        {newCampaign.scheduleTargeting === 'all_day'
                          ? 'Todo el día'
                          : newCampaign.scheduleTargeting === 'custom'
                          ? `${newCampaign.scheduleStart} - ${newCampaign.scheduleEnd}`
                          : newCampaign.scheduleTargeting === 'business_hours'
                          ? '8AM - 8PM'
                          : newCampaign.scheduleTargeting === 'morning'
                          ? '6AM - 12PM'
                          : newCampaign.scheduleTargeting === 'afternoon'
                          ? '12PM - 6PM'
                          : '6PM - 12AM'}
                      </p>
                      <p>
                        <strong>Tipo de usuario:</strong>{' '}
                        {newCampaign.userTypeTargeting === 'all'
                          ? 'Todos'
                          : newCampaign.userTypeTargeting === 'new'
                          ? 'Nuevos registrados'
                          : newCampaign.userTypeTargeting === 'frequent'
                          ? 'Usuarios frecuentes'
                          : newCampaign.userTypeTargeting === 'inactive'
                          ? 'Usuarios inactivos'
                          : 'Usuarios premium'}
                      </p>
                      <p>
                        <strong>Comportamiento:</strong>{' '}
                        {newCampaign.behaviorTargeting.length === 0
                          ? 'Sin filtros de comportamiento'
                          : `${newCampaign.behaviorTargeting.length} filtro(s) activo(s)`}
                      </p>
                    </div>
                  </div>
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
                  onClick={handleCreateCampaign}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  ✅ Crear Campaña
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Campaign Modal */}
        {showEditModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  ✏️ Editar Campaña
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nombre de la Campaña
                  </label>
                  <input
                    type="text"
                    value={selectedCampaign.name}
                    onChange={(e) =>
                      setSelectedCampaign({ ...selectedCampaign, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={selectedCampaign.description}
                    onChange={(e) =>
                      setSelectedCampaign({ ...selectedCampaign, description: e.target.value })
                    }
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Presupuesto Total
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900">$</span>
                    <input
                      type="number"
                      value={selectedCampaign.budget}
                      onChange={(e) =>
                        setSelectedCampaign({
                          ...selectedCampaign,
                          budget: parseFloat(e.target.value),
                        })
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={selectedCampaign.startDate}
                      onChange={(e) =>
                        setSelectedCampaign({ ...selectedCampaign, startDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Fecha de Fin
                    </label>
                    <input
                      type="date"
                      value={selectedCampaign.endDate}
                      onChange={(e) =>
                        setSelectedCampaign({ ...selectedCampaign, endDate: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  💾 Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {showResultsModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  📊 Resultados - {selectedCampaign.name}
                </h2>
                <button
                  onClick={() => setShowResultsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Impresiones</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedCampaign.impressions.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Clicks</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedCampaign.clicks.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">CTR</p>
                    <p className="text-2xl font-bold text-green-600">{selectedCampaign.ctr}%</p>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-sm text-gray-600 mb-1">Conversiones</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {selectedCampaign.conversions}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      Presupuesto vs Gastado
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Presupuesto:</span>
                        <span className="font-bold">
                          {formatCurrency(selectedCampaign.budget)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Gastado:</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(selectedCampaign.spent)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Restante:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(selectedCampaign.budget - selectedCampaign.spent)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      Métricas de Rendimiento
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tasa de Conversión:</span>
                        <span className="font-bold">{selectedCampaign.conversionRate}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Costo por Click:</span>
                        <span className="font-bold">
                          {formatCurrency(selectedCampaign.spent / selectedCampaign.clicks)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Costo por Conversión:</span>
                        <span className="font-bold">
                          {formatCurrency(selectedCampaign.spent / selectedCampaign.conversions)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    💡 Análisis de Rendimiento
                  </h3>
                  <p className="text-sm text-gray-700">
                    {selectedCampaign.ctr >= 6
                      ? '✅ Excelente CTR. La campaña está generando buen engagement.'
                      : '⚠️ CTR bajo. Considera optimizar el contenido del anuncio.'}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    {selectedCampaign.conversionRate >= 10
                      ? '✅ Alta tasa de conversión. La campaña es muy efectiva.'
                      : '⚠️ Tasa de conversión mejorable. Revisa la propuesta de valor.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}

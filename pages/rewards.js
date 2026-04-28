import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { 
  getActiveRewards, 
  createReward, 
  updateReward, 
  deleteReward 
} from '@/services/rewardsService'

export default function RewardsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rewards, setRewards] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingReward, setEditingReward] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward_type: 'bonus',
    amount: '',
    icon: 'gift',
    color: '#FFD711',
    condition_type: 'manual',
    condition_value: '',
    condition_period: 'weekly',
    is_active: true
  })

  useEffect(() => {
    setMounted(true)
    if (!user) {
      router.push('/login')
      return
    }
    fetchRewards()
  }, [user])

  const fetchRewards = async () => {
    try {
      setLoading(true)
      const { rewards: data } = await getActiveRewards()
      setRewards(data || [])
    } catch (error) {
      console.error('Error fetching rewards:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (reward = null) => {
    if (reward) {
      setEditingReward(reward)
      setFormData({
        title: reward.title,
        description: reward.description || '',
        reward_type: reward.reward_type,
        amount: reward.amount || '',
        icon: reward.icon || 'gift',
        color: reward.color || '#FFD711',
        condition_type: reward.condition_type || 'manual',
        condition_value: reward.condition_value || '',
        condition_period: reward.condition_period || 'weekly',
        is_active: reward.is_active
      })
    } else {
      setEditingReward(null)
      setFormData({
        title: '',
        description: '',
        reward_type: 'bonus',
        amount: '',
        icon: 'gift',
        color: '#FFD711',
        condition_type: 'manual',
        condition_value: '',
        condition_period: 'weekly',
        is_active: true
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingReward(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const rewardData = {
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        condition_value: formData.condition_value ? parseFloat(formData.condition_value) : null
      }

      if (editingReward) {
        await updateReward(editingReward.id, rewardData)
        alert('Recompensa actualizada exitosamente')
      } else {
        await createReward(rewardData)
        alert('Recompensa creada exitosamente')
      }

      handleCloseModal()
      fetchRewards()
    } catch (error) {
      console.error('Error saving reward:', error)
      alert('Error al guardar la recompensa')
    }
  }

  const handleDelete = async (rewardId) => {
    if (!confirm('¿Estás seguro de eliminar esta recompensa?')) return

    try {
      await deleteReward(rewardId)
      alert('Recompensa eliminada exitosamente')
      fetchRewards()
    } catch (error) {
      console.error('Error deleting reward:', error)
      alert('Error al eliminar la recompensa')
    }
  }

  const handleToggleActive = async (reward) => {
    try {
      await updateReward(reward.id, { is_active: !reward.is_active })
      fetchRewards()
    } catch (error) {
      console.error('Error toggling reward:', error)
      alert('Error al cambiar estado')
    }
  }

  if (!mounted) return null

  return (
    <DashboardLayout>
      <Head>
        <title>Recompensas - GO!T Admin</title>
      </Head>

      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            🎁 Recompensas para Conductores
          </h1>
          <button
            onClick={() => handleOpenModal()}
            style={{
              backgroundColor: '#FFD711',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            + Nueva Recompensa
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Cargando recompensas...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {rewards.map((reward) => (
              <div
                key={reward.id}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: reward.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}
                    >
                      {reward.icon === 'gift' && '🎁'}
                      {reward.icon === 'trophy' && '🏆'}
                      {reward.icon === 'star' && '⭐'}
                      {reward.icon === 'cash' && '💵'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{reward.title}</h3>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: reward.is_active ? '#d4edda' : '#f8d7da',
                          color: reward.is_active ? '#155724' : '#721c24',
                          marginTop: '4px'
                        }}
                      >
                        {reward.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                  {reward.description}
                </p>

                {reward.amount > 0 && (
                  <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Monto del bono</p>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                      ${reward.amount.toFixed(2)}
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999', marginBottom: '4px' }}>Condición</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                    {reward.condition_type === 'manual' && 'Asignación manual'}
                    {reward.condition_type === 'trips_count' && `${reward.condition_value} viajes`}
                    {reward.condition_type === 'earnings_amount' && `$${reward.condition_value} en ganancias`}
                    {reward.condition_type === 'rating_above' && `Rating ${reward.condition_value}+`}
                    {reward.condition_period && reward.condition_type !== 'manual' && (
                      <span style={{ color: '#999' }}> · {reward.condition_period}</span>
                    )}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => handleOpenModal(reward)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: '#0066CC',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(reward)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: reward.is_active ? '#FFA500' : '#4CAF50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    {reward.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#FF3B30',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {rewards.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>🎁</p>
            <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>No hay recompensas creadas</h3>
            <p style={{ color: '#666', margin: '0 0 20px 0' }}>Crea tu primera recompensa para motivar a los conductores</p>
            <button
              onClick={() => handleOpenModal()}
              style={{
                backgroundColor: '#FFD711',
                color: '#000',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Crear Recompensa
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: 'bold' }}>
              {editingReward ? 'Editar Recompensa' : 'Nueva Recompensa'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Tipo *
                  </label>
                  <select
                    value={formData.reward_type}
                    onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="bonus">Bono</option>
                    <option value="gift">Regalo</option>
                    <option value="achievement">Logro</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Monto ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Icono *
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="gift">🎁 Regalo</option>
                    <option value="trophy">🏆 Trofeo</option>
                    <option value="star">⭐ Estrella</option>
                    <option value="cash">💵 Dinero</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Color *
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{
                      width: '100%',
                      height: '42px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Tipo de Condición *
                </label>
                <select
                  value={formData.condition_type}
                  onChange={(e) => setFormData({ ...formData, condition_type: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="manual">Asignación Manual</option>
                  <option value="trips_count">Número de Viajes</option>
                  <option value="earnings_amount">Monto de Ganancias</option>
                  <option value="rating_above">Rating Mínimo</option>
                </select>
              </div>

              {formData.condition_type !== 'manual' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Valor de Condición *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.condition_value}
                      onChange={(e) => setFormData({ ...formData, condition_value: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Período *
                    </label>
                    <select
                      value={formData.condition_period}
                      onChange={(e) => setFormData({ ...formData, condition_period: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                      <option value="all_time">Todo el tiempo</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: '600' }}>Recompensa activa</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FFD711',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {editingReward ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

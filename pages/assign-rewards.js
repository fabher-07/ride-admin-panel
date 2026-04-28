import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveRewards, assignRewardToDriver } from '@/services/rewardsService'

export default function AssignRewardsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [drivers, setDrivers] = useState([])
  const [rewards, setRewards] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [selectedReward, setSelectedReward] = useState(null)
  const [notes, setNotes] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setMounted(true)
    if (!user) {
      router.push('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch active drivers
      const { data: driversData } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users(full_name, email)
        `)
        .eq('status', 'approved')
        .order('name')

      setDrivers(driversData || [])

      // Fetch active rewards
      const { rewards: rewardsData } = await getActiveRewards()
      setRewards(rewardsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedDriver || !selectedReward) {
      alert('Selecciona un conductor y una recompensa')
      return
    }

    try {
      const { assignment, error } = await assignRewardToDriver(
        selectedDriver.id,
        selectedReward.id,
        notes || null
      )

      if (error) throw error

      alert(`Recompensa "${selectedReward.title}" asignada a ${selectedDriver.name}`)
      setSelectedDriver(null)
      setSelectedReward(null)
      setNotes('')
    } catch (error) {
      console.error('Error assigning reward:', error)
      alert('Error al asignar recompensa: ' + error.message)
    }
  }

  const filteredDrivers = drivers.filter(driver =>
    driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.economico?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!mounted) return null

  return (
    <DashboardLayout>
      <Head>
        <title>Asignar Recompensas - GO!T Admin</title>
      </Head>

      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
            🎁 Asignar Recompensas
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Asigna bonos y recompensas manualmente a conductores destacados
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Cargando...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Columna izquierda: Seleccionar conductor */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e0e0e0' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                1. Selecciona un Conductor
              </h2>
              
              <input
                type="text"
                placeholder="Buscar por nombre o económico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}
              />

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedDriver?.id === driver.id ? '#FFF9E6' : '#f9f9f9',
                      border: selectedDriver?.id === driver.id ? '2px solid #FFD711' : '1px solid #e0e0e0',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '15px' }}>{driver.name}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                          {driver.economico} • {driver.user?.email}
                        </p>
                      </div>
                      {selectedDriver?.id === driver.id && (
                        <span style={{ fontSize: '20px' }}>✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredDrivers.length === 0 && (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  No se encontraron conductores
                </p>
              )}
            </div>

            {/* Columna derecha: Seleccionar recompensa y asignar */}
            <div>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e0e0e0', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                  2. Selecciona una Recompensa
                </h2>

                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {rewards.map((reward) => (
                    <div
                      key={reward.id}
                      onClick={() => setSelectedReward(reward)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedReward?.id === reward.id ? '#FFF9E6' : '#f9f9f9',
                        border: selectedReward?.id === reward.id ? '2px solid #FFD711' : '1px solid #e0e0e0',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: reward.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px'
                          }}
                        >
                          {reward.icon === 'gift' && '🎁'}
                          {reward.icon === 'trophy' && '🏆'}
                          {reward.icon === 'star' && '⭐'}
                          {reward.icon === 'cash' && '💵'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: '600', fontSize: '15px' }}>{reward.title}</p>
                          {reward.amount > 0 && (
                            <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: '#4CAF50' }}>
                              ${reward.amount.toFixed(2)}
                            </p>
                          )}
                        </div>
                        {selectedReward?.id === reward.id && (
                          <span style={{ fontSize: '20px' }}>✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {rewards.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                    No hay recompensas activas
                  </p>
                )}
              </div>

              {/* Notas y botón de asignar */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e0e0e0' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                  3. Confirmar Asignación
                </h2>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Por excelente desempeño en diciembre"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {selectedDriver && selectedReward && (
                  <div style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Resumen:</p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '15px' }}>
                      <strong>{selectedDriver.name}</strong> recibirá
                    </p>
                    <p style={{ margin: 0, fontSize: '15px' }}>
                      <strong style={{ color: '#FFD711' }}>{selectedReward.title}</strong>
                      {selectedReward.amount > 0 && (
                        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}> (+${selectedReward.amount})</span>
                      )}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleAssign}
                  disabled={!selectedDriver || !selectedReward}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: selectedDriver && selectedReward ? '#FFD711' : '#ccc',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: selectedDriver && selectedReward ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                >
                  {selectedDriver && selectedReward ? 'Asignar Recompensa' : 'Selecciona conductor y recompensa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

const mapContainerStyle = {
  width: '100%',
  height: 'calc(100vh - 100px)',
}

const center = {
  lat: 19.0414,
  lng: -98.2063,
}

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
}

export default function MapView() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyALX96dRQhZKLXnsmmYH0VK72uLK-mvrQ0',
  })

  const [map, setMap] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  const [availableTaxis, setAvailableTaxis] = useState([])
  const [activeTrips, setActiveTrips] = useState([])
  const [stats, setStats] = useState({
    available: 0,
    inProgress: 0,
    paused: 0,
    total: 0,
  })

  // Fetch available drivers from Supabase
  const fetchAvailableDrivers = async () => {
    try {
      const { data: driversData, error } = await supabase
        .from('drivers')
        .select(`
          id,
          economico,
          current_latitude,
          current_longitude,
          heading,
          is_online,
          user:users(full_name)
        `)
        .eq('status', 'approved')
        .eq('is_online', true)
        .not('current_latitude', 'is', null)
        .not('current_longitude', 'is', null)

      if (error) throw error

      const taxis = driversData.map(driver => ({
        id: driver.id,
        lat: parseFloat(driver.current_latitude),
        lng: parseFloat(driver.current_longitude),
        driver: driver.user?.full_name || 'Sin nombre',
        economico: driver.economico,
        heading: driver.heading,
      }))

      setAvailableTaxis(taxis)
      return taxis.length
    } catch (error) {
      console.error('Error fetching available drivers:', error)
      return 0
    }
  }

  // Fetch active trips from Supabase
  const fetchActiveTrips = async () => {
    try {
      const { data: tripsData, error } = await supabase
        .from('trips')
        .select('*')
        .in('status', ['accepted', 'in_progress'])
        .not('current_latitude', 'is', null)
        .not('current_longitude', 'is', null)

      if (error) throw error

      const trips = tripsData.map(trip => {
        // Parse route polyline or create simple route
        let route = []
        if (trip.pickup_latitude && trip.pickup_longitude && trip.dropoff_latitude && trip.dropoff_longitude) {
          route = [
            { lat: parseFloat(trip.pickup_latitude), lng: parseFloat(trip.pickup_longitude) },
            { lat: parseFloat(trip.current_latitude), lng: parseFloat(trip.current_longitude) },
            { lat: parseFloat(trip.dropoff_latitude), lng: parseFloat(trip.dropoff_longitude) },
          ]
        }

        return {
          id: trip.id,
          status: trip.status === 'accepted' ? 'recogiendo' : 'in_progress',
          driver: 'Conductor',
          passenger: 'Pasajero',
          currentLat: parseFloat(trip.current_latitude),
          currentLng: parseFloat(trip.current_longitude),
          origin: trip.pickup_latitude && trip.pickup_longitude ? {
            lat: parseFloat(trip.pickup_latitude),
            lng: parseFloat(trip.pickup_longitude)
          } : null,
          destination: trip.dropoff_latitude && trip.dropoff_longitude ? {
            lat: parseFloat(trip.dropoff_latitude),
            lng: parseFloat(trip.dropoff_longitude)
          } : null,
          route: route,
        }
      })

      setActiveTrips(trips)
      return {
        inProgress: trips.filter(t => t.status === 'in_progress').length,
        paused: trips.filter(t => t.status === 'paused').length,
      }
    } catch (error) {
      console.error('Error fetching active trips:', error)
      return { inProgress: 0, paused: 0 }
    }
  }

  // Fetch all data and update stats
  const fetchMapData = async () => {
    try {
      setLoading(true)
      const availableCount = await fetchAvailableDrivers()
      const tripStats = await fetchActiveTrips()

      setStats({
        available: availableCount,
        inProgress: tripStats.inProgress,
        paused: tripStats.paused,
        total: availableCount + tripStats.inProgress + tripStats.paused,
      })

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching map data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchMapData()

    // Subscribe to real-time driver location updates
    const driversSubscription = supabase
      .channel('map_drivers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drivers',
        filter: 'is_online=eq.true'
      }, () => {
        fetchAvailableDrivers()
      })
      .subscribe()

    // Subscribe to real-time trip updates
    const tripsSubscription = supabase
      .channel('map_trips_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trips'
      }, () => {
        fetchActiveTrips()
      })
      .subscribe()

    // Refresh map data every 10 seconds
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1)
      fetchMapData()
    }, 10000)

    return () => {
      driversSubscription.unsubscribe()
      tripsSubscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const onLoad = useCallback((map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  if (!isLoaded || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">{!isLoaded ? 'Cargando mapa...' : 'Cargando ubicaciones en tiempo real...'}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <>
      <Head>
        <title>GO!T Admin - Mapa en Tiempo Real</title>
        <meta name="description" content="Mapa de taxis y viajes en tiempo real" />
      </Head>

      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mapa en Tiempo Real</h1>
              {mounted && (
                <p className="text-gray-600 mt-1">
                  Última actualización: {lastUpdate.toLocaleTimeString('es-MX')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 font-medium">Actualizando cada 10s</span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxis Disponibles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚕</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viajes en Curso</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚗</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viajes en Pausa</p>
                <p className="text-2xl font-bold text-gray-900">{stats.paused}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏸️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Activos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Leyenda</h3>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Taxis Disponibles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Viajes en Curso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Viajes en Pausa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500" style={{ height: '2px' }}></div>
              <span className="text-sm text-gray-700">Rutas Activas</span>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={14}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
          >
            {/* Taxis Disponibles - Marcadores Verdes */}
            {availableTaxis.map((taxi) => (
              <Marker
                key={`taxi-${taxi.id}`}
                position={{ lat: taxi.lat, lng: taxi.lng }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#22C55E',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                }}
                title={`${taxi.driver} - #${taxi.economico}`}
              />
            ))}

            {/* Viajes Activos */}
            {activeTrips.map((trip) => (
              <div key={`trip-${trip.id}`}>
                {/* Marcador del taxi en viaje */}
                <Marker
                  position={{ lat: trip.currentLat, lng: trip.currentLng }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: trip.status === 'paused' ? '#F97316' : '#3B82F6',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                  }}
                  title={`${trip.driver} → ${trip.passenger}`}
                />

                {/* Ruta del viaje */}
                <Polyline
                  path={trip.route}
                  options={{
                    strokeColor: trip.status === 'paused' ? '#F97316' : '#3B82F6',
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                  }}
                />

                {/* Marcador de origen */}
                <Marker
                  position={trip.origin}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#10B981',
                    fillOpacity: 0.8,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                  }}
                  title="Origen"
                />

                {/* Marcador de destino */}
                <Marker
                  position={trip.destination}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#EF4444',
                    fillOpacity: 0.8,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                  }}
                  title="Destino"
                />
              </div>
            ))}
          </GoogleMap>
        </div>

        {/* Active Trips List */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Viajes Activos</h3>
          <div className="space-y-3">
            {activeTrips.map((trip) => (
              <div
                key={trip.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  trip.status === 'paused'
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      trip.status === 'paused' ? 'bg-orange-500' : 'bg-blue-500 animate-pulse'
                    }`}
                  ></div>
                  <div>
                    <p className="font-semibold text-gray-900">{trip.driver}</p>
                    <p className="text-sm text-gray-600">Pasajero: {trip.passenger}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      trip.status === 'paused'
                        ? 'bg-orange-200 text-orange-800'
                        : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    {trip.status === 'paused' ? 'En Pausa' : 'En Curso'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

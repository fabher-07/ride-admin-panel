# RIDE Admin Panel

Panel de administración web para RIDE - Sistema de gestión de taxis.

## 🚀 Inicio Rápido

### Instalación

```bash
cd admin-panel
npm install
```

### Configuración

1. Copia el archivo `.env.local.example` a `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Las credenciales de Supabase ya están configuradas en el archivo de ejemplo.

### Desarrollo

```bash
npm run dev
```

El panel estará disponible en: http://localhost:3001

### Producción

```bash
npm run build
npm start
```

## 📊 Características

### Tablero General
- **4 KPIs Principales:**
  - Viajes activos en tiempo real
  - Taxis conectados (% del total)
  - Ingresos del día (comparativa vs ayer)
  - Aprobaciones pendientes

- **Estadísticas de Usuarios:**
  - Total de conductores y pasajeros
  - Conductores por plan (Semanal, Mensual, Anual)
  - Pasajeros activos, nuevos y que viajaron hoy

- **Gráficas:**
  - Actividad por hora (barras)
  - Distribución por zonas (pie chart)
  - Métricas de rendimiento (líneas)

- **Widgets:**
  - Ingresos por plan de suscripción
  - Crecimiento últimos 7 días
  - Alertas prioritarias

### Actualización en Tiempo Real
- Los datos se actualizan automáticamente cada 10 segundos
- Indicadores visuales de estado "en vivo"

### Filtros
- Hoy
- Esta Semana
- Este Mes

## 🛠️ Tecnologías

- **Framework:** Next.js 14
- **UI:** React 18 + TailwindCSS
- **Gráficas:** Recharts
- **Base de Datos:** Supabase
- **Fechas:** date-fns

## 📁 Estructura

```
admin-panel/
├── components/          # Componentes React
│   ├── DashboardLayout.js
│   ├── KPICard.js
│   ├── UserStatsCard.js
│   ├── ActivityChart.js
│   ├── ZoneDistributionChart.js
│   ├── PerformanceMetrics.js
│   ├── RevenueWidget.js
│   ├── GrowthWidget.js
│   └── AlertsWidget.js
├── lib/                 # Utilidades
│   └── supabase.js
├── pages/              # Páginas Next.js
│   ├── _app.js
│   └── index.js
├── styles/             # Estilos globales
│   └── globals.css
└── public/             # Archivos estáticos
```

## 🎨 Diseño

- **Colores principales:**
  - Primario: #FFD711 (Amarillo GO!T)
  - Secundario: #000000 (Negro)

- **Sidebar colapsable**
- **Diseño responsive**
- **Tema claro optimizado**

## 📝 Próximas Pantallas

1. Gestión de Conductores
2. Gestión de Pasajeros
3. Monitoreo de Viajes
4. Gestión de Pagos
5. Soporte y Tickets
6. Configuración del Sistema

## 🔗 Conexión con App Móvil

El panel comparte la misma base de datos Supabase que la aplicación móvil, permitiendo:
- Ver datos en tiempo real
- Aprobar documentos de conductores
- Gestionar disputas
- Monitorear viajes activos
- Analizar métricas de rendimiento

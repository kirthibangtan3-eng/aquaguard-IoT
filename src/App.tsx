import { useState, useEffect } from "react";
import { 
  Droplets, 
  Map as MapIcon, 
  AlertTriangle, 
  Settings, 
  Activity, 
  ShieldAlert,
  Search,
  Plus,
  Bell,
  User,
  ChevronRight,
  BarChart3,
  MapPin,
  Battery,
  Clock,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Sensor, Alert } from "./types";
import { getSensors, getAlerts, triggerPredictiveAnalysis, toggleMaintenanceMode } from "./services/sensorService";
import { APP_NAME } from "./constants";

// Fix for default marker icon in Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function App() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'dashboard' | 'map' | 'alerts' | 'reports'>('home');
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sensorData, alertData] = await Promise.all([
          getSensors(),
          getAlerts()
        ]);
        setSensors(sensorData);
        setAlerts(alertData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Faster refresh for real-time feel
    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = async (sensorId: string) => {
    setIsAnalyzing(true);
    setPrediction(null);
    try {
      const result = await triggerPredictiveAnalysis(sensorId);
      setPrediction(result.analysis);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleMaintenance = async (sensorId: string, enabled: boolean) => {
    try {
      await toggleMaintenanceMode(sensorId, enabled);
      setSensors(prev => prev.map(s => s.id === sensorId ? { ...s, isMaintenanceMode: enabled } : s));
      if (selectedSensor && selectedSensor.id === sensorId) {
        setSelectedSensor({ ...selectedSensor, isMaintenanceMode: enabled });
      }
    } catch (error) {
      console.error("Failed to toggle maintenance mode:", error);
    }
  };

  const activeAlerts = alerts.filter(alert => {
    const sensor = sensors.find(s => s.id === alert.sensorId);
    return !sensor?.isMaintenanceMode;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-blue-50 text-blue-600">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Droplets className="w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-blue-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-blue-200 bg-white flex flex-col shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-blue-900">{APP_NAME}</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem 
            icon={<Activity className="w-5 h-5" />} 
            label="Home" 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
          />
          <NavItem 
            icon={<BarChart3 className="w-5 h-5" />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<MapIcon className="w-5 h-5" />} 
            label="Map View" 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
          />
          <NavItem 
            icon={<AlertTriangle className="w-5 h-5" />} 
            label="Alerts" 
            active={activeTab === 'alerts'} 
            badge={activeAlerts.length}
            onClick={() => setActiveTab('alerts')} 
          />
        </nav>

        <div className="p-4 border-t border-blue-100">
          <NavItem icon={<Settings className="w-5 h-5" />} label="Settings" active={false} onClick={() => {}} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-blue-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 w-96">
            <Search className="w-4 h-4 text-blue-400" />
            <input 
              type="text" 
              placeholder="Search sensors, sections, or alerts..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-blue-300"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-blue-400 hover:text-blue-600 transition-colors">
              <Bell className="w-5 h-5" />
              {activeAlerts.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-blue-100">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-900">Admin User</p>
                <p className="text-[10px] text-slate-400">System Architect</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-12 py-8"
              >
                <div className="text-center space-y-4">
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="inline-block p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-200 mb-4"
                  >
                    <Droplets className="w-12 h-12 text-white" />
                  </motion.div>
                  <h1 className="text-5xl font-black text-blue-900 tracking-tight">Welcome to {APP_NAME}</h1>
                  <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    The next generation of water infrastructure management. Monitor, analyze, and protect your pipeline network with real-time IoT intelligence.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm space-y-4">
                    <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-blue-600" />
                      App Description
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      AquaGuard IoT is a comprehensive monitoring solution designed for large-scale water distribution networks. Using GPS-enabled sensor nodes, we track water flow, pressure, and hardware health across thousands of kilometers of pipeline. Our AI-driven backend predicts maintenance needs before failures occur, saving millions in infrastructure costs.
                    </p>
                  </div>

                  <div className="bg-blue-600 p-8 rounded-3xl shadow-xl shadow-blue-200 text-white space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6" />
                      Safety Precautions
                    </h3>
                    <ul className="space-y-3 text-blue-50 text-sm">
                      <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        Always verify sensor offline alerts manually before dispatching heavy machinery.
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        Do not attempt to modify sensor hardware while the pipeline is under high pressure.
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        Ensure all field engineers are equipped with proper PPE when investigating red-status nodes.
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-blue-900">Get Started</h3>
                    <div className="flex gap-4">
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Sign Up Now
                      </button>
                      <button className="px-6 py-2 bg-blue-50 text-blue-600 rounded-full font-bold text-sm hover:bg-blue-100 transition-colors">
                        Contact Support
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <HelpCard 
                      title="Getting Started" 
                      desc="Learn how to register your first sensor node."
                    />
                    <HelpCard 
                      title="AI Predictions" 
                      desc="Understand how our flow analysis works."
                    />
                    <HelpCard 
                      title="API Docs" 
                      desc="Integrate your own hardware with our cloud."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6">
                  <StatCard title="Total Sensors" value={sensors.length} icon={<Activity className="text-blue-500" />} trend="+2 this month" />
                  <StatCard title="Active Flow" value={sensors.filter(s => s.status === 'flowing' && !s.isMaintenanceMode).length} icon={<Droplets className="text-blue-600" />} trend="94% Efficiency" />
                  <StatCard title="Active Alerts" value={activeAlerts.length} icon={<AlertTriangle className="text-amber-500" />} trend={`${activeAlerts.filter(a => a.severity === 'critical').length} critical`} />
                  <StatCard title="In Maintenance" value={sensors.filter(s => s.isMaintenanceMode).length} icon={<Settings className="text-blue-700" />} trend="Under Service" />
                </div>

                <div className="grid grid-cols-3 gap-8">
                  {/* Sensor List */}
                  <div className="col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-blue-900">Pipeline Sensors</h2>
                      <button className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                        <Plus className="w-3 h-3" /> Register New
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {sensors.map(sensor => (
                        <div key={sensor.id}>
                          <SensorRow 
                            sensor={sensor} 
                            onClick={() => setSelectedSensor(sensor)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Alerts */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-blue-900">Recent Alerts</h2>
                    <div className="space-y-3">
                      {activeAlerts.map(alert => (
                        <div key={alert.id}>
                          <AlertCard alert={alert} />
                        </div>
                      ))}
                      {activeAlerts.length === 0 && (
                        <div className="p-8 text-center bg-white rounded-3xl border border-blue-100">
                          <p className="text-sm text-slate-400 font-medium">No active alerts</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div 
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full rounded-3xl border border-blue-200 bg-white overflow-hidden relative shadow-lg"
              >
                <div className="absolute top-6 right-6 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-md border border-blue-100 px-3 py-1.5 rounded-full shadow-sm">
                  <motion.div 
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 bg-red-500 rounded-full"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Live Updates</span>
                </div>

                <MapContainer 
                  center={[40.72, -74.01]} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {sensors.map(sensor => (
                    <Marker 
                      key={sensor.id} 
                      position={[sensor.location.lat, sensor.location.lng]}
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `
                          <div class="relative group">
                            ${sensor.status === 'flowing' && !sensor.isMaintenanceMode ? `
                              <div class="absolute inset-[-8px] bg-emerald-400 rounded-full opacity-50 animate-ping"></div>
                            ` : ''}
                            <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg relative z-10 ${
                              sensor.isMaintenanceMode ? 'bg-blue-400' :
                              sensor.status === 'flowing' ? 'bg-emerald-500' : 
                              sensor.status === 'no-flow' ? 'bg-red-500' : 'bg-amber-500'
                            }"></div>
                          </div>
                        `,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                      })}
                      eventHandlers={{
                        click: () => setSelectedSensor(sensor),
                      }}
                    >
                      <Popup>
                        <div className="p-2 min-w-[150px]">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                            <span className="text-xs font-black text-blue-900 uppercase tracking-widest">{sensor.id}</span>
                            <span className={`w-2 h-2 rounded-full ${
                              sensor.isMaintenanceMode ? 'bg-blue-400' :
                              sensor.status === 'flowing' ? 'bg-emerald-400' : 
                              sensor.status === 'no-flow' ? 'bg-red-400' : 'bg-amber-400'
                            }`}></span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-400 uppercase">Status</span>
                              <span className="capitalize text-slate-700">{sensor.isMaintenanceMode ? 'Maintenance' : sensor.status}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-400 uppercase">Battery</span>
                              <span className="text-slate-700">{sensor.battery}%</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-400 uppercase">Section</span>
                              <span className="truncate ml-2 text-slate-700">{sensor.section}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedSensor(sensor)}
                            className="w-full mt-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>

                <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md border border-blue-100 p-4 rounded-2xl shadow-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span>Normal Flow</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>No Flow Detected</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span>Sensor Offline</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                    <span>Maintenance Mode</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Sensor Detail Modal */}
      <AnimatePresence>
        {selectedSensor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-blue-900/20 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-blue-100 rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-10 border-b border-blue-50 flex justify-between items-start bg-blue-50/50">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-4xl font-black text-blue-900 tracking-tight">{selectedSensor.id}</h2>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      selectedSensor.isMaintenanceMode ? 'bg-blue-100 text-blue-600 border border-blue-200' :
                      selectedSensor.status === 'flowing' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 
                      'bg-red-100 text-red-600 border border-red-200'
                    }`}>
                      {selectedSensor.isMaintenanceMode ? 'Maintenance' : selectedSensor.status}
                    </span>
                  </div>
                  <p className="text-slate-400 flex items-center gap-2 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-blue-400" /> {selectedSensor.section}
                  </p>
                </div>
                <button 
                  onClick={() => { setSelectedSensor(null); setPrediction(null); }}
                  className="p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all shadow-sm border border-blue-100"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-3 gap-10">
                <div className="col-span-2 space-y-10">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
                      <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-2">Battery</p>
                      <div className="flex items-center gap-2">
                        <Battery className={`w-5 h-5 ${selectedSensor.battery < 20 ? 'text-red-500' : 'text-emerald-500'}`} />
                        <span className="text-2xl font-black text-blue-900">{selectedSensor.battery}%</span>
                      </div>
                    </div>
                    <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
                      <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-2">Last Update</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span className="text-lg font-black text-blue-900">{new Date(selectedSensor.lastUpdate).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
                      <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-2">GPS Location</p>
                      <div className="text-xs font-mono font-bold text-slate-500">
                        {selectedSensor.location.lat.toFixed(4)}, {selectedSensor.location.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {/* Flow History Graph Placeholder */}
                  <div className="bg-white rounded-3xl border border-blue-100 p-8 h-72 flex flex-col shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Flow Rate History (24h)</h3>
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Liters/min</span>
                      </div>
                    </div>
                    <div className="flex-1 flex items-end gap-1.5">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="flex-1 bg-blue-100 rounded-t-lg hover:bg-blue-600 transition-all cursor-help"
                          style={{ height: `${Math.random() * 80 + 10}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-200">
                    <h3 className="text-sm font-black mb-6 flex items-center gap-2 uppercase tracking-widest">
                      <ShieldAlert className="w-5 h-5" />
                      AI Analysis
                    </h3>
                    <p className="text-xs text-blue-100 mb-8 leading-relaxed font-medium">
                      Our neural network is processing historical flow data to identify anomalies.
                    </p>
                    
                    {!prediction && !isAnalyzing && (
                      <button 
                        onClick={() => handleAnalyze(selectedSensor.id)}
                        className="w-full py-4 bg-white text-blue-600 hover:bg-blue-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                      >
                        Run AI Analysis
                      </button>
                    )}

                    {isAnalyzing && (
                      <div className="flex flex-col items-center gap-4 py-4">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Activity className="w-8 h-8 text-white" />
                        </motion.div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">Analyzing Patterns...</p>
                      </div>
                    )}

                    {prediction && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-blue-200 tracking-widest">Risk Level</span>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                            prediction.riskLevel === 'high' ? 'bg-red-500 text-white' : 
                            prediction.riskLevel === 'medium' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-white'
                          }`}>
                            {prediction.riskLevel}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest">Predicted Issue</p>
                          <p className="text-sm font-bold leading-relaxed">{prediction.predictedIssue}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest">Recommendation</p>
                          <p className="text-xs text-blue-50 font-medium leading-relaxed italic">"{prediction.recommendation}"</p>
                        </div>
                        <div className="pt-6 border-t border-blue-500 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-blue-200 tracking-widest">Confidence</span>
                          <span className="text-sm font-black">{(prediction.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="bg-white border border-blue-100 rounded-[32px] p-8 shadow-sm">
                    <h3 className="text-sm font-black text-blue-900 mb-6 uppercase tracking-widest">Maintenance</h3>
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <span className="text-xs font-bold text-blue-900">Maintenance Mode</span>
                      <div 
                        onClick={() => handleToggleMaintenance(selectedSensor.id, !selectedSensor.isMaintenanceMode)}
                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${selectedSensor.isMaintenanceMode ? 'bg-blue-600' : 'bg-blue-200'}`}
                      >
                        <motion.div 
                          animate={{ x: selectedSensor.isMaintenanceMode ? 24 : 4 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </div>
                    </div>
                    {selectedSensor.isMaintenanceMode && (
                      <p className="mt-4 text-[10px] text-blue-600 font-bold uppercase tracking-widest text-center">
                        Alerts suppressed for this sensor
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HelpCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 hover:border-blue-300 transition-colors cursor-pointer group">
      <h4 className="font-black text-blue-900 text-sm mb-2 group-hover:text-blue-600 transition-colors">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
        active ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
      }`}
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-sm font-black uppercase tracking-widest">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${active ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string | number, icon: any, trend: string }) {
  return (
    <div className="bg-white border border-blue-100 p-8 rounded-[32px] shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-blue-50 rounded-2xl">{icon}</div>
        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{trend}</span>
      </div>
      <p className="text-slate-400 text-[10px] font-black mb-2 uppercase tracking-widest">{title}</p>
      <h3 className="text-4xl font-black text-blue-900 tracking-tight">{value}</h3>
    </div>
  );
}

function SensorRow({ sensor, onClick }: { sensor: Sensor, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border border-blue-100 p-6 rounded-[32px] flex items-center justify-between hover:bg-blue-50 transition-all cursor-pointer group shadow-sm ${
        sensor.isMaintenanceMode ? 'opacity-75 grayscale-[0.2]' : ''
      }`}
    >
      <div className="flex items-center gap-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
          sensor.isMaintenanceMode ? 'bg-blue-50 text-blue-500' :
          sensor.status === 'flowing' ? 'bg-emerald-50 text-emerald-500' : 
          sensor.status === 'no-flow' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
        }`}>
          {sensor.isMaintenanceMode ? <Settings className="w-8 h-8" /> : <Droplets className="w-8 h-8" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-black text-blue-900 text-lg group-hover:text-blue-600 transition-colors tracking-tight">{sensor.id}</h4>
            {sensor.isMaintenanceMode && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase rounded tracking-widest">Maintenance</span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{sensor.section}</p>
        </div>
      </div>

      <div className="flex items-center gap-16">
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Status</p>
          <p className={`text-xs font-black uppercase tracking-widest ${
            sensor.isMaintenanceMode ? 'text-blue-500' :
            sensor.status === 'flowing' ? 'text-emerald-500' : 
            sensor.status === 'no-flow' ? 'text-red-500' : 'text-amber-500'
          }`}>{sensor.isMaintenanceMode ? 'Maintenance' : sensor.status}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Battery</p>
          <p className="text-xs font-black text-blue-900">{sensor.battery}%</p>
        </div>
        <ChevronRight className="w-6 h-6 text-blue-200 group-hover:text-blue-600 transition-colors" />
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  return (
    <div className={`p-6 rounded-[32px] border flex gap-6 shadow-sm ${
      alert.severity === 'high' || alert.severity === 'critical' 
        ? 'bg-red-50 border-red-100' 
        : 'bg-amber-50 border-amber-100'
    }`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
        alert.severity === 'high' || alert.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
      }`}>
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{alert.sensorId}</h4>
          <span className="text-[10px] font-bold text-slate-400">{new Date(alert.timestamp).toLocaleTimeString()}</span>
        </div>
        <p className="text-xs font-bold text-slate-700 leading-relaxed">{alert.message}</p>
        <button className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest pt-2">
          View Details
        </button>
      </div>
    </div>
  );
}

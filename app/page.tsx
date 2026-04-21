'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import AddIcon from '@mui/icons-material/Add';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import WifiTetheringOutlinedIcon from '@mui/icons-material/WifiTetheringOutlined';
import RouterOutlinedIcon from '@mui/icons-material/RouterOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VisibilityIcon from '@mui/icons-material/Visibility';

type DeviceType = 'ticket_machine' | 'wifi_router' | 'transmission_router' | 'qr_reader';

interface Device {
  id?: number;
  name: string;
  type: DeviceType;
  location?: string;
  serial_number?: string;
  status?: string;
}

const DEVICE_TYPES = [
  { value: 'ticket_machine', label: 'Maquina Expendedora', icon: ConfirmationNumberOutlinedIcon },
  { value: 'wifi_router', label: 'Router WiFi', icon: WifiTetheringOutlinedIcon },
  { value: 'transmission_router', label: 'Router Transmision', icon: RouterOutlinedIcon },
  { value: 'qr_reader', label: 'Lector QR', icon: QrCode2OutlinedIcon },
];

const ITEMS_PER_PAGE = 50;

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsDevice, setDetailsDevice] = useState<Device | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [filterType, setFilterType] = useState<DeviceType | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const [formData, setFormData] = useState<Device>({
    name: '',
    type: 'ticket_machine',
    location: '',
    serial_number: '',
    status: 'active',
  });

  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    setDarkMode(saved !== 'false');
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'f') {
          e.preventDefault();
          document.getElementById('search-input')?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExport = () => {
    const dataToExport = filteredDevices;
    const headers = ['Name', 'Type', 'Location', 'Serial Number', 'Status'];
    const rows = dataToExport.map(d => [
      d.name,
      DEVICE_TYPES.find(t => t.value === d.type)?.label || d.type,
      d.location,
      d.serial_number,
      d.status,
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devices.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchDevices = async () => {
    try {
      const client = supabase?.client;
      if (!client) {
        setError('Supabase client not initialized');
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await client.from('devices').select('*');
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setDevices(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const client = supabase?.client;
      if (!client) return;

      if (editingDevice?.id) {
        const { error: updateError } = await client
          .from('devices')
          .update(formData)
          .eq('id', editingDevice.id);
        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        const { error: insertError } = await client
          .from('devices')
          .insert([{ ...formData, status: formData.status || 'active' }]);
        if (insertError) {
          setError(insertError.message);
          return;
        }
      }
      fetchDevices();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar dispositivo');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const client = supabase?.client;
      if (!client) return;
      const { error: deleteError } = await client.from('devices').delete().eq('id', id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      fetchDevices();
      setSelectedIds(prev => prev.filter(sid => sid !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar dispositivo');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDevices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDevices.map(d => d.id!).filter(id => id !== undefined));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const client = supabase?.client;
      if (!client) return;
      for (const id of selectedIds) {
        const { error: deleteError } = await client.from('devices').delete().eq('id', id);
        if (deleteError) {
          setError(deleteError.message);
          return;
        }
      }
      setSelectedIds([]);
      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete devices');
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData(device);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingDevice(null);
    setFormData({ name: '', type: 'ticket_machine', location: '', serial_number: '', status: 'active' });
    setError(null);
  };

  const getCounts = () => {
    const counts: Record<DeviceType, number> = {
      ticket_machine: 0,
      wifi_router: 0,
      transmission_router: 0,
      qr_reader: 0,
    };
    devices.forEach(d => counts[d.type]++);
    return counts;
  };

  const counts = getCounts();
  
  let filteredDevices = filterType === 'all' ? devices : devices.filter(d => d.type === filterType);
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredDevices = filteredDevices.filter(d => 
      d.name?.toLowerCase().includes(query) ||
      d.serial_number?.toLowerCase().includes(query) ||
      d.location?.toLowerCase().includes(query)
    );
  }
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);
  
  const totalPages = Math.ceil(filteredDevices.length / ITEMS_PER_PAGE);
  const paginatedDevices = filteredDevices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getTypeConfig = (type: DeviceType) => DEVICE_TYPES.find(t => t.value === type);

  const theme = {
    bg: darkMode ? 'bg-gray-950' : 'bg-gray-100',
    bg2: darkMode ? 'bg-gray-900/50' : 'bg-white',
    border: darkMode ? 'border-gray-800' : 'border-gray-200',
    text: darkMode ? 'text-white' : 'text-gray-900',
    text2: darkMode ? 'text-gray-100' : 'text-gray-600',
    text3: darkMode ? 'text-gray-500' : 'text-gray-500',
    input: darkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900',
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const text = await file.text();
      const lines = text.trim().split('\n').filter(l => l.trim());
      
      if (lines.length < 2) {
        setError('El archivo está vacío o no tiene filas de datos');
        setImporting(false);
        return;
      }

      const commasInFirst = (lines[0].match(/,/g) || []).length;
      const semiInFirst = (lines[0].match(/;/g) || []).length;
      const separator = semiInFirst > commasInFirst ? ';' : ',';
      
      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      
      const getColIndex = (keywords: string[]) => {
        for (let i = 0; i < headers.length; i++) {
          for (const kw of keywords) {
            if (headers[i].includes(kw)) return i;
          }
        }
        return -1;
      };

      const nameIdx = getColIndex(['name', 'nombre']);
      const typeIdx = getColIndex(['type', 'tipo']);
      const locationIdx = getColIndex(['location', 'ubicación', 'loc']);
      const serialIdx = getColIndex(['serial', 'serie', 'sn']);

      if (nameIdx === -1) {
        setError('Columna "Name" no encontrada');
        setImporting(false);
        return;
      }

      const devicesToImport: Device[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(new RegExp(`(?<=${separator})(?=(?:[^"]*"[^"]*")*[^"]*$)|${separator}`)).map(v => v.trim().replace(/^"|"$/g, ''));
        
        const name = values[nameIdx]?.replace(/^"|"$/g, '').trim() || '';
        if (!name) continue;

        let type: DeviceType = 'ticket_machine';
        if (typeIdx !== -1 && typeIdx < values.length && values[typeIdx]) {
          const typeStr = values[typeIdx].toLowerCase();
          if (typeStr.includes('wifi')) type = 'wifi_router';
          else if (typeStr.includes('router') || typeStr.includes('transmission')) type = 'transmission_router';
          else if (typeStr.includes('qr') || typeStr.includes('code')) type = 'qr_reader';
          else if (typeStr.includes('ticket') || typeStr.includes('maquin')) type = 'ticket_machine';
        }

        devicesToImport.push({
          name,
          type,
          status: 'active',
          location: (locationIdx !== -1 && locationIdx < values.length) ? values[locationIdx]?.replace(/^"|"$/g, '').trim() || '' : '',
          serial_number: (serialIdx !== -1 && serialIdx < values.length) ? values[serialIdx]?.replace(/^"|"$/g, '').trim() || '' : '',
        });
      }

      if (devicesToImport.length === 0) {
        setError('No se encontraron dispositivos válidos');
        setImporting(false);
        return;
      }

      const client = supabase?.client;
      if (!client) {
        setError('Supabase client no inicializado');
        setImporting(false);
        return;
      }

      const { error: insertError } = await client
        .from('devices')
        .insert(devicesToImport);

      if (insertError) {
        setError(insertError.message);
        setImporting(false);
        return;
      }

      fetchDevices();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    }

    setImporting(false);
    e.target.value = '';
  };

  const toggleStatus = async (device: Device) => {
    if (!device.id) return;
    try {
      const client = supabase?.client;
      if (!client) return;
      const newStatus = device.status === 'active' ? 'inactive' : 'active';
      const { error } = await client
        .from('devices')
        .update({ status: newStatus })
        .eq('id', device.id);
      if (error) {
        setError(error.message);
        return;
      }
      fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const handleViewDetails = (device: Device) => {
    setDetailsDevice(device);
    setShowDetails(true);
  };

  if (error && !supabase?.client) {
    return (
      <div className={`min-h-screen ${theme.bg} p-8`}>
        <div className="max-w-6xl mx-auto">
          <h1 className={`text-3xl font-bold mb-8 ${theme.text}`}>Registro de Dispositivos</h1>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error de Conexion</h2>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors relative overflow-hidden`}>
      {darkMode && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-blue-500/15 to-cyan-400/10 blur-[80px] pointer-events-none" />
        </>
      )}

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${darkMode ? 'bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent' : 'text-gray-900'}`}>
              Registro de Dispositivos
            </h1>
            <p className={`${theme.text3} mt-1`}>Gestiona tu infraestructura</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all cursor-pointer hover:opacity-70"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all cursor-pointer hover:opacity-70"
              title="Estadisticas globales"
            >
              <AssessmentOutlinedIcon className={theme.text} />
            </button>
          </div>
        </header>

        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6`}>
          <button
            onClick={() => setFilterType('ticket_machine')}
            className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer ${
              filterType === 'ticket_machine'
                ? 'bg-gradient-to-br from-blue-500/20 to-cyan-400/20 border-2 border-cyan-400/50 scale-105 shadow-lg shadow-cyan-500/20'
                : `${theme.bg2} border-2 ${theme.border} hover:border-gray-700`
            }`}
          >
            <div className="relative flex flex-col items-center">
              <ConfirmationNumberOutlinedIcon sx={{ fontSize: 40 }} className={`mb-2 ${theme.text}`} />
              <div className={`text-sm ${theme.text2}`}>Maquina Expendedora</div>
              <div className={`text-3xl font-bold ${theme.text} mt-2`}>{counts.ticket_machine}</div>
            </div>
          </button>
          <button
            onClick={() => setFilterType('wifi_router')}
            className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer ${
              filterType === 'wifi_router'
                ? 'bg-gradient-to-br from-green-400/20 to-emerald-500/20 border-2 border-emerald-500/50 scale-105 shadow-lg shadow-emerald-500/20'
                : `${theme.bg2} border-2 ${theme.border} hover:border-gray-700`
            }`}
          >
            <div className="relative flex flex-col items-center">
              <WifiTetheringOutlinedIcon sx={{ fontSize: 40 }} className={`mb-2 ${theme.text}`} />
              <div className={`text-sm ${theme.text2}`}>Router WiFi</div>
              <div className={`text-3xl font-bold ${theme.text} mt-2`}>{counts.wifi_router}</div>
            </div>
          </button>
          <button
            onClick={() => setFilterType('transmission_router')}
            className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer ${
              filterType === 'transmission_router'
                ? 'bg-gradient-to-br from-purple-500/20 to-pink-400/20 border-2 border-pink-500/50 scale-105 shadow-lg shadow-pink-500/20'
                : `${theme.bg2} border-2 ${theme.border} hover:border-gray-700`
            }`}
          >
            <div className="relative flex flex-col items-center">
              <RouterOutlinedIcon sx={{ fontSize: 40 }} className={`mb-2 ${theme.text}`} />
              <div className={`text-sm ${theme.text2}`}>Router Transmision</div>
              <div className={`text-3xl font-bold ${theme.text} mt-2`}>{counts.transmission_router}</div>
            </div>
          </button>
          <button
            onClick={() => setFilterType('qr_reader')}
            className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer ${
              filterType === 'qr_reader'
                ? 'bg-gradient-to-br from-orange-400/20 to-red-500/20 border-2 border-red-500/50 scale-105 shadow-lg shadow-red-500/20'
                : `${theme.bg2} border-2 ${theme.border} hover:border-gray-700`
            }`}
          >
            <div className="relative flex flex-col items-center">
              <QrCode2OutlinedIcon sx={{ fontSize: 40 }} className={`mb-2 ${theme.text}`} />
              <div className={`text-sm ${theme.text2}`}>Lector QR</div>
              <div className={`text-3xl font-bold ${theme.text} mt-2`}>{counts.qr_reader}</div>
            </div>
          </button>
        </div>

        <div className={`flex justify-between items-center mb-6 flex-wrap gap-4`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-2 h-10 ${theme.bg2} border ${theme.border} rounded-xl`}>
              <SearchIcon className={theme.text3} />
              <input
                id="search-input"
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`bg-transparent outline-none w-32 ${theme.text} placeholder-gray-500`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={`${theme.text3} hover:${theme.text}`}>
                  <CloseOutlinedIcon fontSize="small" />
                </button>
              )}
            </div>
            
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as DeviceType | 'all')}
              className={`h-10 ${theme.bg2} border ${theme.border} rounded-xl px-4 py-2 ${theme.text} focus:border-cyan-500/50 focus:outline-none transition-colors cursor-pointer`}
            >
              <option value="all">Todos</option>
              <option value="ticket_machine">Maquina Expendedora</option>
              <option value="wifi_router">Router WiFi</option>
              <option value="transmission_router">Router Transmision</option>
              <option value="qr_reader">Lector QR</option>
            </select>
            {filterType !== 'all' && (
              <button 
                onClick={() => setFilterType('all')}
                className="text-cyan-400 hover:text-cyan-300 text-sm cursor-pointer"
              >
                Limpiar
              </button>
            )}
            {filteredDevices.length > 0 && (
              <button 
                onClick={toggleSelectAll}
                className={`flex items-center gap-1 px-3 h-10 border rounded-lg cursor-pointer transition-colors ${
                  selectedIds.length === filteredDevices.length && filteredDevices.length > 0
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                    : `${theme.bg2} ${theme.border} ${theme.text2} hover:border-cyan-500/50`
                }`}
              >
                <DoneAllIcon fontSize="small" />
                {selectedIds.length === filteredDevices.length ? 'Deseleccionar' : 'Seleccionar'}
              </button>
            )}
            {selectedIds.length > 0 && (
              <button 
                onClick={deleteSelected}
                className="flex items-center gap-1 px-3 h-10 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 rounded-lg cursor-pointer transition-colors text-red-400"
              >
                <DeleteSweepIcon fontSize="small" />
                ({selectedIds.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExport}
              className={`p-3 rounded-xl cursor-pointer transition-all ${theme.text} hover:opacity-70`}
            >
              <DownloadIcon />
            </button>
            
            <label className={`p-3 rounded-xl cursor-pointer transition-all ${theme.text} ${importing ? 'opacity-50' : ''} hover:opacity-70`}>
              <UploadFileIcon />
              {importing ? 'Importando...' : ''}
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleImport}
                className="hidden"
                disabled={importing}
              />
            </label>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 text-white"
            >
              <AddIcon />
              Agregar
            </button>
          </div>
        </div>

        <div className={`${theme.bg2} border ${theme.border} rounded-2xl overflow-hidden backdrop-blur`}>
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-900/80' : 'bg-gray-50'}>
              <tr>
                <th className={`w-12 p-4`}></th>
                <th className={`text-left p-4 font-medium ${theme.text2}`}>Nombre</th>
                <th className={`text-left p-4 font-medium ${theme.text2}`}>Tipo</th>
                <th className={`text-left p-4 font-medium ${theme.text2}`}>Ubicacion</th>
                <th className={`text-left p-4 font-medium ${theme.text2}`}>Serie</th>
                <th className={`text-left p-4 font-medium ${theme.text2}`}>Estado</th>
                <th className={`text-right p-4 font-medium ${theme.text2}`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={`p-12 text-center ${theme.text3}`}>Cargando...</td></tr>
              ) : paginatedDevices.length === 0 ? (
                <tr><td colSpan={7} className={`p-12 text-center ${theme.text3}`}>No se encontraron dispositivos</td></tr>
              ) : (
                paginatedDevices.map(device => {
                  const config = getTypeConfig(device.type);
                  const TypeIcon = config?.icon;
                  return (
                    <tr key={device.id} className={`border-t ${theme.border} hover:bg-cyan-500/5 transition-colors`}>
                      <td className="p-4">
                        <button 
                          onClick={() => device.id && toggleSelect(device.id)}
                          className="cursor-pointer p-1"
                        >
                          {device.id && selectedIds.includes(device.id) 
                            ? <CheckBoxIcon className="text-cyan-400" />
                            : <CheckBoxOutlineBlankIcon className={theme.text2} />
                          }
                        </button>
                      </td>
                      <td className={`p-4 ${theme.text} font-medium`}>{device.name}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${theme.bg} text-sm`}>
                          {TypeIcon && <TypeIcon sx={{ fontSize: 18 }} />}
                          <span className={theme.text2}>{config?.label}</span>
                        </span>
                      </td>
                      <td className={`p-4 ${theme.text2}`}>{device.location || '-'}</td>
                      <td className={`p-4 font-mono text-sm ${theme.text3}`}>{device.serial_number || '-'}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => toggleStatus(device)}
                          className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                            device.status === 'active' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                          }`}
                        >
                          {device.status === 'active' ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleViewDetails(device)} className={`p-2 hover:bg-gray-700 rounded-lg cursor-pointer ${theme.text2}`}>
                          <VisibilityIcon />
                        </button>
                        <button onClick={() => handleEdit(device)} className={`p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg cursor-pointer`}>
                          <EditOutlinedIcon />
                        </button>
                        <button onClick={() => device.id && handleDelete(device.id)} className={`p-2 text-red-400 hover:bg-red-500/20 rounded-lg cursor-pointer`}>
                          <DeleteOutlinedIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div className={`flex items-center justify-between p-4 border-t ${theme.border}`}>
              <div className={`text-sm ${theme.text3}`}>
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredDevices.length)} de {filteredDevices.length}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 cursor-pointer'} ${theme.text}`}
                >
                  <ChevronLeftIcon />
                </button>
                <span className={theme.text2}>Pagina {currentPage} de {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 cursor-pointer'} ${theme.text}`}
                >
                  <ChevronRightIcon />
                </button>
              </div>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`${theme.bg2} border ${theme.border} rounded-2xl shadow-2xl shadow-cyan-500/10 p-8 w-full max-w-md`}>
              <h2 className={`text-2xl font-bold mb-6 ${theme.text}`}>{editingDevice ? 'Editar Dispositivo' : 'Agregar Dispositivo'}</h2>
              {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className={`block text-sm font-medium ${theme.text2} mb-2`}>Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 ${theme.input} rounded-xl focus:border-cyan-500/50 focus:outline-none transition-colors`}
                    placeholder="Nombre del dispositivo"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.text2} mb-2`}>Tipo</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as DeviceType })}
                    className={`w-full px-4 py-3 ${theme.input} rounded-xl focus:border-cyan-500/50 focus:outline-none transition-colors`}
                  >
                    {DEVICE_TYPES.map(dt => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.text2} mb-2`}>Ubicacion</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className={`w-full px-4 py-3 ${theme.input} rounded-xl focus:border-cyan-500/50 focus:outline-none transition-colors`}
                    placeholder="Ubicacion opcional"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.text2} mb-2`}>Numero de Serie</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                    className={`w-full px-4 py-3 ${theme.input} rounded-xl focus:border-cyan-500/50 focus:outline-none transition-colors`}
                    placeholder="SN-XXXXX"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.text2} mb-2`}>Estado</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className={`w-full px-4 py-3 ${theme.input} rounded-xl focus:border-cyan-500/50 focus:outline-none transition-colors`}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-3">
                  <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 text-white">
                    {editingDevice ? 'Guardar' : 'Agregar'}
                  </button>
                  <button type="button" onClick={resetForm} className={`flex-1 py-3 ${theme.bg2} border ${theme.border} rounded-xl hover:border-cyan-500/50 transition-colors ${theme.text}`}>
                    <CloseOutlinedIcon />Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetails && detailsDevice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`${theme.bg2} border ${theme.border} rounded-2xl shadow-2xl shadow-cyan-500/10 p-8 w-full max-w-lg max-h-[80vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${theme.text}`}>Detalles del Dispositivo</h2>
                <button onClick={() => setShowDetails(false)} className={`p-2 hover:bg-gray-700 rounded-lg cursor-pointer ${theme.text}`}>
                  <CloseOutlinedIcon />
                </button>
              </div>
              <div className="space-y-4">
                <div className={`p-4 ${theme.bg} rounded-xl`}>
                  <div className={`text-sm ${theme.text3}`}>Nombre</div>
                  <div className={`text-lg font-medium ${theme.text}`}>{detailsDevice.name}</div>
                </div>
                <div className={`p-4 ${theme.bg} rounded-xl`}>
                  <div className={`text-sm ${theme.text3}`}>Tipo</div>
                  <div className={`text-lg font-medium ${theme.text}`}>{DEVICE_TYPES.find(t => t.value === detailsDevice.type)?.label}</div>
                </div>
                <div className={`p-4 ${theme.bg} rounded-xl`}>
                  <div className={`text-sm ${theme.text3}`}>Ubicacion</div>
                  <div className={`text-lg font-medium ${theme.text}`}>{detailsDevice.location || '-'}</div>
                </div>
                <div className={`p-4 ${theme.bg} rounded-xl`}>
                  <div className={`text-sm ${theme.text3}`}>Numero de Serie</div>
                  <div className={`text-lg font-medium font-mono ${theme.text}`}>{detailsDevice.serial_number || '-'}</div>
                </div>
                <div className={`p-4 ${theme.bg} rounded-xl`}>
                  <div className={`text-sm ${theme.text3}`}>Estado</div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    detailsDevice.status === 'active' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {detailsDevice.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showStats && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`${theme.bg2} border ${theme.border} rounded-2xl shadow-2xl shadow-cyan-500/10 p-8 w-full max-w-3xl max-h-[80vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${theme.text}`}>Estadisticas Globales</h2>
                <button onClick={() => setShowStats(false)} className={`p-2 hover:bg-gray-700 rounded-lg cursor-pointer ${theme.text}`}>
                  <CloseOutlinedIcon />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className={`p-4 ${theme.bg} rounded-xl text-center border-2 border-cyan-500/30`}>
                  <div className={`text-sm ${theme.text2}`}>Total</div>
                  <div className={`text-3xl font-bold ${theme.text}`}>{devices.length}</div>
                </div>
                <div className={`p-4 ${theme.bg} rounded-xl text-center border-2 border-green-500/30`}>
                  <div className={`text-sm ${theme.text2}`}>Activos</div>
                  <div className="text-3xl font-bold text-green-400">{devices.filter(d => d.status === 'active').length}</div>
                </div>
                <div className={`p-4 ${theme.bg} rounded-xl text-center border-2 border-red-500/30`}>
                  <div className={`text-sm ${theme.text2}`}>Inactivos</div>
                  <div className="text-3xl font-bold text-red-400">{devices.filter(d => d.status === 'inactive').length}</div>
                </div>
                <div className={`p-4 ${theme.bg} rounded-xl text-center border-2 border-blue-500/30`}>
                  <div className={`text-sm ${theme.text2}`}>con Ubicacion</div>
                  <div className="text-3xl font-bold text-blue-400">{devices.filter(d => d.location && d.location.trim()).length}</div>
                </div>
              </div>

              <div className={`text-lg font-semibold ${theme.text} mb-4`}>Resumen de Dispositivos</div>
              <div className={`p-4 ${theme.bg} rounded-xl space-y-3`}>
                <div className="flex justify-between items-center">
                  <span className={theme.text2}>Maquinas Expendedoras</span>
                  <span className={`font-semibold ${theme.text}`}>{counts.ticket_machine}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.text2}>Routers WiFi</span>
                  <span className={`font-semibold ${theme.text}`}>{counts.wifi_router}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.text2}>Routers Transmision</span>
                  <span className={`font-semibold ${theme.text}`}>{counts.transmission_router}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.text2}>Lectores QR</span>
                  <span className={`font-semibold ${theme.text}`}>{counts.qr_reader}</span>
                </div>
                <div className={`border-t ${theme.border} pt-3 mt-3 flex justify-between items-center`}>
                  <span className={`font-semibold ${theme.text}`}>TOTAL</span>
                  <span className={`font-bold text-xl text-cyan-400`}>{devices.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

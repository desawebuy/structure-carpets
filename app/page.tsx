'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
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
    const data = dataToExport.map(d => ({
      Nombre: d.name,
      Tipo: DEVICE_TYPES.find(t => t.value === d.type)?.label || d.type,
      Ubicación: d.location || '',
      'Número de Serie': d.serial_number || '',
      Estado: d.status === 'active' ? 'Activo' : 'Inactivo',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    const colWidths = [
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 10 },
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dispositivos');
    
    XLSX.writeFile(wb, 'devices.xlsx');
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
    bg: darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50',
    surface: darkMode ? 'bg-[#141417]' : 'bg-white',
    surfaceHover: darkMode ? 'hover:bg-[#1c1c21]' : 'hover:bg-gray-50',
    border: darkMode ? 'border-[#27272a]' : 'border-gray-200',
    borderActive: darkMode ? 'border-[#3f3f46]' : 'border-gray-300',
    text: darkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: darkMode ? 'text-gray-400' : 'text-gray-600',
    textMuted: darkMode ? 'text-gray-500' : 'text-gray-400',
    accent: darkMode ? 'text-cyan-400' : 'text-cyan-600',
    accentBg: darkMode ? 'bg-cyan-400' : 'bg-cyan-600',
    input: darkMode ? 'bg-[#0a0a0b] border-[#27272a] text-gray-100' : 'bg-white border-gray-200 text-gray-900',
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
          <h1 className={`text-3xl font-semibold mb-8 ${theme.text}`}>Registro de Dispositivos</h1>
          <div className={`${theme.surface} border ${theme.border} rounded-lg p-6`}>
            <h2 className={`text-lg font-medium mb-2 ${theme.text}`}>Error de Conexión</h2>
            <p className={theme.textMuted}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors relative overflow-hidden`}>
      {darkMode && (
        <>
          <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-transparent blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-15%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/15 via-cyan-500/10 to-transparent blur-[100px] pointer-events-none" />
          <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-teal-400/10 to-transparent blur-[80px] pointer-events-none" />
        </>
      )}
      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-2xl font-semibold ${theme.text}`}>
              Registro de Dispositivos
            </h1>
            <p className={`text-sm ${theme.textMuted} mt-1`}>Gestiona tu infraestructura</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className={`w-9 h-9 flex items-center justify-center text-lg transition-colors cursor-pointer hover:bg-white/10 rounded-lg ${theme.text}`}
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setShowStats(true)}
              className={`w-9 h-9 flex items-center justify-center transition-colors cursor-pointer hover:bg-white/10 rounded-lg ${theme.textSecondary}`}
              title="Estadísticas globales"
            >
              <AssessmentOutlinedIcon sx={{ fontSize: 20 }} />
            </button>
          </div>
        </header>

        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6`}>
          {DEVICE_TYPES.map(dt => {
            const TypeIcon = dt.icon;
            const isActive = filterType === dt.value;
            return (
              <button
                key={dt.value}
                onClick={() => setFilterType(dt.value as DeviceType | 'all')}
                className={`relative p-4 rounded-lg border transition-all duration-200 cursor-pointer text-left ${
                  isActive
                    ? `bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border-cyan-500/50`
                    : `${theme.surface} border ${theme.border} hover:bg-gradient-to-br hover:from-cyan-500/10 hover:to-teal-500/5 hover:border-cyan-500/30`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`${isActive ? 'text-cyan-400' : theme.textSecondary}`}>
                    <TypeIcon sx={{ fontSize: 24 }} />
                  </div>
                  <div className={`text-xl font-medium ${theme.text}`}>{counts[dt.value as DeviceType]}</div>
                </div>
                <div className={`text-sm mt-2 ${theme.textSecondary}`}>{dt.label}</div>
              </button>
            );
          })}
        </div>

        <div className={`flex justify-between items-center mb-4 flex-wrap gap-3`}>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`flex items-center gap-2 px-3 h-9 ${theme.surface} border ${theme.border} rounded-md`}>
              <SearchIcon sx={{ fontSize: 18 }} className={theme.textMuted} />
              <input
                id="search-input"
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`bg-transparent outline-none w-28 text-sm ${theme.text} placeholder-gray-500`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={`${theme.textMuted} hover:${theme.text}`}>
                  <CloseOutlinedIcon sx={{ fontSize: 16 }} />
                </button>
              )}
            </div>
            
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as DeviceType | 'all')}
              className={`h-9 text-sm ${theme.surface} border ${theme.border} rounded-md px-3 ${theme.text} focus:border-cyan-500/50 focus:outline-none transition-colors cursor-pointer`}
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
                className="text-sm text-cyan-500 hover:text-cyan-400 cursor-pointer"
              >
                Limpiar
              </button>
            )}
            {filteredDevices.length > 0 && (
              <button 
                onClick={toggleSelectAll}
                className={`flex items-center gap-1 px-3 h-9 text-sm border rounded-md cursor-pointer transition-colors ${
                  selectedIds.length === filteredDevices.length && filteredDevices.length > 0
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                    : `${theme.surface} ${theme.border} ${theme.textSecondary} hover:border-cyan-500/40`
                }`}
              >
                <DoneAllIcon sx={{ fontSize: 16 }} />
                {selectedIds.length === filteredDevices.length ? 'Deseleccionar' : 'Seleccionar'}
              </button>
            )}
            {selectedIds.length > 0 && (
              <button 
                onClick={deleteSelected}
                className="flex items-center gap-1 px-3 h-9 text-sm bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-md cursor-pointer transition-colors text-red-400"
              >
                <DeleteSweepIcon sx={{ fontSize: 16 }} />
                ({selectedIds.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleExport}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${theme.textSecondary} hover:bg-white/10`}
              title="Exportar"
            >
              <DownloadIcon sx={{ fontSize: 20 }} />
            </button>
            
            <label className={`p-2 rounded-lg cursor-pointer transition-colors ${theme.textSecondary} hover:bg-white/10 ${importing ? 'opacity-50' : ''}`}
              title="Importar"
            >
              <UploadFileIcon sx={{ fontSize: 20 }} />
              {importing && <span className="ml-2 text-xs">Importando...</span>}
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
              className="flex items-center gap-1.5 px-4 h-9 bg-cyan-500 hover:bg-cyan-400 rounded-md font-medium text-sm text-white transition-colors cursor-pointer"
            >
              <AddIcon sx={{ fontSize: 18 }} />
              Agregar
            </button>
          </div>
        </div>

        <div className={`${theme.surface} border ${theme.border} rounded-lg overflow-hidden`}>
          <table className="w-full">
            <thead className={darkMode ? 'bg-[#0a0a0b]/50' : 'bg-gray-50/50'}>
              <tr>
                <th className="w-10 p-3"></th>
                <th className="text-left p-3 text-sm font-medium text-gray-500">Nombre</th>
                <th className="text-left p-3 text-sm font-medium text-gray-500">Tipo</th>
                <th className="text-left p-3 text-sm font-medium text-gray-500">Ubicación</th>
                <th className="text-left p-3 text-sm font-medium text-gray-500">Serie</th>
                <th className="text-left p-3 text-sm font-medium text-gray-500">Estado</th>
                <th className="text-right p-3 text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={`p-8 text-center text-sm ${theme.textMuted}`}>Cargando...</td></tr>
              ) : paginatedDevices.length === 0 ? (
                <tr><td colSpan={7} className={`p-8 text-center text-sm ${theme.textMuted}`}>No se encontraron dispositivos</td></tr>
              ) : (
                paginatedDevices.map(device => {
                  const config = getTypeConfig(device.type);
                  const TypeIcon = config?.icon;
                  return (
                    <tr key={device.id} className={`border-t ${theme.border} transition-colors hover:${theme.surfaceHover}`}>
                      <td className="p-3">
                        <button 
                          onClick={() => device.id && toggleSelect(device.id)}
                          className="cursor-pointer p-0.5"
                        >
                          {device.id && selectedIds.includes(device.id) 
                            ? <CheckBoxIcon sx={{ fontSize: 18 }} className="text-cyan-500" />
                            : <CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} className={theme.textMuted} />
                          }
                        </button>
                      </td>
                      <td className={`p-3 text-sm ${theme.text}`}>{device.name}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} ${theme.textSecondary}`}>
                          {TypeIcon && <TypeIcon sx={{ fontSize: 14 }} />}
                          <span>{config?.label}</span>
                        </span>
                      </td>
                      <td className={`p-3 text-sm ${theme.textSecondary}`}>{device.location || '-'}</td>
                      <td className={`p-3 text-sm font-mono ${theme.textMuted}`}>{device.serial_number || '-'}</td>
                      <td className="p-3">
                        <button 
                          onClick={() => toggleStatus(device)}
                          className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                            device.status === 'active' 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                          }`}
                        >
                          {device.status === 'active' ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleViewDetails(device)} className={`p-1.5 rounded-lg hover:bg-white/10 cursor-pointer ${theme.textSecondary}`} title="Ver detalles">
                          <VisibilityIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button onClick={() => handleEdit(device)} className="p-1.5 text-cyan-500 hover:bg-white/10 rounded-lg cursor-pointer" title="Editar">
                          <EditOutlinedIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button onClick={() => device.id && handleDelete(device.id)} className="p-1.5 text-red-400 hover:bg-white/10 rounded-lg cursor-pointer" title="Eliminar">
                          <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          
          {totalPages > 1 && (
            <div className={`flex items-center justify-between p-3 border-t ${theme.border}`}>
              <div className={`text-xs ${theme.textMuted}`}>
                {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredDevices.length)} de {filteredDevices.length}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`p-1.5 rounded ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-800 cursor-pointer'} ${theme.textSecondary}`}
                >
                  <ChevronLeftIcon sx={{ fontSize: 18 }} />
                </button>
                <span className={`text-xs px-2 ${theme.textSecondary}`}>Página {currentPage} de {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 rounded ${currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-800 cursor-pointer'} ${theme.textSecondary}`}
                >
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </button>
              </div>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className={`${theme.surface} border ${theme.border} rounded-lg p-6 w-full max-w-sm`}>
              <div className="flex justify-between items-center mb-5">
                <h2 className={`text-lg font-medium ${theme.text}`}>{editingDevice ? 'Editar Dispositivo' : 'Agregar Dispositivo'}</h2>
                <button onClick={resetForm} className={`p-1.5 rounded-lg hover:bg-white/10 cursor-pointer ${theme.textSecondary}`}>
                  <CloseOutlinedIcon sx={{ fontSize: 20 }} />
                </button>
              </div>
              {error && <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1.5`}>Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 text-sm ${theme.input} rounded border focus:border-cyan-500/50 focus:outline-none transition-colors`}
                    placeholder="Nombre del dispositivo"
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1.5`}>Tipo</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as DeviceType })}
                    className={`w-full px-3 py-2 text-sm ${theme.input} rounded border focus:border-cyan-500/50 focus:outline-none transition-colors`}
                  >
                    {DEVICE_TYPES.map(dt => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1.5`}>Ubicación</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className={`w-full px-3 py-2 text-sm ${theme.input} rounded border focus:border-cyan-500/50 focus:outline-none transition-colors`}
                    placeholder="Ubicación opcional"
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1.5`}>Número de Serie</label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                    className={`w-full px-3 py-2 text-sm ${theme.input} rounded border focus:border-cyan-500/50 focus:outline-none transition-colors`}
                    placeholder="SN-XXXXX"
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1.5`}>Estado</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className={`w-full px-3 py-2 text-sm ${theme.input} rounded border focus:border-cyan-500/50 focus:outline-none transition-colors`}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 rounded text-sm font-medium text-white transition-colors cursor-pointer">
                    {editingDevice ? 'Guardar' : 'Agregar'}
                  </button>
                  <button type="button" onClick={resetForm} className={`flex-1 py-2 ${theme.surface} border ${theme.border} rounded text-sm hover:${theme.borderActive} transition-colors cursor-pointer ${theme.text}`}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetails && detailsDevice && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className={`${theme.surface} border ${theme.border} rounded-lg p-6 w-full max-w-sm`}>
              <div className="flex justify-between items-center mb-5">
                <h2 className={`text-lg font-medium ${theme.text}`}>Detalles del Dispositivo</h2>
                <button onClick={() => setShowDetails(false)} className={`p-1 rounded hover:${theme.surfaceHover} cursor-pointer ${theme.textSecondary}`}>
                  <CloseOutlinedIcon sx={{ fontSize: 20 }} />
                </button>
              </div>
              <div className="space-y-3">
                <div className={`p-3 rounded ${darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                  <div className={`text-xs ${theme.textMuted}`}>Nombre</div>
                  <div className={`text-sm font-medium ${theme.text}`}>{detailsDevice.name}</div>
                </div>
                <div className={`p-3 rounded ${darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                  <div className={`text-xs ${theme.textMuted}`}>Tipo</div>
                  <div className={`text-sm font-medium ${theme.text}`}>{DEVICE_TYPES.find(t => t.value === detailsDevice.type)?.label}</div>
                </div>
                <div className={`p-3 rounded ${darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                  <div className={`text-xs ${theme.textMuted}`}>Ubicación</div>
                  <div className={`text-sm font-medium ${theme.text}`}>{detailsDevice.location || '-'}</div>
                </div>
                <div className={`p-3 rounded ${darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                  <div className={`text-xs ${theme.textMuted}`}>Número de Serie</div>
                  <div className={`text-sm font-medium font-mono ${theme.text}`}>{detailsDevice.serial_number || '-'}</div>
                </div>
                <div className={`p-3 rounded ${darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                  <div className={`text-xs ${theme.textMuted}`}>Estado</div>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                    detailsDevice.status === 'active' 
                      ? 'bg-emerald-500/15 text-emerald-400' 
                      : 'bg-gray-500/15 text-gray-400'
                  }`}>
                    {detailsDevice.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showStats && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className={`${theme.surface} border ${theme.border} rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-5">
                <h2 className={`text-lg font-medium ${theme.text}`}>Estadísticas Globales</h2>
                <button onClick={() => setShowStats(false)} className={`p-1 rounded hover:${theme.surfaceHover} cursor-pointer ${theme.textSecondary}`}>
                  <CloseOutlinedIcon sx={{ fontSize: 20 }} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className={`p-3 rounded border ${theme.border} text-center`}>
                  <div className={`text-xs ${theme.textMuted}`}>Total</div>
                  <div className={`text-xl font-medium ${theme.text}`}>{devices.length}</div>
                </div>
                <div className={`p-3 rounded border ${theme.border} text-center`}>
                  <div className={`text-xs ${theme.textMuted}`}>Activos</div>
                  <div className="text-xl font-medium text-emerald-400">{devices.filter(d => d.status === 'active').length}</div>
                </div>
                <div className={`p-3 rounded border ${theme.border} text-center`}>
                  <div className={`text-xs ${theme.textMuted}`}>Inactivos</div>
                  <div className="text-xl font-medium text-gray-400">{devices.filter(d => d.status === 'inactive').length}</div>
                </div>
                <div className={`p-3 rounded border ${theme.border} text-center`}>
                  <div className={`text-xs ${theme.textMuted}`}>Con Serie</div>
                  <div className="text-xl font-medium text-cyan-400">{devices.filter(d => d.serial_number && d.serial_number.trim()).length}</div>
                </div>
              </div>

              <div className="mb-5">
                <div className={`text-sm font-medium ${theme.text} mb-2`}>Estado de Dispositivos</div>
                <div className={`p-3 rounded ${darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                  <div className="flex h-2 rounded-full overflow-hidden mb-2">
                    <div 
                      className="bg-emerald-500"
                      style={{ width: `${devices.length > 0 ? (devices.filter(d => d.status === 'active').length / devices.length) * 100 : 0}%` }}
                    />
                    <div 
                      className="bg-gray-500"
                      style={{ width: `${devices.length > 0 ? (devices.filter(d => d.status === 'inactive').length / devices.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400">{devices.filter(d => d.status === 'active').length} Activos</span>
                    <span className="text-gray-400">{devices.filter(d => d.status === 'inactive').length} Inactivos</span>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div className={`text-sm font-medium ${theme.text} mb-2`}>Por Tipo</div>
                <div className="space-y-2">
                  {DEVICE_TYPES.map(dt => {
                    const typeDevices = devices.filter(d => d.type === dt.value);
                    const typeActive = typeDevices.filter(d => d.status === 'active').length;
                    const percentage = devices.length > 0 ? Math.round((typeDevices.length / devices.length) * 100) : 0;
                    return (
                      <div key={dt.value} className={`p-3 rounded ${darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-sm ${theme.text}`}>{dt.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${theme.textMuted}`}>{typeDevices.length}</span>
                            <span className="text-xs text-emerald-400">{typeActive} activos</span>
                          </div>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                          <div 
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5">
                <div className={`text-sm font-medium ${theme.text} mb-2`}>Por Ubicación</div>
                <div className={`p-3 rounded ${darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                  {(() => {
                    const locationCounts: Record<string, number> = {};
                    devices.forEach(d => {
                      const loc = d.location?.trim() || 'Sin ubicación';
                      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
                    });
                    const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
                    if (sortedLocations.length === 0 || (sortedLocations.length === 1 && sortedLocations[0][0] === 'Sin ubicación')) {
                      return <div className={`text-center text-sm ${theme.textMuted}`}>No hay ubicaciones registradas</div>;
                    }
                    return (
                      <div className="space-y-2">
                        {sortedLocations.slice(0, 6).map(([loc, count]) => (
                          <div key={loc} className="flex justify-between items-center">
                            <span className={`text-sm ${theme.textSecondary}`}>{loc}</span>
                            <div className="flex items-center gap-2">
                              <div className={`w-16 h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                <div 
                                  className="h-full bg-cyan-500 rounded-full"
                                  style={{ width: `${(count / devices.length) * 100}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${theme.text} w-5 text-right`}>{count}</span>
                            </div>
                          </div>
                        ))}
                        {sortedLocations.length > 6 && (
                          <div className={`text-center text-xs ${theme.textMuted} pt-1`}>+ {sortedLocations.length - 6} más</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <div className={`text-sm font-medium ${theme.text} mb-2`}>Resumen</div>
                <div className={`p-3 rounded ${darkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={`border-b ${theme.border}`}>
                        <th className={`text-left py-2 ${theme.textMuted}`}>Tipo</th>
                        <th className={`text-right py-2 ${theme.textMuted}`}>Total</th>
                        <th className={`text-right py-2 ${theme.textMuted}`}>Activos</th>
                        <th className={`text-right py-2 ${theme.textMuted}`}>Inactivos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEVICE_TYPES.map(dt => {
                        const typeDevices = devices.filter(d => d.type === dt.value);
                        const typeActive = typeDevices.filter(d => d.status === 'active').length;
                        const typeInactive = typeDevices.filter(d => d.status === 'inactive').length;
                        return (
                          <tr key={dt.value} className={`border-b ${theme.border}`}>
                            <td className={`py-2 ${theme.textSecondary}`}>{dt.label}</td>
                            <td className={`text-right py-2 font-medium ${theme.text}`}>{typeDevices.length}</td>
                            <td className="text-right py-2 text-emerald-400">{typeActive}</td>
                            <td className="text-right py-2 text-gray-400">{typeInactive}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className={`py-2 font-medium ${theme.text}`}>TOTAL</td>
                        <td className={`text-right py-2 font-medium text-cyan-400`}>{devices.length}</td>
                        <td className="text-right py-2 font-medium text-emerald-400">{devices.filter(d => d.status === 'active').length}</td>
                        <td className="text-right py-2 font-medium text-gray-400">{devices.filter(d => d.status === 'inactive').length}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

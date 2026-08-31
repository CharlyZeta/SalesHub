import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, MessageSquare, Loader2 } from 'lucide-react';
import { addSystemLog } from '../utils/logger';

// Fix default Leaflet icon assets urls
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SaleLocationMapProps {
  address: string;
  city: string;
  province: string;
  coordinates?: { lat: number; lng: number };
  onChangeCoordinates: (coords: { lat: number; lng: number }) => void;
  clientName?: string;
  clientPhone?: string;
  productsText?: string;
}

export const SaleLocationMap: React.FC<SaleLocationMapProps> = ({
  address,
  city,
  province,
  coordinates,
  onChangeCoordinates,
  clientName = '',
  clientPhone = '',
  productsText = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [statusText, setStatusText] = useState('');

  // Default to center of Argentina if coordinates are missing
  const defaultLat = -34.6037;
  const defaultLng = -58.3816;
  const currentLat = coordinates?.lat ?? defaultLat;
  const currentLng = coordinates?.lng ?? defaultLng;

  // Geolocate address using Nominatim OSM geocoding API
  const geocodeAddress = async (addrStr: string) => {
    if (!addrStr.trim()) return;
    setIsSearching(true);
    setStatusText('Buscando dirección...');
    addSystemLog('API', 'Maps', `Iniciando geocodificación OSM/Nominatim para: "${addrStr}"`);
    try {
      const query = encodeURIComponent(`${addrStr}`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        onChangeCoordinates({ lat, lng });
        setStatusText('¡Dirección localizada!');
        addSystemLog('INFO', 'Maps', `Geolocalización exitosa para "${addrStr}"`, { lat, lng });
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
        }
      } else {
        setStatusText('No se encontraron coordenadas para esta dirección.');
        addSystemLog('WARN', 'Maps', `Sin resultados de geolocalización para: "${addrStr}"`);
      }
    } catch (err: any) {
      console.error('Error al geolocalizar:', err);
      setStatusText('Error al geolocalizar.');
      addSystemLog('ERROR', 'Maps', `Fallo en geocodificación OSM/Nominatim: ${err?.message || err}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Instantiate map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const map = L.map(mapContainerRef.current).setView([currentLat, currentLng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([currentLat, currentLng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        try {
          const pos = marker.getLatLng();
          onChangeCoordinates({ lat: pos.lat, lng: pos.lng });
          addSystemLog('INFO', 'Maps', `Marcador de ubicación ajustado manualmente`, { lat: pos.lat, lng: pos.lng });
        } catch (err: any) {
          console.error('Error al arrastrar marcador:', err);
          addSystemLog('ERROR', 'Maps', `Error al actualizar posición del marcador: ${err?.message || err}`);
        }
      });

      mapRef.current = map;
      markerRef.current = marker;

      const resizeTimer = setTimeout(() => {
        map.invalidateSize();
      }, 250);

      return () => {
        clearTimeout(resizeTimer);
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
      };
    } catch (err: any) {
      console.error('Error al inicializar mapa Leaflet:', err);
      addSystemLog('ERROR', 'Maps', `Error al inicializar mapa Leaflet: ${err?.message || err}`);
    }
  }, []);

  // Sync marker position when coordinates change
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      try {
        markerRef.current.setLatLng([currentLat, currentLng]);
        mapRef.current.setView([currentLat, currentLng]);
      } catch (err: any) {
        console.error('Error al sincronizar posición del mapa:', err);
      }
    }
  }, [currentLat, currentLng]);

  // Autosearch when address properties change (debounced)
  useEffect(() => {
    const fullAddress = `${address}, ${city}, ${province}, Argentina`;
    if (!address || coordinates) return; // Only autosearch on creation if empty
    const timer = setTimeout(() => {
      geocodeAddress(fullAddress);
    }, 1500);
    return () => clearTimeout(timer);
  }, [address, city, province]);

  const handleManualSearch = () => {
    geocodeAddress(searchQuery);
  };

  const shareText = `📍 Ubicación de Entrega
👤 Cliente: ${clientName || 'Sin Nombre'}
🏠 Domicilio: ${address.trim()}, ${city.trim()}, ${province.trim()}
📞 Teléfono: ${clientPhone || 'Sin Teléfono'}
📦 Productos: ${productsText || 'Ninguno'}
🗺️ Mapa: https://www.google.com/maps?q=${currentLat},${currentLng}`;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <MapPin className="w-4 h-4 text-red-500" /> Localizador Geográfico
        </h3>
        <p className="text-[10px] text-slate-500">Mueve el pin en el mapa para corregir la ubicación si es necesario.</p>

        {/* Search Container: NOT a form to avoid bubbling submit to parent SaleFormModal form */}
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Buscar dirección manualmente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleManualSearch();
              }
            }}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={isSearching}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleManualSearch();
            }}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          </button>
        </div>

        {statusText && (
          <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{statusText}</p>
        )}
      </div>

      <div className="flex-1 min-h-[250px] relative z-10" ref={mapContainerRef} />

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
        <div>Lat: {currentLat.toFixed(6)}</div>
        <div>Lng: {currentLng.toFixed(6)}</div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-center">
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            addSystemLog('INFO', 'Maps', `Ubicación compartida por WhatsApp para cliente ${clientName || 'Sin Nombre'}`);
          }}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="font-semibold">Compartir Ubicación por WhatsApp</span>
        </a>
      </div>
    </div>
  );
};

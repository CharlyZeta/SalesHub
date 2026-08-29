# Plan de Implementación: Localización Geográfica en Ventas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement geographical locator maps, alternate delivery address forms, and location sharing via WhatsApp in the sales panel.

**Architecture:**
- Extend the `Sale` schema in `src/types.ts` to support alternate delivery addresses and coordinate structures.
- Install vanilla `leaflet` library (independent of React peer dependencies to support React 19 natively).
- Integrate collapsible alternate delivery form fields inside `SaleFormModal.tsx`.
- Create a `SaleLocationMap.tsx` component managing Leaflet map instantiation, marker dragging, and geocoding fetch calls.
- Add WhatsApp share buttons and sidebar layout controls.

**Tech Stack:** React 19, Tailwind CSS, Leaflet.js, OpenStreetMap Nominatim.

## Global Constraints
- Support full dark mode styling.
- Prevent browser CORS issues by querying public geocoding APIs with appropriate User-Agent/Accept headers.
- Do not import `@react-google-maps/api` or other Google libraries requiring API keys.

---

### Task 1: Extender tipos y modelos en types.ts

**Files:**
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: `Sale` interface.
- Produces: New alternate shipping fields inside `Sale`.

- [ ] **Step 1: Modificar la interfaz Sale**
  Add the following optional fields to the `Sale` interface in `src/types.ts`:
  ```typescript
  export interface Sale {
    // ... campos existentes ...
    envioDomicilioDiferente?: boolean;
    entregaDireccion?: string;
    entregaLocalidad?: string;
    entregaProvincia?: string;
    entregaCoordenadas?: {
      lat: number;
      lng: number;
    };
  }
  ```

- [ ] **Step 2: Verificar el tipado**
  Run: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 3: Commit**
  ```bash
  git add src/types.ts
  git commit -m "feat: extender interfaz de venta con datos de localizacion y domicilio de entrega"
  ```

---

### Task 2: Instalar y Configurar Leaflet

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: None.
- Produces: `leaflet` and `@types/leaflet` dependencies installed in the project.

- [ ] **Step 1: Instalar dependencias de Leaflet**
  Run: `npm install leaflet --save` and `npm install @types/leaflet --save-dev`
  Expected: Installation finishes cleanly.

- [ ] **Step 2: Confirmar instalación en package.json**
  Check that `"leaflet"` is in dependencies and `"@types/leaflet"` is in devDependencies.

- [ ] **Step 3: Commit**
  ```bash
  git add package.json package-lock.json
  git commit -m "chore: instalar leaflet y sus tipos"
  ```

---

### Task 3: Campos de Domicilio de Entrega Alternativo Colapsables

**Files:**
- Modify: `src/components/SaleFormModal.tsx`

**Interfaces:**
- Consumes: `Sale` fields from Task 1.
- Produces: State handles and JSX layout for alternate shipping address in `SaleFormModal`.

- [ ] **Step 1: Agregar variables de estado en el modal**
  Initialize states inside `SaleFormModal` component (around line 55):
  ```typescript
  const [envioDomicilioDiferente, setEnvioDomicilioDiferente] = useState(existingSale?.envioDomicilioDiferente || false);
  const [entregaDireccion, setEntregaDireccion] = useState(existingSale?.entregaDireccion || '');
  const [entregaLocalidad, setEntregaLocalidad] = useState(existingSale?.entregaLocalidad || '');
  const [entregaProvincia, setEntregaProvincia] = useState(existingSale?.entregaProvincia || 'Buenos Aires');
  const [entregaCoordenadas, setEntregaCoordenadas] = useState<{lat: number; lng: number} | undefined>(existingSale?.entregaCoordenadas);
  ```

- [ ] **Step 2: Guardar los nuevos campos en handleSubmit**
  Add the new fields to `candidateSale` in `handleSubmit` (around line 125):
  ```typescript
      const candidateSale: Sale = {
        // ... campos existentes ...
        envioDomicilioDiferente,
        entregaDireccion: envioDomicilioDiferente ? entregaDireccion : '',
        entregaLocalidad: envioDomicilioDiferente ? entregaLocalidad : '',
        entregaProvincia: envioDomicilioDiferente ? entregaProvincia : '',
        entregaCoordenadas: envioDomicilioDiferente ? entregaCoordenadas : undefined,
        // ...
      };
  ```

- [ ] **Step 3: Renderizar la sección colapsable en el formulario**
  Below the client info inputs (e.g. CUIT, Teléfono), render the checkbox/toggle and alternate address fields:
  ```typescript
              {/* Opción de domicilio alternativo */}
              <div className="col-span-12 mt-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={envioDomicilioDiferente}
                    onChange={(e) => setEnvioDomicilioDiferente(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <span>¿Enviar a un domicilio diferente al del cliente?</span>
                </label>

                {envioDomicilioDiferente && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1">Dirección de Entrega *</label>
                      <input
                        type="text"
                        placeholder="Calle y número"
                        value={entregaDireccion}
                        onChange={(e) => setEntregaDireccion(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1">Localidad de Entrega *</label>
                      <input
                        type="text"
                        placeholder="Ej: Rosario"
                        value={entregaLocalidad}
                        onChange={(e) => setEntregaLocalidad(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1">Provincia *</label>
                      <input
                        type="text"
                        placeholder="Ej: Santa Fe"
                        value={entregaProvincia}
                        onChange={(e) => setEntregaProvincia(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
  ```

- [ ] **Step 4: Verificar y commit**
  Run: `npx tsc --noEmit`
  Commit:
  ```bash
  git add src/components/SaleFormModal.tsx
  git commit -m "feat: agregar inputs colapsables de direccion de entrega alternativa"
  ```

---

### Task 4: Integración del Panel de Mapa Desplegable

**Files:**
- Create: `src/components/SaleLocationMap.tsx`
- Modify: `src/components/SaleFormModal.tsx`

**Interfaces:**
- Consumes: Delivery addresses and coordinates states.
- Produces: Sidebar collapsible map layout, Leaflet interactive map with markers, and Nominatim geocoder queries.

- [ ] **Step 1: Crear el componente SaleLocationMap.tsx**
  Implement Leaflet map instantiation with draggable marker, Nominatim search triggers, and manual coordinate override inputs:
  ```typescript
  import React, { useEffect, useRef, useState } from 'react';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { Search, MapPin, Navigation } from 'lucide-react';

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
  }

  export const SaleLocationMap: React.FC<SaleLocationMapProps> = ({
    address,
    city,
    province,
    coordinates,
    onChangeCoordinates,
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
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15);
          }
        } else {
          setStatusText('No se encontraron coordenadas para esta dirección.');
        }
      } catch (err) {
        setStatusText('Error al geolocalizar.');
      } finally {
        setIsSearching(false);
      }
    };

    // Instantiate map once
    useEffect(() => {
      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current).setView([currentLat, currentLng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([currentLat, currentLng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangeCoordinates({ lat: pos.lat, lng: pos.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;

      return () => {
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
      };
    }, []);

    // Sync marker position when coordinates change
    useEffect(() => {
      if (markerRef.current && mapRef.current) {
        markerRef.current.setLatLng([currentLat, currentLng]);
        mapRef.current.setView([currentLat, currentLng]);
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

    const handleManualSearch = (e: React.FormEvent) => {
      e.preventDefault();
      geocodeAddress(searchQuery);
    };

    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-red-500" /> Localizador Geográfico
          </h3>
          <p className="text-[10px] text-slate-500">Mueve el pin en el mapa para corregir la ubicación si es necesario.</p>

          <form onSubmit={handleManualSearch} className="flex gap-1.5">
            <input
              type="text"
              placeholder="Buscar dirección manualmente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {statusText && (
            <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{statusText}</p>
          )}
        </div>

        <div className="flex-1 min-h-[250px] relative z-10" ref={mapContainerRef} />

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500">
          <div>Lat: {currentLat.toFixed(6)}</div>
          <div>Lng: {currentLng.toFixed(6)}</div>
        </div>
      </div>
    );
  };
  ```

- [ ] **Step 2: Modificar SaleFormModal.tsx para el layout de dos columnas**
  Import `SaleLocationMap` inside `SaleFormModal.tsx`.
  Add a state variable for map expansion toggling:
  ```typescript
  const [showMap, setShowMap] = useState(false);
  ```
  Adjust the width of the outer container:
  ```typescript
  className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] transition-all duration-300 ${
    showMap ? 'max-w-7xl' : 'max-w-4xl'
  }`}
  ```
  Render the toggle button on the right side of the header or form:
  ```typescript
            <button
              type="button"
              onClick={() => setShowMap(!showMap)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 font-bold cursor-pointer text-xs"
            >
              <span>{showMap ? 'Ocultar Mapa' : 'Ver Mapa'}</span>
              <Navigation className={`w-3.5 h-3.5 transform transition-transform ${showMap ? 'rotate-90' : ''}`} />
            </button>
  ```
  Render the sidebar containing `SaleLocationMap` inside the modal body:
  ```typescript
          <div className="flex-1 overflow-y-auto flex">
            {/* Formulario (Left panel) */}
            <div className={`p-5 space-y-4 flex-1 ${showMap ? 'max-w-[65%]' : 'w-full'}`}>
               {/* Todo el contenido actual del formulario... */}
            </div>

            {/* Mapa (Right panel) */}
            {showMap && (
              <div className="w-[35%] min-w-[320px] flex flex-col">
                <SaleLocationMap
                  address={envioDomicilioDiferente ? entregaDireccion : (clienteNombre ? `${clienteNombre} ${clienteApellido}` : '')}
                  city={envioDomicilioDiferente ? entregaLocalidad : 'Buenos Aires'}
                  province={envioDomicilioDiferente ? entregaProvincia : 'Buenos Aires'}
                  coordinates={entregaCoordenadas}
                  onChangeCoordinates={setEntregaCoordenadas}
                />
              </div>
            )}
          </div>
  ```

- [ ] **Step 3: Verificar y commit**
  Run: `npx tsc --noEmit`
  Commit:
  ```bash
  git add src/components/SaleLocationMap.tsx src/components/SaleFormModal.tsx
  git commit -m "feat: integrar panel lateral desplegable y mapa de leaflet interactivo"
  ```

---

### Task 5: Compartir por WhatsApp y Verificación

**Files:**
- Modify: `src/components/SaleLocationMap.tsx`

**Interfaces:**
- Consumes: Coordinate states.
- Produces: WhatsApp sharing trigger inside the map panel.

- [ ] **Step 1: Agregar botón de WhatsApp en el panel del mapa**
  Add sharing controls below the coordinates layout in `SaleLocationMap.tsx`:
  ```typescript
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-center">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `📍 Ubicación de entrega del cliente: https://www.google.com/maps?q=${currentLat},${currentLng}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
          >
            {/* Lucide icon or custom SVG for WhatsApp */}
            <span className="font-semibold">Compartir Ubicación por WhatsApp</span>
          </a>
        </div>
  ```

- [ ] **Step 2: Verificar la compilación completa de producción**
  Run: `npx tsc --noEmit` and `npm run build`
  Expected: Production bundle builds successfully.

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/SaleLocationMap.tsx
  git commit -m "feat: agregar boton para compartir enlace de google maps en whatsapp"
  ```

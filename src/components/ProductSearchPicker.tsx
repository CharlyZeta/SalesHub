import React, { useState, useRef, useEffect } from 'react';
import { Search, Image as ImageIcon, Package, AlertCircle, EyeOff, Check } from 'lucide-react';
import { CatalogProduct } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ProductSearchPickerProps {
  catalog: CatalogProduct[];
  value: string;
  onChangeText: (text: string) => void;
  onSelectProduct: (product: CatalogProduct) => void;
  placeholder?: string;
  selectedImageUrl?: string;
}

export const ProductSearchPicker: React.FC<ProductSearchPickerProps> = ({
  catalog,
  value,
  onChangeText,
  onSelectProduct,
  placeholder = 'Buscar o ingresar producto...',
  selectedImageUrl
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize internal search term with external value on focus
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter catalog sensitively (case-insensitive, matching name, SKU, or category)
  const filteredCatalog = catalog.filter((prod) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const matchName = prod.nombre.toLowerCase().includes(term);
    const matchSku = prod.sku?.toLowerCase().includes(term);
    const matchCat = prod.categoria?.toLowerCase().includes(term);
    return matchName || matchSku || matchCat;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChangeText(val);
    if (!isOpen) setIsOpen(true);
  };

  const handlePickProduct = (product: CatalogProduct) => {
    setSearchTerm(product.nombre);
    onSelectProduct(product);
    setIsOpen(false);
  };

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div className="relative flex items-center">
        {/* Product Image Preview if available */}
        {selectedImageUrl ? (
          <div className="absolute left-1.5 w-6 h-6 rounded overflow-hidden border border-slate-200 bg-slate-100 shrink-0 z-10">
            <img 
              src={selectedImageUrl} 
              alt="Producto" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
        )}

        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 py-1 rounded text-xs focus:outline-none focus:border-blue-500 font-medium transition-all ${
            selectedImageUrl ? 'pl-9 pr-2' : 'pl-7 pr-2'
          }`}
        />
      </div>

      {/* Sensitive Search Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-w-[280px]">
          <div className="p-1.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Búsqueda sensible ({filteredCatalog.length} en catálogo)</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Admite productos y precios manuales
            </span>
          </div>

          {/* Dedicated Action to use typed text as custom manual product */}
          {searchTerm.trim().length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChangeText(searchTerm.trim());
                setIsOpen(false);
              }}
              className="w-full text-left p-2 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60 border-b border-emerald-200/80 dark:border-emerald-800/80 transition-colors flex items-center gap-2 group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                +
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-emerald-950 dark:text-emerald-200 text-xs truncate">
                    Usar "{searchTerm.trim()}" como producto manual
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                    Precio Libre
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                  Item fuera de WooCommerce • Podrás ingresar el precio unitario manualmente
                </span>
              </div>
            </button>
          )}

          {filteredCatalog.length === 0 ? (
            <div className="p-3 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
              <p>No se encontraron productos coincidentes en el catálogo de WooCommerce.</p>
              {searchTerm.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeText(searchTerm.trim());
                    setIsOpen(false);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3 py-1.5 rounded transition-colors cursor-pointer shadow-2xs"
                >
                  Confirmar "{searchTerm.trim()}" como producto manual
                </button>
              )}
            </div>
          ) : (
            filteredCatalog.map((prod) => {
              const isOutStock = prod.stock <= 0;
              const isHidden = prod.estadoWoo && prod.estadoWoo !== 'publish';

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handlePickProduct(prod)}
                  className="w-full text-left p-2 hover:bg-blue-50/80 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5 group cursor-pointer"
                >
                  {/* Thumbnail Image */}
                  <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {prod.imagenUrl ? (
                      <img
                        src={prod.imagenUrl}
                        alt={prod.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          // Fallback on image load error
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&auto=format&fit=crop&q=80';
                        }}
                      />
                    ) : (
                      <Package className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate group-hover:text-blue-700 dark:group-hover:text-blue-400">
                        {prod.nombre}
                      </span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs shrink-0">
                        {formatCurrency(prod.precio, false)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-300">
                        SKU: {prod.sku}
                      </span>

                      {prod.categoria && (
                        <span className="truncate text-slate-400">
                          • {prod.categoria}
                        </span>
                      )}

                      {/* Stock / Status Badges */}
                      {isOutStock ? (
                        <span className="bg-red-100 text-red-700 px-1 rounded font-semibold text-[9px] flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" /> Sin Stock ({prod.stock})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">
                          (Stock: {prod.stock})
                        </span>
                      )}

                      {isHidden && (
                        <span className="bg-amber-100 text-amber-800 px-1 rounded font-semibold text-[9px] flex items-center gap-0.5">
                          <EyeOff className="w-2.5 h-2.5" /> Oculto
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

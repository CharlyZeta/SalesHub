import React from 'react';
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { SaleProductItem, CatalogProduct } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ProductSearchPicker } from '../ProductSearchPicker';

export interface SaleProductsSectionProps {
  productos: SaleProductItem[];
  catalog: CatalogProduct[];
  handleAddProductLine: () => void;
  handleRemoveProductLine: (index: number) => void;
  handleProductChange: (index: number, field: keyof SaleProductItem, value: any) => void;
  handleSelectCatalogProduct: (index: number, catProduct: CatalogProduct) => void;
  montoTotalCalculado: number;
}

export const SaleProductsSection: React.FC<SaleProductsSectionProps> = ({
  productos,
  catalog,
  handleAddProductLine,
  handleRemoveProductLine,
  handleProductChange,
  handleSelectCatalogProduct,
  montoTotalCalculado
}) => {
  return (
    <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Detalle de Productos Vendidos</span>
        </span>
        <button
          type="button"
          onClick={handleAddProductLine}
          className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Producto</span>
        </button>
      </div>

      <div className="space-y-2">
        {productos.map((prod, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            {/* Búsqueda Sensitiva de Producto con Imagen */}
            <div className="col-span-12 sm:col-span-5">
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                Producto (Búsqueda sensible con imagen)
              </label>
              <ProductSearchPicker
                catalog={catalog}
                value={prod.nombre}
                onChangeText={(text) => handleProductChange(idx, 'nombre', text)}
                onSelectProduct={(catProd) => handleSelectCatalogProduct(idx, catProd)}
                selectedImageUrl={prod.imagenUrl}
                placeholder="Buscar producto por nombre, SKU o categoría..."
              />
            </div>

            {/* Cantidad */}
            <div className="col-span-3 sm:col-span-1">
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 text-center">Cant.</label>
              <input
                type="number"
                min="1"
                value={prod.cantidad}
                onChange={(e) => handleProductChange(idx, 'cantidad', e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-1 py-1 rounded text-center focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Precio Unitario */}
            <div className="col-span-3 sm:col-span-2">
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 text-right">
                Precio Unit. ($)
              </label>
              <input
                type="number"
                min="0"
                value={prod.precioUnitario}
                onChange={(e) => handleProductChange(idx, 'precioUnitario', e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-right focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Descuento (%) */}
            <div className="col-span-3 sm:col-span-2">
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 text-center">
                Desc. (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={prod.descuento ?? 0}
                onChange={(e) => handleProductChange(idx, 'descuento', e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1 rounded text-center focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Subtotal & Delete */}
            <div className="col-span-3 sm:col-span-2 flex items-center justify-between gap-1 pl-1">
              <div>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(prod.subtotal)}
                </span>
              </div>

              {productos.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveProductLine(idx)}
                  className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1 cursor-pointer"
                  title="Eliminar fila de producto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Total Footer */}
      <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="text-right">
          <span className="text-slate-500 dark:text-slate-400 text-xs mr-2">Monto Total de la Venta:</span>
          <span className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-400">
            {formatCurrency(montoTotalCalculado)}
          </span>
        </div>
      </div>
    </div>
  );
};

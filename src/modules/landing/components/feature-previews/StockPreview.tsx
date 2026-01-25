import { useState } from 'react';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';

type StockStatus = 'ok' | 'low' | 'critical';
type Filter = 'todos' | 'baixo' | 'critico';

interface Product {
  id: number;
  name: string;
  quantity: number;
  minQuantity: number;
  status: StockStatus;
}

const initialProducts: Product[] = [
  { id: 1, name: 'Perfume Floral 100ml', quantity: 45, minQuantity: 10, status: 'ok' },
  { id: 2, name: 'Serum Vitamina C', quantity: 8, minQuantity: 15, status: 'low' },
  { id: 3, name: 'Base Liquida Matte', quantity: 2, minQuantity: 20, status: 'critical' },
  { id: 4, name: 'Hidratante Facial', quantity: 23, minQuantity: 10, status: 'ok' },
  { id: 5, name: 'Batom Matte Nude', quantity: 5, minQuantity: 10, status: 'low' },
  { id: 6, name: 'Paleta de Sombras', quantity: 0, minQuantity: 5, status: 'critical' },
  { id: 7, name: 'Mascara de Cilios', quantity: 18, minQuantity: 10, status: 'ok' },
];

const getStatus = (quantity: number, minQuantity: number): StockStatus => {
  if (quantity <= 0) return 'critical';
  if (quantity <= minQuantity) return 'low';
  return 'ok';
};

export function StockPreview() {
  const [products, setProducts] = useState(initialProducts);
  const [filter, setFilter] = useState<Filter>('todos');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);

  const filteredProducts = products.filter(product => {
    if (filter === 'baixo') return product.status === 'low';
    if (filter === 'critico') return product.status === 'critical';
    return true;
  });

  const alerts = products.filter(p => p.status === 'critical' || p.status === 'low').length;

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setEditQuantity(product.quantity);
  };

  const handleSave = () => {
    if (!editingProduct) return;

    setProducts(products.map(p => {
      if (p.id === editingProduct.id) {
        return {
          ...p,
          quantity: editQuantity,
          status: getStatus(editQuantity, p.minQuantity),
        };
      }
      return p;
    }));
    setEditingProduct(null);
  };

  const statusConfig = {
    ok: {
      icon: CheckCircleIcon,
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
      bar: 'bg-green-500',
      label: 'Ok',
    },
    low: {
      icon: WarningIcon,
      color: 'text-yellow-500',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      bar: 'bg-yellow-500',
      label: 'Baixo',
    },
    critical: {
      icon: ErrorIcon,
      color: 'text-red-500',
      bg: 'bg-red-100 dark:bg-red-900/30',
      bar: 'bg-red-500',
      label: 'Critico',
    },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Alerts Banner */}
      {alerts > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-3 mb-4 text-white">
          <div className="flex items-center gap-2">
            <WarningIcon className="h-5 w-5" />
            <span className="font-medium">
              {alerts} {alerts === 1 ? 'produto precisa' : 'produtos precisam'} de atencao
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'todos', label: 'Todos' },
          { key: 'baixo', label: 'Baixo' },
          { key: 'critico', label: 'Critico' },
        ] as { key: Filter; label: string }[]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {filteredProducts.map((product) => {
          const config = statusConfig[product.status];
          const percentage = Math.min((product.quantity / (product.minQuantity * 2)) * 100, 100);

          return (
            <button
              key={product.id}
              onClick={() => handleEdit(product)}
              className="w-full bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                  {product.name}
                </span>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                  <config.icon className="h-3 w-3" />
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config.bar} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[60px] text-right">
                  {product.quantity} un
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Minimo: {product.minQuantity} unidades
              </p>
            </button>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 w-[90%] max-w-sm animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900 dark:text-white">
                Atualizar Estoque
              </h4>
              <button
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {editingProduct.name}
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setEditQuantity(Math.max(0, editQuantity - 1))}
                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <RemoveIcon />
              </button>
              <input
                type="number"
                value={editQuantity}
                onChange={(e) => setEditQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 h-14 text-center text-2xl font-bold bg-gray-100 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              />
              <button
                onClick={() => setEditQuantity(editQuantity + 1)}
                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <AddIcon />
              </button>
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Salvar Alteracao
            </button>
          </div>
        </div>
      )}

      {/* Hint */}
      <p className="text-xs text-center text-gray-400 mt-4">
        Clique em um produto para atualizar o estoque
      </p>
    </div>
  );
}

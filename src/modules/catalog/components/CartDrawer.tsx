import { Fragment } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useCart } from '../../../contexts/CartContext';
import { Button } from '../../../components/ui';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartDrawer({ isOpen, onClose, onCheckout }: CartDrawerProps) {
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart } = useCart();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <ShoppingCartIcon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Carrinho ({itemCount})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCartIcon className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Carrinho vazio</p>
                <p className="text-sm">Adicione produtos para continuar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-1 flex-shrink-0 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remover"
                        >
                          <CloseIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-sm text-primary-600 font-semibold mt-0.5">
                        {formatCurrency(item.price)}
                      </p>

                      {/* Quantity + Line Total */}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1.5 rounded-l-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <RemoveIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="p-1.5 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                          >
                            <AddIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>
                        {item.quantity > 1 && (
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {/* Actions */}
              <Button onClick={onCheckout} className="w-full" icon={<ShoppingCartIcon />}>
                Finalizar Pedido
              </Button>
              <button
                onClick={clearCart}
                className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors py-1"
              >
                Limpar carrinho
              </button>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}

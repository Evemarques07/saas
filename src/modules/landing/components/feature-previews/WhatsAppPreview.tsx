import { useState, useEffect } from 'react';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const orderMessage = {
  customerName: 'Maria Silva',
  customerPhone: '(11) 99999-8888',
  items: [
    { name: 'Perfume Floral 100ml', qty: 1, price: 189.90 },
    { name: 'Serum Vitamina C', qty: 2, price: 79.90 },
    { name: 'Batom Matte Nude', qty: 1, price: 49.90 },
  ],
  address: 'Rua das Flores, 123 - Centro',
  paymentMethod: 'PIX',
  notes: 'Embrulhar para presente, por favor!',
};

export function WhatsAppPreview() {
  const [status, setStatus] = useState<'received' | 'typing' | 'confirmed'>('received');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const total = orderMessage.items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleConfirm = () => {
    setStatus('typing');
    setTimeout(() => {
      setStatus('confirmed');
      setShowConfirmation(true);
    }, 1500);
  };

  const handleReset = () => {
    setStatus('received');
    setShowConfirmation(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* WhatsApp Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
          M
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {orderMessage.customerName}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {orderMessage.customerPhone}
          </p>
        </div>
        <div className="text-xs text-gray-400">
          agora
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Order Message */}
        <div className="bg-green-100 dark:bg-green-900/30 rounded-2xl rounded-tl-sm p-4 max-w-[95%]">
          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-3">
            Novo Pedido #1234
          </p>

          {/* Items */}
          <div className="space-y-2 mb-3 pb-3 border-b border-green-200 dark:border-green-800">
            {orderMessage.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {item.qty}x {item.name}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  R$ {(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between font-bold text-sm mb-3">
            <span className="text-gray-800 dark:text-gray-200">Total</span>
            <span className="text-green-600 dark:text-green-400">R$ {total.toFixed(2)}</span>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
            <p><strong>Endereco:</strong> {orderMessage.address}</p>
            <p><strong>Pagamento:</strong> {orderMessage.paymentMethod}</p>
            {orderMessage.notes && (
              <p><strong>Obs:</strong> {orderMessage.notes}</p>
            )}
          </div>

          {/* Time */}
          <div className="flex justify-end items-center gap-1 mt-2">
            <span className="text-[10px] text-gray-500">10:32</span>
            <DoneAllIcon className="h-3 w-3 text-blue-500" />
          </div>
        </div>

        {/* Typing indicator */}
        {status === 'typing' && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tr-sm p-3 max-w-[60%] ml-auto">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Confirmation Message */}
        {showConfirmation && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tr-sm p-4 max-w-[90%] ml-auto animate-fade-in">
            <p className="text-sm text-gray-800 dark:text-gray-200">
              Ola {orderMessage.customerName.split(' ')[0]}! Pedido confirmado!
              Seu pedido sera enviado em ate 2 dias uteis. Obrigado pela preferencia!
            </p>
            <div className="flex justify-end items-center gap-1 mt-2">
              <span className="text-[10px] text-gray-500">10:33</span>
              <DoneAllIcon className="h-3 w-3 text-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {status === 'received' && (
          <>
            <button
              onClick={handleConfirm}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-colors"
            >
              <CheckCircleIcon className="h-5 w-5" />
              Confirmar Pedido
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium transition-colors">
              <SendIcon className="h-5 w-5" />
              Responder
            </button>
          </>
        )}

        {status === 'confirmed' && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-3">
              <CheckCircleIcon className="h-5 w-5" />
              Pedido Confirmado!
            </div>
            <button
              onClick={handleReset}
              className="block w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Ver outro exemplo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Modal, ModalFooter, Button, Input } from '../../../components/ui';
import { useCart } from '../../../contexts/CartContext';
import { supabase } from '../../../services/supabase';
import { Company } from '../../../types';
import toast from 'react-hot-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
}

export function CheckoutModal({ isOpen, onClose, company }: CheckoutModalProps) {
  const { items, subtotal, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove tudo que não é número
    const numbers = phone.replace(/\D/g, '');
    // Adiciona código do Brasil se não tiver
    if (numbers.length === 11) {
      return `55${numbers}`;
    }
    if (numbers.length === 13 && numbers.startsWith('55')) {
      return numbers;
    }
    return `55${numbers}`;
  };

  const generateWhatsAppMessage = () => {
    let message = `*Novo Pedido - ${company.name}*\n\n`;
    message += `*Cliente:* ${customerName}\n`;
    message += `*Telefone:* ${customerPhone}\n\n`;
    message += `*Itens do Pedido:*\n`;

    items.forEach((item) => {
      message += `- ${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}\n`;
    });

    message += `\n*Total:* ${formatCurrency(subtotal)}`;

    if (customerNotes) {
      message += `\n\n*Observações:* ${customerNotes}`;
    }

    return encodeURIComponent(message);
  };

  const saveOrderToDatabase = async () => {
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('catalog_orders')
      .insert({
        company_id: company.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_notes: customerNotes || null,
        subtotal,
        total: subtotal,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      product_price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('catalog_order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('Informe seu nome');
      return;
    }

    if (!customerPhone.trim()) {
      toast.error('Informe seu telefone');
      return;
    }

    setLoading(true);

    try {
      // Save order to Supabase
      await saveOrderToDatabase();

      // Open WhatsApp
      if (company.phone) {
        const whatsappNumber = formatPhoneForWhatsApp(company.phone);
        const message = generateWhatsAppMessage();
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');
      } else {
        // If company has no phone, just copy the message
        const message = generateWhatsAppMessage();
        await navigator.clipboard.writeText(decodeURIComponent(message));
        toast.success('Mensagem copiada! Envie para a empresa.');
      }

      setSuccess(true);
      clearCart();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Erro ao salvar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSuccess(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerNotes('');
      onClose();
    }
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Pedido Enviado">
        <div className="text-center py-8">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Pedido enviado com sucesso!
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {company.phone
              ? 'Seu pedido foi enviado via WhatsApp. A empresa entrará em contato para confirmar.'
              : 'Seu pedido foi registrado. A empresa entrará em contato em breve.'}
          </p>
          <Button onClick={handleClose}>Fechar</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Finalizar Pedido" size="lg">
      <form onSubmit={handleSubmit}>
        {/* Order Summary */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Resumo do Pedido
          </h4>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
                <span className="font-bold text-lg text-primary-600">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Seus Dados
          </h4>

          <Input
            label="Nome *"
            placeholder="Seu nome completo"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <Input
            label="Telefone/WhatsApp *"
            placeholder="(11) 99999-9999"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-primary-500 focus:border-transparent
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                resize-none"
              rows={3}
              placeholder="Alguma observação sobre o pedido? (opcional)"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
            />
          </div>
        </div>

        <ModalFooter className="mt-6 -mx-6 -mb-4 px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={<WhatsAppIcon />}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            {company.phone ? 'Enviar via WhatsApp' : 'Enviar Pedido'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

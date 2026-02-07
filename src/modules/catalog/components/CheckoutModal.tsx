import { useState, useEffect, useCallback, useRef } from 'react';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PersonIcon from '@mui/icons-material/Person';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import LoginIcon from '@mui/icons-material/Login';
import { Modal, ModalFooter, Button, Input } from '../../../components/ui';
import { useCart } from '../../../contexts/CartContext';
import { useCatalogCustomer } from '../../../contexts/CatalogCustomerContext';
import { supabase } from '../../../services/supabase';
import { Company, Customer, WhatsAppSettings, Coupon, ApplicablePromotion } from '../../../types';
import { CouponInput } from './CouponInput';
import { PointsRedeemSlider } from './PointsRedeemSlider';
import {
  sendTextMessage,
  formatOrderMessageForCustomer,
  formatOrderMessageForCompany,
  defaultWhatsAppSettings,
  checkPhoneOnWhatsApp,
  OrderDiscountInfo,
} from '../../../services/whatsapp';
import toast from 'react-hot-toast';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
}

// Chave do localStorage para salvar dados do cliente por empresa
const getCustomerStorageKey = (companySlug: string) => `ejym_catalog_customer_${companySlug}`;

interface SavedCustomerData {
  phone: string;
  name?: string;
}

export function CheckoutModal({ isOpen, onClose, company }: CheckoutModalProps) {
  const { items, subtotal, clearCart } = useCart();
  const {
    customer: loggedInCustomer,
    isAuthenticated,
    validateCoupon,
    loyaltyConfig,
    customerLoyalty,
    getApplicablePromotions,
  } = useCatalogCustomer();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true); // LGPD: opt-in por padrão
  const [saveCustomerData, setSaveCustomerData] = useState(false); // Salvar dados para próximas compras
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Loyalty points state
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);

  // Promotion state
  const [appliedPromotions, setAppliedPromotions] = useState<ApplicablePromotion[]>([]);
  const [promotionDiscount, setPromotionDiscount] = useState(0);

  // Existing customer (found by phone)
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [customerSearching, setCustomerSearching] = useState(false);

  // Calculate final total with all discounts
  const totalDiscount = couponDiscount + pointsDiscount + promotionDiscount;
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  // Calculate points to be earned (if loyalty is enabled)
  const pointsToEarn = loyaltyConfig?.enabled && customerLoyalty
    ? Math.floor(finalTotal * loyaltyConfig.points_per_real * (customerLoyalty.level?.points_multiplier || 1))
    : 0;

  // Phone validation states
  const [phoneValidation, setPhoneValidation] = useState<{
    isValidFormat: boolean;
    isChecking: boolean;
    hasWhatsApp: boolean | null; // null = not checked yet
    verifiedName: string | null;
  }>({
    isValidFormat: false,
    isChecking: false,
    hasWhatsApp: null,
    verifiedName: null,
  });
  const checkTimeoutRef = useRef<number | null>(null);
  const customerSearchTimeoutRef = useRef<number | null>(null);

  // Brazilian phone format validation (XX) XXXXX-XXXX or (XX) XXXX-XXXX
  const isValidBrazilianPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    // 10 digits (landline) or 11 digits (mobile)
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  // Format phone as user types
  const formatPhoneInput = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  // CPF validation and formatting
  const formatCpfInput = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
  };

  const isValidCpf = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;
    // Check for all same digits
    if (/^(\d)\1+$/.test(cleaned)) return false;
    // Validate CPF algorithm
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cleaned[10]);
  };

  // Search for existing customer by phone
  const searchCustomerByPhone = useCallback(async (phone: string) => {
    if (!company?.id) return;

    setCustomerSearching(true);
    try {
      const cleanedPhone = phone.replace(/\D/g, '');
      // Search by phone containing the digits (ignoring formatting)
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .ilike('phone', `%${cleanedPhone}%`)
        .limit(1)
        .single();

      if (!error && data) {
        setExistingCustomer(data);
        // Auto-fill fields if customer found
        setCustomerName(data.name || '');
        setCustomerEmail(data.email || '');
        setCustomerCpf(data.document ? formatCpfInput(data.document) : '');
        setSaveCustomerData(true); // Assume they want to keep saving
      } else {
        setExistingCustomer(null);
      }
    } catch (error) {
      console.error('[Checkout] Error searching customer:', error);
      setExistingCustomer(null);
    } finally {
      setCustomerSearching(false);
    }
  }, [company?.id]);

  // Check if phone has WhatsApp (debounced)
  const checkWhatsAppNumber = useCallback(async (phone: string) => {
    const whatsappSettings: WhatsAppSettings = company.whatsapp_settings || defaultWhatsAppSettings;

    // Only check if company has WhatsApp connected
    if (!whatsappSettings.connected || !whatsappSettings.user_token) {
      setPhoneValidation(prev => ({
        ...prev,
        isChecking: false,
        hasWhatsApp: null,
        verifiedName: null,
      }));
      return;
    }

    setPhoneValidation(prev => ({ ...prev, isChecking: true }));

    try {
      const result = await checkPhoneOnWhatsApp(whatsappSettings.user_token, phone);
      setPhoneValidation(prev => ({
        ...prev,
        isChecking: false,
        hasWhatsApp: result.exists,
        verifiedName: result.verifiedName,
      }));
    } catch (error) {
      console.error('[Checkout] Error checking WhatsApp:', error);
      setPhoneValidation(prev => ({
        ...prev,
        isChecking: false,
        hasWhatsApp: null,
        verifiedName: null,
      }));
    }
  }, [company.whatsapp_settings]);

  // Handle phone change with validation
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setCustomerPhone(formatted);

    // Clear previous timeouts
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }
    if (customerSearchTimeoutRef.current) {
      clearTimeout(customerSearchTimeoutRef.current);
    }

    // Reset existing customer when phone changes
    setExistingCustomer(null);

    // Check format validity
    const isValid = isValidBrazilianPhone(formatted);
    setPhoneValidation({
      isValidFormat: isValid,
      isChecking: false,
      hasWhatsApp: null,
      verifiedName: null,
    });

    // Debounce checks (1.5 seconds after user stops typing)
    if (isValid) {
      checkTimeoutRef.current = window.setTimeout(() => {
        checkWhatsAppNumber(formatted);
      }, 1500);

      // Also search for existing customer
      customerSearchTimeoutRef.current = window.setTimeout(() => {
        searchCustomerByPhone(formatted);
      }, 1000);
    }
  };

  // Handle CPF change
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpfInput(e.target.value);
    setCustomerCpf(formatted);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      if (customerSearchTimeoutRef.current) {
        clearTimeout(customerSearchTimeoutRef.current);
      }
    };
  }, []);

  // Auto-fill from logged in customer
  useEffect(() => {
    if (isOpen && isAuthenticated && loggedInCustomer && !initialLoadDone) {
      setCustomerName(loggedInCustomer.name || '');
      setCustomerEmail(loggedInCustomer.email || '');
      if (loggedInCustomer.phone) {
        const formattedPhone = formatPhoneInput(loggedInCustomer.phone);
        setCustomerPhone(formattedPhone);
        setPhoneValidation((prev) => ({
          ...prev,
          isValidFormat: isValidBrazilianPhone(formattedPhone),
        }));
      }
      if (loggedInCustomer.document) {
        setCustomerCpf(formatCpfInput(loggedInCustomer.document));
      }
      setExistingCustomer(loggedInCustomer as Customer);
      setSaveCustomerData(true);
      setInitialLoadDone(true);
      return;
    }

    // Load saved customer data from localStorage when modal opens
    if (isOpen && company?.slug && !initialLoadDone) {
      const storageKey = getCustomerStorageKey(company.slug);
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        try {
          const parsed: SavedCustomerData = JSON.parse(savedData);
          if (parsed.phone) {
            const formattedPhone = formatPhoneInput(parsed.phone);
            setCustomerPhone(formattedPhone);

            // Pre-fill name if saved
            if (parsed.name) {
              setCustomerName(parsed.name);
            }

            // Trigger customer search after setting phone
            const isValid = isValidBrazilianPhone(formattedPhone);
            setPhoneValidation(prev => ({
              ...prev,
              isValidFormat: isValid,
            }));

            if (isValid) {
              // Search for existing customer with this phone
              searchCustomerByPhone(formattedPhone);
              // Also check WhatsApp
              checkWhatsAppNumber(formattedPhone);
            }
          }
        } catch (error) {
          console.error('[Checkout] Error parsing saved customer data:', error);
        }
      }

      setInitialLoadDone(true);
    }
  }, [isOpen, company?.slug, initialLoadDone, searchCustomerByPhone, checkWhatsAppNumber, isAuthenticated, loggedInCustomer]);

  // Fetch applicable promotions when modal opens or cart/customer changes
  useEffect(() => {
    const fetchPromotions = async () => {
      if (!isOpen || items.length === 0) {
        setAppliedPromotions([]);
        setPromotionDiscount(0);
        return;
      }

      // Convert cart items to the format expected by getApplicablePromotions
      const cartItemsForPromotion = items.map((item) => ({
        product_id: item.productId,
        category_id: item.categoryId,
        quantity: item.quantity,
        price: item.price,
      }));

      try {
        const promotions = await getApplicablePromotions(cartItemsForPromotion, subtotal);
        setAppliedPromotions(promotions);

        // Calculate total promotion discount
        const totalPromotionDiscount = promotions.reduce((sum, p) => sum + p.discount, 0);
        setPromotionDiscount(totalPromotionDiscount);
      } catch (error) {
        console.error('[Checkout] Error fetching promotions:', error);
        setAppliedPromotions([]);
        setPromotionDiscount(0);
      }
    };

    fetchPromotions();
  }, [isOpen, items, subtotal, loggedInCustomer, getApplicablePromotions]);

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

  // Save or update customer if saveCustomerData is checked
  const saveOrUpdateCustomer = async (): Promise<string | null> => {
    if (!saveCustomerData) return existingCustomer?.id || null;

    const cleanedPhone = customerPhone.replace(/\D/g, '');
    const cleanedCpf = customerCpf.replace(/\D/g, '');

    const customerData = {
      company_id: company.id,
      name: customerName,
      phone: cleanedPhone,
      email: customerEmail || null,
      document: cleanedCpf || null,
      phone_has_whatsapp: phoneValidation.hasWhatsApp,
      source: 'catalog' as const,
      is_active: true,
    };

    if (existingCustomer) {
      // Update existing customer
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: customerName,
          email: customerEmail || null,
          document: cleanedCpf || null,
          phone_has_whatsapp: phoneValidation.hasWhatsApp,
          total_orders: (existingCustomer.total_orders || 0) + 1,
          total_spent: (existingCustomer.total_spent || 0) + subtotal,
          last_order_at: new Date().toISOString(),
        })
        .eq('id', existingCustomer.id)
        .select()
        .single();

      if (error) {
        console.error('[Checkout] Error updating customer:', error);
        return existingCustomer.id;
      }
      return data.id;
    } else {
      // Create new customer
      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          total_orders: 1,
          total_spent: subtotal,
          last_order_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // If duplicate phone, try to find existing
        if (error.code === '23505') {
          console.log('[Checkout] Customer already exists, fetching...');
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('company_id', company.id)
            .eq('phone', cleanedPhone)
            .single();
          return existing?.id || null;
        }
        console.error('[Checkout] Error creating customer:', error);
        return null;
      }
      return data.id;
    }
  };

  const saveOrderToDatabase = async () => {
    // Save/update customer if needed
    const customerId = await saveOrUpdateCustomer();

    // Create order with discounts
    const { data: order, error: orderError } = await supabase
      .from('catalog_orders')
      .insert({
        company_id: company.id,
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_notes: customerNotes || null,
        subtotal,
        discount: totalDiscount,
        coupon_id: appliedCoupon?.id || null,
        coupon_code: appliedCoupon?.code || null,
        coupon_discount: couponDiscount,
        points_used: pointsToUse,
        points_discount: pointsDiscount,
        points_earned: pointsToEarn,
        promotion_discount: promotionDiscount,
        total: finalTotal,
        status: 'pending',
        whatsapp_consent: whatsappConsent,
        consent_at: whatsappConsent ? new Date().toISOString() : null,
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

    // Record coupon usage if used
    if (appliedCoupon && customerId) {
      await supabase.from('coupon_usages').insert({
        coupon_id: appliedCoupon.id,
        customer_id: customerId,
        order_id: order.id,
        discount_applied: couponDiscount,
      });

      // Increment coupon usage count
      await supabase
        .from('coupons')
        .update({ usage_count: appliedCoupon.usage_count + 1 })
        .eq('id', appliedCoupon.id);
    }

    // Record loyalty points transactions if used/earned
    if (customerId && loyaltyConfig?.enabled) {
      const pointsTransactions = [];

      // Points redeemed
      if (pointsToUse > 0) {
        pointsTransactions.push({
          company_id: company.id,
          customer_id: customerId,
          order_id: order.id,
          points: -pointsToUse,
          type: 'redeemed',
          description: `Resgate no pedido #${order.id.slice(0, 8)}`,
        });
      }

      // Points earned
      if (pointsToEarn > 0) {
        pointsTransactions.push({
          company_id: company.id,
          customer_id: customerId,
          order_id: order.id,
          points: pointsToEarn,
          type: 'earned',
          description: `Compra #${order.id.slice(0, 8)}`,
        });
      }

      if (pointsTransactions.length > 0) {
        await supabase.from('loyalty_points').insert(pointsTransactions);

        // Update customer loyalty points balance
        const newBalance = (loggedInCustomer?.loyalty_points || 0) - pointsToUse + pointsToEarn;
        const newLifetime = (loggedInCustomer?.lifetime_points || 0) + pointsToEarn;

        await supabase
          .from('customers')
          .update({
            loyalty_points: newBalance,
            lifetime_points: newLifetime,
          })
          .eq('id', customerId);
      }
    }

    // Record promotion usage if promotions were applied
    if (appliedPromotions.length > 0) {
      for (const promo of appliedPromotions) {
        // Record usage
        await supabase.from('promotion_usages').insert({
          promotion_id: promo.promotion.id,
          customer_id: customerId,
          order_id: order.id,
          discount_applied: promo.discount,
        });

        // Increment promotion usage count
        await supabase
          .from('promotions')
          .update({ usage_count: (promo.promotion.usage_count || 0) + 1 })
          .eq('id', promo.promotion.id);
      }
    }

    return order;
  };

  // Send automatic WhatsApp notifications
  const sendWhatsAppNotifications = async (
    order: { id: string },
    whatsappSettings: WhatsAppSettings
  ) => {
    // Format items for message
    const orderItems = items.map((item) => ({
      quantity: item.quantity,
      product_name: item.name,
      subtotal: item.price * item.quantity,
    }));

    // Build discount info for messages
    const discountInfo: OrderDiscountInfo | undefined = totalDiscount > 0
      ? {
          subtotal,
          couponCode: appliedCoupon?.code,
          couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
          pointsUsed: pointsToUse > 0 ? pointsToUse : undefined,
          pointsDiscount: pointsDiscount > 0 ? pointsDiscount : undefined,
          promotionDiscount: promotionDiscount > 0 ? promotionDiscount : undefined,
          promotionNames: appliedPromotions.length > 0
            ? appliedPromotions.map(p => p.promotion.name || p.reason)
            : undefined,
        }
      : undefined;

    // Send notification to CUSTOMER
    try {
      const customerMessage = formatOrderMessageForCustomer(
        customerName,
        company.name,
        order.id,
        orderItems,
        finalTotal,
        'created',
        undefined,
        discountInfo
      );

      const customerResult = await sendTextMessage(
        whatsappSettings.user_token,
        customerPhone,
        customerMessage
      );

      if (customerResult.success) {
        console.log('[WhatsApp] Mensagem enviada para cliente');
      } else {
        console.warn('[WhatsApp] Falha ao enviar para cliente:', customerResult.error);
      }
    } catch (error) {
      console.error('[WhatsApp] Erro ao enviar para cliente:', error);
    }

    // Send notification to COMPANY (if has phone configured)
    if (whatsappSettings.phone) {
      try {
        const companyMessage = formatOrderMessageForCompany(
          customerName,
          customerPhone,
          orderItems,
          finalTotal,
          customerNotes || undefined,
          discountInfo
        );

        const companyResult = await sendTextMessage(
          whatsappSettings.user_token,
          whatsappSettings.phone,
          companyMessage
        );

        if (companyResult.success) {
          console.log('[WhatsApp] Mensagem enviada para empresa');
        } else {
          console.warn('[WhatsApp] Falha ao enviar para empresa:', companyResult.error);
        }
      } catch (error) {
        console.error('[WhatsApp] Erro ao enviar para empresa:', error);
      }
    }
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

    if (!isValidBrazilianPhone(customerPhone)) {
      toast.error('Telefone inválido. Informe DDD + número (10 ou 11 dígitos)');
      return;
    }

    // Validate CPF if user wants to register
    if (saveCustomerData) {
      if (!customerCpf.trim()) {
        toast.error('Informe seu CPF para se cadastrar');
        return;
      }
      if (!isValidCpf(customerCpf)) {
        toast.error('CPF inválido');
        return;
      }
    }

    setLoading(true);

    try {
      // Save order to Supabase
      const order = await saveOrderToDatabase();

      // Get WhatsApp settings from company
      const whatsappSettings: WhatsAppSettings = company.whatsapp_settings || defaultWhatsAppSettings;

      // Check if automatic WhatsApp notifications are enabled
      // LGPD: Only send if customer consented
      const canSendAutomatic =
        whatsappConsent && // LGPD: Verifica consentimento do cliente
        whatsappSettings.enabled &&
        whatsappSettings.connected &&
        whatsappSettings.user_token &&
        whatsappSettings.notify_on_new_order;

      if (canSendAutomatic) {
        // Send automatic notifications via WuzAPI (fire and forget - non-blocking)
        sendWhatsAppNotifications(order, whatsappSettings);
      }

      // Show success message (neutral - don't promise WhatsApp delivery)
      toast.success('Pedido enviado com sucesso!');

      // Save customer data to localStorage for future orders
      if (company?.slug) {
        const dataToSave: SavedCustomerData = {
          phone: customerPhone.replace(/\D/g, ''),
          name: customerName,
        };
        localStorage.setItem(getCustomerStorageKey(company.slug), JSON.stringify(dataToSave));
        console.log('[Checkout] Customer data saved to localStorage');
      }

      if (!canSendAutomatic) {
        // Fallback: Open WhatsApp manually (old behavior)
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
      setCustomerEmail('');
      setCustomerCpf('');
      setCustomerNotes('');
      setWhatsappConsent(true); // Reset para o padrão
      setSaveCustomerData(false);
      setExistingCustomer(null);
      setCustomerSearching(false);
      setInitialLoadDone(false); // Reset para permitir carregar dados salvos na próxima abertura
      setPhoneValidation({
        isValidFormat: false,
        isChecking: false,
        hasWhatsApp: null,
        verifiedName: null,
      });
      // Reset coupon, points and promotions
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setPointsToUse(0);
      setPointsDiscount(0);
      setAppliedPromotions([]);
      setPromotionDiscount(0);
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
            A empresa recebeu seu pedido. Se você informou corretamente seu contato,
            poderemos mantê-lo informado sobre a situação do seu pedido por mensagem.
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
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
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

            {/* Subtotal */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>

            {/* Coupon discount */}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">
                  Cupom: {appliedCoupon?.code}
                </span>
                <span className="text-green-600 dark:text-green-400">
                  -{formatCurrency(couponDiscount)}
                </span>
              </div>
            )}

            {/* Points discount */}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-600 dark:text-amber-400">
                  Pontos: {pointsToUse} pts
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  -{formatCurrency(pointsDiscount)}
                </span>
              </div>
            )}

            {/* Promotion discounts */}
            {appliedPromotions.length > 0 && (
              <div className="space-y-1">
                {appliedPromotions.map((promo) => (
                  <div key={promo.promotion.id} className="flex justify-between text-sm">
                    <span className="text-purple-600 dark:text-purple-400">
                      {promo.promotion.name || promo.reason}
                    </span>
                    <span className="text-purple-600 dark:text-purple-400">
                      -{formatCurrency(promo.discount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
                <span className="font-bold text-lg text-primary-600">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>

            {/* Points to earn */}
            {pointsToEarn > 0 && (
              <div className="flex justify-between text-sm pt-1">
                <span className="text-amber-600 dark:text-amber-400">Você vai ganhar</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  +{pointsToEarn} pts
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Coupon Input */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cupom de Desconto
          </h4>
          <CouponInput
            onValidate={validateCoupon}
            orderValue={subtotal}
            onApply={(coupon, discount) => {
              setAppliedCoupon(coupon);
              setCouponDiscount(discount);
            }}
            onRemove={() => {
              setAppliedCoupon(null);
              setCouponDiscount(0);
            }}
            appliedCoupon={appliedCoupon}
            appliedDiscount={couponDiscount}
          />
        </div>

        {/* Points Redemption - Only for logged in customers with points */}
        {isAuthenticated && loyaltyConfig?.enabled && customerLoyalty && customerLoyalty.points > 0 && (
          <div className="mb-6">
            <PointsRedeemSlider
              customerLoyalty={customerLoyalty}
              loyaltyConfig={loyaltyConfig}
              orderValue={subtotal - couponDiscount}
              onPointsChange={(points, discount) => {
                setPointsToUse(points);
                setPointsDiscount(discount);
              }}
            />
          </div>
        )}

        {/* Customer Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Seus Dados
          </h4>

          {/* Phone first - to trigger customer search */}
          <div className="space-y-1">
            <Input
              label="Telefone/WhatsApp *"
              placeholder="(85) 99999-9999"
              value={customerPhone}
              onChange={handlePhoneChange}
              required
              maxLength={16}
            />
            {/* Phone validation feedback */}
            {customerPhone.length > 0 && (
              <div className="flex flex-col gap-1">
                {/* Customer found indicator */}
                {customerSearching ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-primary-500 rounded-full" />
                    <span>Buscando dados...</span>
                  </div>
                ) : existingCustomer ? (
                  <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                    <PersonIcon className="w-4 h-4" />
                    <span>Cliente encontrado! Dados preenchidos automaticamente.</span>
                  </div>
                ) : null}

                {/* WhatsApp validation */}
                <div className="flex items-center gap-2 text-sm">
                  {phoneValidation.isChecking ? (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-green-500 rounded-full" />
                      <span>Verificando WhatsApp...</span>
                    </div>
                  ) : phoneValidation.hasWhatsApp === true ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <WhatsAppIcon className="w-4 h-4" />
                      <span>
                        WhatsApp verificado
                        {phoneValidation.verifiedName && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            ({phoneValidation.verifiedName})
                          </span>
                        )}
                      </span>
                    </div>
                  ) : phoneValidation.hasWhatsApp === false ? (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <ErrorOutlineIcon className="w-4 h-4" />
                      <span>Número não encontrado no WhatsApp</span>
                    </div>
                  ) : !phoneValidation.isValidFormat && customerPhone.replace(/\D/g, '').length >= 8 ? (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <ErrorOutlineIcon className="w-4 h-4" />
                      <span>Informe o DDD + número completo</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <Input
            label="Nome *"
            placeholder="Seu nome completo"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                focus:ring-2 focus:ring-primary-500 focus:border-transparent
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                resize-none"
              rows={2}
              placeholder="Alguma observação sobre o pedido? (opcional)"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
            />
          </div>

          {/* Save customer data checkbox - only show if NOT logged in */}
          {!isAuthenticated && (
            <>
              <label className="flex items-start gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">
                <input
                  type="checkbox"
                  checked={saveCustomerData}
                  onChange={(e) => setSaveCustomerData(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <BookmarkIcon className="w-4 h-4 text-primary-600" />
                    Quero me cadastrar para próximas compras
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Preencha CPF e email para facilitar seus próximos pedidos
                  </p>
                </div>
              </label>

              {/* CPF and Email fields - only visible when saveCustomerData is checked */}
              {saveCustomerData && (
                <div className="space-y-4 pl-4 border-l-2 border-primary-200 dark:border-primary-800">
                  <Input
                    label="CPF *"
                    placeholder="000.000.000-00"
                    value={customerCpf}
                    onChange={handleCpfChange}
                    maxLength={14}
                    required={saveCustomerData}
                    error={customerCpf.length === 14 && !isValidCpf(customerCpf) ? 'CPF inválido' : undefined}
                  />

                  <Input
                    label="Email"
                    type="email"
                    placeholder="seu@email.com (opcional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {/* LGPD: Checkbox de consentimento WhatsApp */}
          <label className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <input
              type="checkbox"
              checked={whatsappConsent}
              onChange={(e) => setWhatsappConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Receber atualizações via WhatsApp
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Aceito receber notificações sobre o status do meu pedido pelo WhatsApp
              </p>
            </div>
          </label>
        </div>

        <ModalFooter className="mt-6 -mx-6 -mb-4 px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={<SendIcon />}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            Enviar Pedido
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

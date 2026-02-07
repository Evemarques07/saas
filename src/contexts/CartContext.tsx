import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getStorageKey = (slug: string) => `ejym_cart_${slug}`;

interface CartProviderProps {
  children: ReactNode;
  companySlug: string;
}

export function CartProvider({ children, companySlug }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (!companySlug) return [];
    try {
      const saved = localStorage.getItem(getStorageKey(companySlug));
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.items || [];
      }
    } catch {
      // ignore parse errors
    }
    return [];
  });

  // Persist to localStorage whenever items change
  useEffect(() => {
    if (!companySlug) return;
    const cart = {
      items,
      companySlug,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(getStorageKey(companySlug), JSON.stringify(cart));
  }, [items, companySlug]);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        // Increase quantity (respect stock limit)
        const newQuantity = Math.min(existing.quantity + 1, product.stock);
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: newQuantity } : item
        );
      }
      // Add new item
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: product.image_url || (product.images?.length ? [...product.images].sort((a, b) => a.order - b.order)[0].url : null),
          stock: product.stock,
          categoryId: product.category_id || undefined,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          // Respect stock limit
          const newQuantity = Math.min(quantity, item.stock);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (productId: string) => items.some((item) => item.productId === productId),
    [items]
  );

  const getItemQuantity = useCallback(
    (productId: string) => {
      const item = items.find((i) => i.productId === productId);
      return item?.quantity || 0;
    },
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isInCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

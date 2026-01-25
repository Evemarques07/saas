import { useState, useEffect } from 'react';

// Dados dos produtos mockados
const carouselImages = [
  '/prod1foto1.png',
  '/prod1foto2.png',
  '/prod1foto3.png',
  '/prod1foto4.png',
];

const mockProducts = [
  {
    id: 1,
    name: 'Calça Wide Leg CARGO Jeans Feminina Cintura Alta pantalona',
    price: 189.90,
    image: carouselImages,
    category: 'Moda',
    isCarousel: true,
  },
  {
    id: 2,
    name: 'Água Micelar Carvão Ativado',
    price: 12.90,
    image: '/Água micelar carvão ativado Swiss Beauty.jpeg',
    category: 'Limpeza',
    isCarousel: false,
  },
  {
    id: 3,
    name: 'Água Micelar Morango',
    price: 12.90,
    image: '/Água micelar Morango Swiss Beauty.jpeg',
    category: 'Limpeza',
    isCarousel: false,
  },
  {
    id: 4,
    name: 'Água Micelar Rosa Mosqueta',
    price: 12.90,
    image: '/Água micelar rosa mosqueta Swiss Beauty.jpeg',
    category: 'Limpeza',
    isCarousel: false,
  },
  {
    id: 5,
    name: 'Água Micelar Hyaluronic',
    price: 15.90,
    image: '/Água micelar triple hyaluronic íons Derma Chem.png',
    category: 'Hidratação',
    isCarousel: false,
  },
  {
    id: 6,
    name: 'Saia Longa Feminina Alfaiataria Moda Evangélica Casual Básica',
    price: 89.90,
    image: '/prod2foto1.png',
    category: 'Tratamento',
    isCarousel: false,
  },
];

// Notificação flutuante de compra
function FloatingPurchaseNotification({ show, product }: { show: boolean; product: typeof mockProducts[0] | null }) {
  if (!show || !product) return null;

  return (
    <div
      className={`absolute top-4 right-4 bg-white rounded-xl shadow-2xl p-3 flex items-center gap-3 z-30 max-w-[200px] transform transition-all duration-700 ease-out ${
        show ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{
        animation: show ? 'slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
      }}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-green-600 font-semibold">Adicionado!</p>
        <p className="text-[9px] text-gray-600 truncate">{product.name}</p>
      </div>
    </div>
  );
}

// Notificação de novo pedido
function FloatingOrderNotification({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      className={`absolute bottom-4 left-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-2xl p-3 flex items-center gap-3 z-30 max-w-[220px] transform transition-all duration-700 ease-out ${
        show ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
      }`}
      style={{
        animation: show ? 'slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
      }}
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/90 font-semibold">Novo Pedido!</p>
        <p className="text-[9px] text-white/70">Maria S. - R$ 234,80</p>
      </div>
    </div>
  );
}

// Componente de Card do Produto
function ProductCard({ product, onAddToCart }: { product: typeof mockProducts[0]; onAddToCart: (p: typeof mockProducts[0]) => void }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Carrossel automático para o produto destacado
  useEffect(() => {
    if (!product.isCarousel || !Array.isArray(product.image)) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % product.image.length);
        setIsTransitioning(false);
      }, 400);
    }, 2500);

    return () => clearInterval(interval);
  }, [product.isCarousel, product.image]);

  const currentImage = product.isCarousel && Array.isArray(product.image)
    ? product.image[currentImageIndex]
    : product.image;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col transform transition-all duration-500 ease-out ${
        isHovered ? 'shadow-xl scale-[1.02] -translate-y-1' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Imagem do Produto */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <div
          className={`absolute inset-0 transition-all duration-700 ease-out ${
            isTransitioning ? 'opacity-0 scale-110 blur-sm' : 'opacity-100 scale-100 blur-0'
          }`}
        >
          <img
            src={currentImage as string}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Overlay de hover */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`} />

        {/* Indicadores do carrossel */}
        {product.isCarousel && Array.isArray(product.image) && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {product.image.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-500 ease-out ${
                  idx === currentImageIndex
                    ? 'w-4 bg-white shadow-lg'
                    : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Badge de categoria */}
        <div className="absolute top-2 left-2">
          <span className="text-[8px] font-semibold px-2 py-0.5 bg-blue-500/90 text-white rounded-full backdrop-blur-sm">
            {product.category}
          </span>
        </div>

        {/* Botão de visualizar */}
        <button className={`absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg backdrop-blur-sm transition-all duration-300 ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}>
          <svg className="w-3.5 h-3.5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>

      {/* Info do Produto */}
      <div className="p-2.5 flex-1 flex flex-col">
        <h3 className="text-[10px] font-medium text-gray-800 line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <p className="text-xs font-bold text-blue-600 mt-1">
          {formatCurrency(product.price)}
        </p>

        {/* Botão Adicionar */}
        <button
          onClick={() => onAddToCart(product)}
          className="mt-2 w-full py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-[9px] font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar
        </button>
      </div>
    </div>
  );
}

export function MockCatalog() {
  const [cartCount, setCartCount] = useState(3);
  const [showPurchaseNotification, setShowPurchaseNotification] = useState(false);
  const [showOrderNotification, setShowOrderNotification] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<typeof mockProducts[0] | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Mostrar notificação de pedido periodicamente
  useEffect(() => {
    const showNotification = () => {
      setShowOrderNotification(true);
      setTimeout(() => setShowOrderNotification(false), 4000);
    };

    // Primeira notificação após 3 segundos
    const initialTimeout = setTimeout(showNotification, 3000);

    // Repetir a cada 8 segundos
    const interval = setInterval(showNotification, 8000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const handleAddToCart = (product: typeof mockProducts[0]) => {
    setCartCount(prev => prev + 1);
    setLastAddedProduct(product);
    setShowPurchaseNotification(true);
    setTimeout(() => setShowPurchaseNotification(false), 3000);
  };

  return (
    <div className="relative w-full h-full">
      {/* Browser Frame */}
      <div className="bg-gray-200 rounded-t-xl px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-white rounded-md px-3 py-1 text-[10px] text-gray-500 flex items-center gap-2">
            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            mercadovirtual.app/catalogo/minhaloja
          </div>
        </div>
      </div>

      {/* Catalog Content */}
      <div className="bg-gray-100 rounded-b-xl overflow-hidden relative" style={{ height: 'calc(100% - 36px)' }}>
        {/* Notificações flutuantes */}
        <FloatingPurchaseNotification show={showPurchaseNotification} product={lastAddedProduct} />
        <FloatingOrderNotification show={showOrderNotification} />

        {/* Header do Catálogo */}
        <div className="bg-white border-b border-gray-200 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">MV</span>
              </div>
              <div>
                <h1 className="text-xs font-bold text-gray-800">Minha Loja</h1>
                <p className="text-[8px] text-gray-500">Catálogo de Produtos</p>
              </div>
            </div>

            {/* Carrinho */}
            <button className="relative flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500 text-white rounded-lg text-[10px] font-medium transition-all duration-300 hover:bg-blue-600 hover:scale-105">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className={`bg-white text-blue-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all duration-300 ${
                showPurchaseNotification ? 'scale-125 animate-bounce' : ''
              }`}>
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Barra de Busca */}
        <div className="px-3 py-2 bg-white border-b border-gray-100">
          <div className={`flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5 border-2 transition-all duration-300 ${
            searchFocused ? 'border-blue-400 bg-white shadow-sm' : 'border-transparent'
          }`}>
            <svg className={`w-3.5 h-3.5 transition-colors duration-300 ${
              searchFocused ? 'text-blue-500' : 'text-gray-400'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar produtos..."
              className="flex-1 bg-transparent text-[10px] text-gray-700 placeholder-gray-400 outline-none"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Grid de Produtos */}
        <div className="p-2 overflow-auto" style={{ height: 'calc(100% - 100px)' }}>
          <div className="grid grid-cols-3 gap-2">
            {mockProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-gray-200 text-center">
            <p className="text-[8px] text-gray-400">
              Powered by <span className="font-semibold text-blue-500">Mercado Virtual</span>
            </p>
          </div>
        </div>
      </div>

      {/* Estilos das animações */}
      <style>{`
        @keyframes slideInRight {
          0% {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          0% {
            transform: translateY(100%) scale(0.8);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

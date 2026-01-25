import { useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckIcon from '@mui/icons-material/Check';

const categories = ['Todos', 'Perfumes', 'Skincare', 'Maquiagem'];

const products = [
  {
    id: 1,
    name: 'Perfume Floral 100ml',
    price: 189.90,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop',
    category: 'Perfumes',
    isNew: false,
  },
  {
    id: 2,
    name: 'Serum Vitamina C',
    price: 79.90,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&h=200&fit=crop',
    category: 'Skincare',
    isNew: true,
  },
  {
    id: 3,
    name: 'Eau de Parfum 50ml',
    price: 245.00,
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=200&h=200&fit=crop',
    category: 'Perfumes',
    isNew: false,
  },
  {
    id: 4,
    name: 'Paleta de Sombras',
    price: 129.90,
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=200&h=200&fit=crop',
    category: 'Maquiagem',
    isNew: true,
  },
  {
    id: 5,
    name: 'Hidratante Facial',
    price: 89.90,
    image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=200&h=200&fit=crop',
    category: 'Skincare',
    isNew: false,
  },
  {
    id: 6,
    name: 'Batom Matte Nude',
    price: 49.90,
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200&h=200&fit=crop',
    category: 'Maquiagem',
    isNew: false,
  },
];

export function CatalogPreview() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [cart, setCart] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addedProduct, setAddedProduct] = useState<number | null>(null);

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (productId: number) => {
    setCart(prev => [...prev, productId]);
    setAddedProduct(productId);
    setTimeout(() => setAddedProduct(null), 1000);
  };

  const cartTotal = cart.reduce((total, productId) => {
    const product = products.find(p => p.id === productId);
    return total + (product?.price || 0);
  }, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Store Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Bella Cosmeticos</h3>
          <p className="text-xs text-green-600 dark:text-green-400">Loja online</p>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              R$ {cartTotal.toFixed(2)}
            </span>
          )}
          <button className="flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-xl text-sm font-medium">
            <ShoppingCartIcon className="h-5 w-5" />
            <span>{cart.length}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === category
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-lg transition-all duration-300"
            >
              {/* Image */}
              <div className="relative mb-3">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-24 object-cover rounded-xl"
                />
                {product.isNew && (
                  <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    NOVO
                  </span>
                )}
              </div>

              {/* Info */}
              <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 truncate">
                {product.name}
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  R$ {product.price.toFixed(2)}
                </span>
                <button
                  onClick={() => handleAddToCart(product.id)}
                  disabled={addedProduct === product.id}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    addedProduct === product.id
                      ? 'bg-green-500 text-white'
                      : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  {addedProduct === product.id ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <AddShoppingCartIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-80">{cart.length} itens no carrinho</span>
            <span className="font-bold">R$ {cartTotal.toFixed(2)}</span>
          </div>
          <button className="w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-medium text-sm transition-colors">
            Finalizar Pedido via WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}

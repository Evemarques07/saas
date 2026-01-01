import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { supabase } from '../../services/supabase';
import { Company, Product, Category } from '../../types';
import { Input, Select, Card, Button } from '../../components/ui';
import { PageLoader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { CartProvider, useCart } from '../../contexts/CartContext';
import { CartDrawer, CheckoutModal } from './components';

export function CatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchCatalogData();
    }
  }, [slug]);

  const fetchCatalogData = async () => {
    setLoading(true);
    setError(false);

    // Fetch company by slug
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (companyError || !companyData) {
      setError(true);
      setLoading(false);
      return;
    }

    setCompany(companyData);

    // Fetch products and categories
    const [productsResult, categoriesResult] = await Promise.all([
      supabase
        .from('products')
        .select(`*, category:categories(*)`)
        .eq('company_id', companyData.id)
        .eq('is_active', true)
        .eq('show_in_catalog', true)
        .order('name'),
      supabase
        .from('categories')
        .select('*')
        .eq('company_id', companyData.id)
        .order('name'),
    ]);

    if (productsResult.data) setProducts(productsResult.data);
    if (categoriesResult.data) setCategories(categoriesResult.data);

    setLoading(false);
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <EmptyState
          title="Catálogo não encontrado"
          description="A empresa solicitada não existe ou está inativa"
        />
      </div>
    );
  }

  return (
    <CartProvider companySlug={company.slug}>
      <CatalogContent
        company={company}
        products={products}
        categories={categories}
      />
    </CartProvider>
  );
}

interface CatalogContentProps {
  company: Company;
  products: Product[];
  categories: Category[];
}

function CatalogContent({ company, products, categories }: CatalogContentProps) {
  const { itemCount, addItem, isInCart, getItemQuantity, updateQuantity } = useCart();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCheckout = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {company.logo_url && (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {company.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Catálogo de Produtos
                </p>
              </div>
            </div>

            {/* Cart Button (Desktop) */}
            <button
              onClick={() => setCartOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              <ShoppingCartIcon className="w-5 h-5" />
              <span className="font-medium">Carrinho</span>
              {itemCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-white text-primary-600 rounded-full">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar produtos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<SearchIcon className="w-5 h-5" />}
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todas as categorias' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Tente ajustar os filtros de busca"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const inCart = isInCart(product.id);
              const quantity = getItemQuantity(product.id);
              const isOutOfStock = product.stock <= 0;

              return (
                <Card key={product.id} padding="none" className="overflow-hidden flex flex-col">
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg
                          className="w-16 h-16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">Esgotado</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    {product.category && (
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                        {product.category.name}
                      </span>
                    )}
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 line-clamp-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <p className="text-lg font-bold text-primary-600 mt-2">
                      {formatCurrency(product.price)}
                    </p>

                    {/* Add to Cart Button */}
                    <div className="mt-auto pt-3">
                      {isOutOfStock ? (
                        <Button variant="secondary" disabled className="w-full">
                          Indisponível
                        </Button>
                      ) : inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <RemoveIcon className="w-5 h-5" />
                          </button>
                          <span className="flex-1 text-center font-semibold text-lg">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            disabled={quantity >= product.stock}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            <AddIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => addItem(product)}
                          icon={<AddShoppingCartIcon />}
                          className="w-full"
                        >
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Powered by <span className="font-semibold text-primary-600">Ejym</span>
        </div>
      </footer>

      {/* Floating Cart Button (Mobile) */}
      {itemCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 sm:hidden flex items-center gap-2 px-5 py-3 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-all hover:scale-105"
        >
          <ShoppingCartIcon className="w-5 h-5" />
          <span className="font-semibold">{itemCount}</span>
        </button>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        company={company}
      />
    </div>
  );
}

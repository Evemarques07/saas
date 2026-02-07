import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import PersonIcon from '@mui/icons-material/Person';
import LoginIcon from '@mui/icons-material/Login';
import GetAppIcon from '@mui/icons-material/GetApp';
import { supabase } from '../../services/supabase';
import { getSubdomainSlug, buildCatalogoProductPath } from '../../routes/paths';
import { Company, Product, Category } from '../../types';
import { Input, Card, Button, ImageCarousel, ImageLightbox } from '../../components/ui';
import { PageLoader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { CartProvider, useCart } from '../../contexts/CartContext';
import { CatalogCustomerProvider, useCatalogCustomer } from '../../contexts/CatalogCustomerContext';
import { CartDrawer, CheckoutModal, CustomerLoginModal, CustomerAccountDrawer, CatalogInstallPrompt } from './components';
import { useCatalogPWA } from '../../hooks/useCatalogPWA';

export function CatalogPage() {
  const { slug: urlSlug } = useParams<{ slug: string }>();
  // Em modo subdomínio, pega o slug do hostname se não vier na URL
  const slug = urlSlug || getSubdomainSlug();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) {
      console.log('[CatalogPage] Loading catalog for slug:', slug);
      fetchCatalogData();
    } else {
      console.log('[CatalogPage] No slug found');
      setError(true);
      setLoading(false);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <EmptyState
          title="Catálogo não encontrado"
          description="A empresa solicitada não existe ou está inativa"
        />
      </div>
    );
  }

  return (
    <CartProvider companySlug={company.slug}>
      <CatalogCustomerProvider companyId={company.id} companySlug={company.slug}>
        <CatalogContent
          company={company}
          products={products}
          categories={categories}
        />
      </CatalogCustomerProvider>
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
  const { customer, isAuthenticated, isLoading: customerLoading } = useCatalogCustomer();
  const {
    isInstallable,
    isInstalled,
    isIOS,
    installApp,
    showIOSInstructions,
    setShowIOSInstructions,
  } = useCatalogPWA({ company });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);

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

  const handleOpenLightbox = (product: Product, index: number) => {
    setLightboxProduct(product);
    setLightboxIndex(index);
  };

  const handleCloseLightbox = () => {
    setLightboxProduct(null);
    setLightboxIndex(0);
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-100 dark:bg-gray-950 flex flex-col p-2 md:p-4">
      {/* Header - Arredondado */}
      <header className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 mb-2 md:mb-4 flex-shrink-0">
        <div className="px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              {company.logo_url && (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                  {company.name}
                </h1>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                  Catálogo de Produtos
                </p>
              </div>
            </div>

            {/* Account & Cart Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Account Button */}
              {customerLoading ? (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ) : isAuthenticated ? (
                <button
                  onClick={() => setAccountDrawerOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 p-2 sm:px-3 sm:py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title={customer?.name || 'Minha Conta'}
                >
                  <PersonIcon className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium max-w-[120px] truncate">{customer?.name?.split(' ')[0]}</span>
                </button>
              ) : (
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 p-2 sm:px-3 sm:py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Entrar"
                >
                  <LoginIcon className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Entrar</span>
                </button>
              )}

              {/* Install Button - Only when installable */}
              {isInstallable && !isInstalled && (
                <button
                  onClick={installApp}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                  title="Instalar App"
                >
                  <GetAppIcon className="w-5 h-5" />
                  <span className="font-medium">Instalar</span>
                </button>
              )}

              {/* Cart Button - Desktop only (mobile has floating button) */}
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
        </div>
      </header>

      {/* Main Content - Container arredondado com scroll interno */}
      <main className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col min-h-0">
        {/* Filters - Sticky no topo */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-3 md:px-4 pt-3 md:pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 space-y-2">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon className="w-5 h-5" />}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                type="button"
                aria-label="Limpar busca"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Chips - Horizontal scroll */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setCategoryFilter('')}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  !categoryFilter
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(categoryFilter === cat.id ? '' : cat.id)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products Grid - Área com scroll */}
        <div className="flex-1 overflow-auto px-3 md:px-4 py-3 md:py-4">
          {filteredProducts.length === 0 ? (
            <EmptyState
              title="Nenhum produto encontrado"
              description="Tente ajustar os filtros de busca"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
              {filteredProducts.map((product) => {
                const inCart = isInCart(product.id);
                const quantity = getItemQuantity(product.id);
                const isOutOfStock = product.stock <= 0;

                return (
                  <Card key={product.id} padding="none" className="overflow-hidden flex flex-col">
                    {/* Product Image - clicável para detalhes */}
                    <Link to={buildCatalogoProductPath(company.slug, product.id)} className="relative block">
                      <ImageCarousel
                        images={product.images || []}
                        fallbackUrl={product.image_url}
                        alt={product.name}
                        onImageClick={(index) => handleOpenLightbox(product, index)}
                        className="bg-gray-100 dark:bg-gray-800"
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                          <span className="text-white font-semibold text-sm md:text-lg">Esgotado</span>
                        </div>
                      )}
                    </Link>

                    {/* Product Info */}
                    <div className="p-2.5 md:p-3 flex-1 flex flex-col">
                      {product.category && (
                        <span className="text-[10px] md:text-xs text-primary-600 dark:text-primary-400 font-medium">
                          {product.category.name}
                        </span>
                      )}
                      <Link
                        to={buildCatalogoProductPath(company.slug, product.id)}
                        className="block mt-0.5"
                      >
                        <h3 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                      {product.description && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 hidden lg:block">
                          {product.description}
                        </p>
                      )}
                      <p className="text-sm md:text-base font-bold text-primary-600 mt-1.5">
                        {formatCurrency(product.price)}
                      </p>

                      {/* Add to Cart */}
                      <div className="mt-auto pt-2">
                        {isOutOfStock ? (
                          <Button variant="secondary" disabled className="w-full text-xs md:text-sm">
                            Indisponível
                          </Button>
                        ) : inCart ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                              <RemoveIcon className="w-4 h-4" />
                            </button>
                            <span className="flex-1 text-center font-semibold text-sm md:text-base">
                              {quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              disabled={quantity >= product.stock}
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              <AddIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => addItem(product)}
                            icon={<AddShoppingCartIcon className="w-4 h-4" />}
                            className="w-full text-xs md:text-sm"
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

          {/* Footer dentro do container */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
            Powered by <span className="font-semibold text-primary-600">Mercado Virtual</span>
          </div>
        </div>
      </main>

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

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxProduct !== null}
        onClose={handleCloseLightbox}
        images={lightboxProduct?.images || []}
        fallbackUrl={lightboxProduct?.image_url}
        initialIndex={lightboxIndex}
        alt={lightboxProduct?.name || ''}
      />

      {/* Customer Login Modal */}
      <CustomerLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => setAccountDrawerOpen(true)}
      />

      {/* Customer Account Drawer */}
      <CustomerAccountDrawer
        isOpen={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
        onRepeatOrder={(items) => {
          items.forEach(({ productId, quantity }) => {
            const product = products.find((p) => p.id === productId);
            if (product) {
              for (let i = 0; i < quantity; i++) {
                addItem(product);
              }
            }
          });
          setAccountDrawerOpen(false);
          setCartOpen(true);
        }}
      />

      {/* PWA Install Prompt */}
      <CatalogInstallPrompt
        company={company}
        isInstallable={isInstallable}
        isIOS={isIOS}
        onInstall={installApp}
        showIOSInstructions={showIOSInstructions}
        onCloseIOSInstructions={() => setShowIOSInstructions(false)}
      />
    </div>
  );
}

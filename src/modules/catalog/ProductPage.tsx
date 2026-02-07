import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { supabase } from '../../services/supabase';
import { getSubdomainSlug, buildCatalogoPath } from '../../routes/paths';
import { Company, Product } from '../../types';
import { Card, Button, ImageCarousel, ImageLightbox } from '../../components/ui';
import { PageLoader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/feedback/EmptyState';
import { CartProvider, useCart } from '../../contexts/CartContext';

export function ProductPage() {
  const { slug: urlSlug, productId } = useParams<{ slug: string; productId: string }>();
  const slug = urlSlug || getSubdomainSlug();
  const [company, setCompany] = useState<Company | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug && productId) {
      fetchProductData();
    }
  }, [slug, productId]);

  const fetchProductData = async () => {
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

    // Fetch product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`*, category:categories(*)`)
      .eq('id', productId)
      .eq('company_id', companyData.id)
      .eq('is_active', true)
      .eq('show_in_catalog', true)
      .single();

    if (productError || !productData) {
      setError(true);
      setLoading(false);
      return;
    }

    setProduct(productData);
    setLoading(false);
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !company || !product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <EmptyState
          title="Produto não encontrado"
          description="O produto solicitado não existe ou está indisponível"
          action={
            slug ? (
              <Link to={buildCatalogoPath(slug || '')}>
                <Button icon={<StorefrontIcon />}>Ver Catálogo</Button>
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <CartProvider companySlug={company.slug}>
      <ProductContent company={company} product={product} />
    </CartProvider>
  );
}

interface ProductContentProps {
  company: Company;
  product: Product;
}

function ProductContent({ company, product }: ProductContentProps) {
  const { itemCount, addItem, isInCart, getItemQuantity, updateQuantity } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const inCart = isInCart(product.id);
  const quantity = getItemQuantity(product.id);
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
                  Detalhes do Produto
                </p>
              </div>
            </div>

            {/* Cart Button */}
            {itemCount > 0 && (
              <Link
                to={buildCatalogoPath(company.slug)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                <span className="font-medium">Carrinho</span>
                <span className="px-2 py-0.5 text-xs font-bold bg-white text-primary-600 rounded-full">
                  {itemCount}
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Link */}
        <Link
          to={buildCatalogoPath(company.slug)}
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6"
        >
          <ArrowBackIcon className="w-5 h-5" />
          <span>Ver catálogo completo</span>
        </Link>

        {/* Product Card */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Image */}
            <div className="relative">
              <ImageCarousel
                images={product.images || []}
                fallbackUrl={product.image_url}
                alt={product.name}
                onImageClick={handleOpenLightbox}
                className="bg-gray-100 dark:bg-gray-800"
              />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                  <span className="text-white font-semibold text-2xl">Esgotado</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-6 flex flex-col">
              {product.category && (
                <span className="text-sm text-primary-600 dark:text-primary-400 font-medium mb-2">
                  {product.category.name}
                </span>
              )}

              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {product.name}
              </h2>

              {product.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-6 flex-1">
                  {product.description}
                </p>
              )}

              <div className="space-y-4">
                {/* Price */}
                <p className="text-3xl font-bold text-primary-600">
                  {formatCurrency(product.price)}
                </p>

                {/* Stock Info */}
                {!isOutOfStock && (
                  <p className="text-sm text-gray-500">
                    {product.stock} unidade(s) em estoque
                  </p>
                )}

                {/* Add to Cart */}
                {isOutOfStock ? (
                  <Button variant="secondary" disabled className="w-full">
                    Produto Indisponível
                  </Button>
                ) : inCart ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <RemoveIcon className="w-6 h-6" />
                      </button>
                      <span className="flex-1 text-center font-semibold text-2xl">
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        disabled={quantity >= product.stock}
                        className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        <AddIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => addItem(product)}
                    icon={<AddShoppingCartIcon />}
                    className="w-full"
                    size="lg"
                  >
                    Adicionar ao Carrinho
                  </Button>
                )}

                {/* View Cart Link */}
                {inCart && (
                  <Link to={buildCatalogoPath(company.slug)}>
                    <Button variant="secondary" className="w-full" icon={<ShoppingCartIcon />}>
                      Ver Carrinho e Finalizar
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* View Full Catalog */}
        <div className="mt-8 text-center">
          <Link to={buildCatalogoPath(company.slug)}>
            <Button variant="secondary" size="lg" icon={<StorefrontIcon />}>
              Ver Catálogo Completo
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Powered by <span className="font-semibold text-primary-600">Ejym</span>
        </div>
      </footer>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={product.images || []}
        fallbackUrl={product.image_url}
        initialIndex={lightboxIndex}
        alt={product.name}
      />
    </div>
  );
}

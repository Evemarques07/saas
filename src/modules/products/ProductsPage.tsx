import { buildFullCatalogoProductUrl } from '../../routes/paths';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import * as XLSX from 'xlsx';
import WarningIcon from '@mui/icons-material/Warning';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Badge, Modal, ModalFooter, Select, Card, MultiImageUpload, ConfirmModal, BarcodeScanner } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { uploadProductImage, deleteProductImages, StorageError } from '../../services/storage';
import { getCompanyUsage, canAddProduct, UsageLimits } from '../../services/asaas';
import { Product, Category, TableColumn, ProductImage } from '../../types';
import { exportToExcel, exportToPDF } from '../../services/export';

export function ProductsPage() {
  const navigate = useNavigate();
  const { currentCompany, canManageProducts } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Array<Record<string, string | number>>>([]);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    ean: '',
    price: '',
    cost_price: '',
    stock: '0',
    min_stock: '0',
    category_id: '',
    is_active: true,
    show_in_catalog: true,
  });

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const [productsResult, categoriesResult] = await Promise.all([
      supabase
        .from('products')
        .select(`*, category:categories(*)`)
        .eq('company_id', currentCompany.id)
        .order('name'),
      supabase
        .from('categories')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name'),
    ]);

    if (productsResult.data) {
      setProducts(productsResult.data);
    }

    if (categoriesResult.data) {
      setCategories(categoriesResult.data);
    }

    // Carregar limites de uso do plano
    try {
      const usage = await getCompanyUsage(currentCompany.id);
      setUsageLimits(usage);
    } catch (err) {
      console.error('Erro ao carregar limites:', err);
    }

    setLoading(false);
  };

  // Gerar SKU automatico baseado no contador de produtos
  const generateSKU = async (): Promise<string> => {
    if (!currentCompany) return '';

    // Buscar o maior SKU numerico existente
    const { data } = await supabase
      .from('products')
      .select('sku')
      .eq('company_id', currentCompany.id)
      .like('sku', 'PROD-%')
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (data && data.length > 0 && data[0].sku) {
      const match = data[0].sku.match(/PROD-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Se nao encontrou com padrao, contar todos os produtos
    if (nextNumber === 1) {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('company_id', currentCompany.id);
      nextNumber = (count || 0) + 1;
    }

    return `PROD-${String(nextNumber).padStart(5, '0')}`;
  };

  // Download do template Excel para importacao
  const handleDownloadTemplate = () => {
    const template = [
      {
        'Nome *': 'Produto Exemplo',
        'Descrição': 'Descrição do produto',
        'EAN': '7891234567890',
        'Preço *': 99.90,
        'Preço de Custo': 50.00,
        'Estoque': 10,
        'Estoque Mínimo': 2,
        'Categoria': 'Nome da Categoria',
        'Ativo (S/N)': 'S',
        'Exibir no Catálogo (S/N)': 'S',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 25 }, // Nome
      { wch: 35 }, // Descricao
      { wch: 15 }, // EAN
      { wch: 12 }, // Preco
      { wch: 15 }, // Preco de Custo
      { wch: 10 }, // Estoque
      { wch: 15 }, // Estoque Minimo
      { wch: 20 }, // Categoria
      { wch: 12 }, // Ativo
      { wch: 22 }, // Exibir no Catalogo
    ];

    XLSX.writeFile(wb, 'modelo_produtos.xlsx');
    toast.success('Modelo baixado com sucesso!');
  };

  // Processar arquivo Excel para preview
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet);
      setImportPreview(jsonData);
    };
    reader.readAsBinaryString(file);
  };

  // Importar produtos do Excel
  const handleImportProducts = async () => {
    if (!currentCompany || importPreview.length === 0) return;

    // Verificar limite antes de importar
    if (usageLimits && usageLimits.products.limit !== null) {
      const availableSlots = usageLimits.products.limit - usageLimits.products.used;
      if (availableSlots <= 0) {
        toast.error('Limite de produtos atingido. Faca upgrade do seu plano para importar produtos.');
        return;
      }
      if (importPreview.length > availableSlots) {
        toast.error(`Voce pode importar apenas ${availableSlots} produto(s). Seu plano permite ${usageLimits.products.limit} produtos.`);
        return;
      }
    }

    setImporting(true);

    try {
      // Mapear categorias por nome
      const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

      let imported = 0;
      let errors = 0;

      for (const row of importPreview) {
        const name = String(row['Nome *'] || row['Nome'] || '').trim();
        const price = parseFloat(String(row['Preço *'] || row['Preço'] || row['Preco *'] || row['Preco'] || 0));

        if (!name || !price) {
          errors++;
          continue;
        }

        const categoryName = String(row['Categoria'] || '').toLowerCase().trim();
        const categoryId = categoryMap.get(categoryName) || null;

        const sku = await generateSKU();

        const productData = {
          company_id: currentCompany.id,
          name,
          description: String(row['Descrição'] || row['Descricao'] || '').trim() || null,
          sku,
          ean: String(row['EAN'] || row['Ean'] || row['ean'] || '').trim() || null,
          price,
          cost_price: parseFloat(String(row['Preço de Custo'] || row['Preco de Custo'] || 0)) || null,
          stock: parseInt(String(row['Estoque'] || 0)) || 0,
          min_stock: parseInt(String(row['Estoque Mínimo'] || row['Estoque Minimo'] || 0)) || 0,
          category_id: categoryId,
          is_active: String(row['Ativo (S/N)'] || 'S').toUpperCase() === 'S',
          show_in_catalog: String(row['Exibir no Catálogo (S/N)'] || row['Exibir no Catalogo (S/N)'] || 'S').toUpperCase() === 'S',
        };

        const { error } = await supabase.from('products').insert(productData);

        if (error) {
          console.error('Erro ao importar produto:', error);
          errors++;
        } else {
          imported++;
        }
      }

      if (imported > 0) {
        toast.success(`${imported} produto(s) importado(s) com sucesso!`);
      }
      if (errors > 0) {
        toast.error(`${errors} produto(s) com erro na importação`);
      }

      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      fetchData();
    } catch (err) {
      console.error('Erro na importação:', err);
      toast.error('Erro ao importar produtos');
    } finally {
      setImporting(false);
    }
  };

  const handleOpenModal = async (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        ean: product.ean || '',
        price: String(product.price),
        cost_price: product.cost_price ? String(product.cost_price) : '',
        stock: String(product.stock),
        min_stock: String(product.min_stock),
        category_id: product.category_id || '',
        is_active: product.is_active,
        show_in_catalog: product.show_in_catalog,
      });
      // Load images from product or fallback to image_url
      if (product.images && product.images.length > 0) {
        setProductImages(product.images);
      } else if (product.image_url) {
        // Fallback: convert legacy image_url to images array
        setProductImages([{ url: product.image_url, order: 0, isPrimary: true }]);
      } else {
        setProductImages([]);
      }
    } else {
      // Gerar SKU automatico para novo produto
      const newSku = await generateSKU();
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        sku: newSku,
        ean: '',
        price: '',
        cost_price: '',
        stock: '0',
        min_stock: '0',
        category_id: '',
        is_active: true,
        show_in_catalog: true,
      });
      setProductImages([]);
    }
    setNewImageFiles([]);
    setDeletedImageUrls([]);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error('Nome e preco sao obrigatorios');
      return;
    }

    // Verificar limite de produtos ao criar novo
    if (!editingProduct && usageLimits && !canAddProduct(usageLimits)) {
      toast.error('Limite de produtos atingido. Faca upgrade do seu plano para adicionar mais produtos.');
      return;
    }

    setSubmitting(true);

    try {
      let finalImages = [...productImages];

      // Upload new images
      if (newImageFiles.length > 0) {
        setUploadingImages(true);
        try {
          for (const file of newImageFiles) {
            const result = await uploadProductImage(file, currentCompany!.id);
            // Find the matching image by its blob URL and replace with the real URL
            const blobUrlIndex = finalImages.findIndex(img => img.url.startsWith('blob:'));
            if (blobUrlIndex !== -1) {
              finalImages[blobUrlIndex] = {
                ...finalImages[blobUrlIndex],
                url: result.url,
              };
            }
          }
        } catch (err) {
          if (err instanceof StorageError) {
            toast.error(err.message);
          } else {
            toast.error('Erro ao enviar imagens');
          }
          setUploadingImages(false);
          setSubmitting(false);
          return;
        }
        setUploadingImages(false);
      }

      // Delete removed images
      if (deletedImageUrls.length > 0) {
        await deleteProductImages(deletedImageUrls).catch(() => {
          // Ignore errors when deleting images
        });
      }

      // Normalize order values
      finalImages = finalImages.map((img, index) => ({
        ...img,
        order: index,
      }));

      // Get primary image URL for backwards compatibility
      const primaryImage = finalImages.find(img => img.isPrimary) || finalImages[0];
      const imageUrl = primaryImage?.url || null;

      const productData = {
        company_id: currentCompany!.id,
        name: formData.name,
        description: formData.description || null,
        sku: formData.sku || null,
        ean: formData.ean || null,
        price: parseFloat(formData.price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        show_in_catalog: formData.show_in_catalog,
        image_url: imageUrl,
        images: finalImages,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast.success('Produto criado com sucesso!');
      }

      setShowModal(false);
      fetchData();
    } catch {
      toast.error('Erro ao salvar produto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (product: Product) => {
    setDeleteModal({ open: true, product });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({ open: false, product: null });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.product) return;

    setDeleting(true);
    try {
      // Remover todas as imagens do storage
      const imagesToDelete: string[] = [];
      if (deleteModal.product.images && deleteModal.product.images.length > 0) {
        imagesToDelete.push(...deleteModal.product.images.map(img => img.url));
      } else if (deleteModal.product.image_url) {
        imagesToDelete.push(deleteModal.product.image_url);
      }

      if (imagesToDelete.length > 0) {
        await deleteProductImages(imagesToDelete).catch(() => {
          // Ignora erro ao deletar imagens
        });
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteModal.product.id);

      if (error) throw error;
      toast.success('Produto excluido com sucesso!');
      handleCloseDeleteModal();
      fetchData();
    } catch {
      toast.error('Erro ao excluir produto');
    } finally {
      setDeleting(false);
    }
  };

  const handleImagesChange = (images: ProductImage[], newFiles: File[], deletedUrls: string[]) => {
    setProductImages(images);
    setNewImageFiles(newFiles);
    setDeletedImageUrls(deletedUrls);
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    const data = filteredProducts.map((p) => ({
      Nome: p.name,
      SKU: p.sku || '-',
      EAN: p.ean || '-',
      Categoria: p.category?.name || '-',
      Preço: `R$ ${p.price.toFixed(2)}`,
      Estoque: p.stock,
      Status: p.is_active ? 'Ativo' : 'Inativo',
    }));

    if (format === 'excel') {
      exportToExcel(data, 'produtos');
    } else {
      exportToPDF(data, 'produtos', 'Produtos');
    }
  };

  const getProductCatalogUrl = (productId: string) => {
    return buildFullCatalogoProductUrl(currentCompany?.slug || '', productId);
  };

  const handleCopyProductLink = async (productId: string) => {
    const url = getProductCatalogUrl(productId);
    await navigator.clipboard.writeText(url);
    toast.success('Link do produto copiado!');
  };

  const handleOpenProductLink = (productId: string) => {
    const url = getProductCatalogUrl(productId);
    window.open(url, '_blank');
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.ean?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: TableColumn<Product>[] = [
    {
      key: 'image',
      label: '',
      render: (p) => (
        p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
        )
      ),
    },
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'sku', label: 'SKU', render: (p) => p.sku || '-' },
    {
      key: 'category.name',
      label: 'Categoria',
      render: (p) => p.category?.name || '-',
    },
    {
      key: 'price',
      label: 'Preço',
      sortable: true,
      render: (p) => `R$ ${p.price.toFixed(2)}`,
    },
    {
      key: 'stock',
      label: 'Estoque',
      sortable: true,
      render: (p) => (
        <span className={p.stock <= p.min_stock ? 'text-red-600' : ''}>
          {p.stock}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (p) => (
        <Badge variant={p.is_active ? 'success' : 'default'}>
          {p.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (p) => (
        <div className="flex items-center gap-2">
          {p.show_in_catalog && p.is_active && (
            <>
              <button
                onClick={() => handleCopyProductLink(p.id)}
                className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                title="Copiar link do produto"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenProductLink(p.id)}
                className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                title="Abrir página do produto"
              >
                <OpenInNewIcon className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => handleOpenModal(p)}
            className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
            title="Editar produto"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          {canManageProducts && (
            <button
              onClick={() => handleOpenDeleteModal(p)}
              className="p-1 text-gray-500 hover:text-red-600 transition-colors"
              title="Excluir produto"
            >
              <DeleteIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (!currentCompany) {
    return (
      <PageContainer title="Produtos">
        <EmptyState
          title="Selecione uma empresa"
          description="Selecione uma empresa para gerenciar os produtos"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Produtos"
      subtitle={`${filteredProducts.length} produtos cadastrados`}
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => handleExport('excel')} className="hidden sm:flex">
            <FileDownloadIcon className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="secondary" onClick={() => handleExport('pdf')} className="hidden sm:flex">
            <FileDownloadIcon className="w-4 h-4" />
            PDF
          </Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)} className="hidden sm:flex">
            <FileUploadIcon className="w-4 h-4" />
            Importar
          </Button>
          <Button
            onClick={() => handleOpenModal()}
            disabled={usageLimits ? !canAddProduct(usageLimits) : false}
            title={usageLimits && !canAddProduct(usageLimits) ? 'Limite de produtos atingido' : undefined}
          >
            <AddIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Produto</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      }
      toolbar={
        <Card className="p-3 md:p-4">
          <Input
            placeholder="Buscar por nome, SKU ou EAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<SearchIcon className="w-5 h-5" />}
          />
        </Card>
      }
    >
      {/* Alerta de limite de produtos */}
      {usageLimits && usageLimits.products.limit !== null && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
          usageLimits.products.used >= usageLimits.products.limit
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            : usageLimits.products.used >= usageLimits.products.limit * 0.8
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              : 'hidden'
        }`}>
          <WarningIcon className={`w-5 h-5 flex-shrink-0 ${
            usageLimits.products.used >= usageLimits.products.limit
              ? 'text-red-600 dark:text-red-400'
              : 'text-yellow-600 dark:text-yellow-400'
          }`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              usageLimits.products.used >= usageLimits.products.limit
                ? 'text-red-800 dark:text-red-200'
                : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {usageLimits.products.used >= usageLimits.products.limit
                ? 'Limite de produtos atingido!'
                : 'Voce esta proximo do limite de produtos'}
            </p>
            <p className={`text-xs ${
              usageLimits.products.used >= usageLimits.products.limit
                ? 'text-red-600 dark:text-red-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {usageLimits.products.used} de {usageLimits.products.limit} produtos utilizados.
              {usageLimits.products.used >= usageLimits.products.limit
                ? ' Faca upgrade do seu plano para adicionar mais produtos.'
                : ` Restam ${usageLimits.products.limit - usageLimits.products.used} vagas.`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/faturamento')}
          >
            Ver Planos
          </Button>
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        data={filteredProducts}
        keyExtractor={(p) => p.id}
        loading={loading}
        emptyMessage="Nenhum produto encontrado"
        mobileCardRender={(p) => (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-3">
              {/* Image */}
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.sku || 'Sem SKU'}</p>
                  </div>
                  <Badge variant={p.is_active ? 'success' : 'default'} className="flex-shrink-0">
                    {p.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="font-semibold text-primary-600">R$ {p.price.toFixed(2)}</span>
                  <span className={`${p.stock <= p.min_stock ? 'text-red-600' : 'text-gray-500'}`}>
                    Est: {p.stock}
                  </span>
                  {p.category?.name && (
                    <span className="text-gray-500 truncate">{p.category.name}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              {p.show_in_catalog && p.is_active && (
                <>
                  <button
                    onClick={() => handleCopyProductLink(p.id)}
                    className="p-2 text-gray-500 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Copiar link"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleOpenProductLink(p.id)}
                    className="p-2 text-gray-500 hover:text-green-600 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Abrir"
                  >
                    <OpenInNewIcon className="w-5 h-5" />
                  </button>
                </>
              )}
              <div className="flex-1" />
              <button
                onClick={() => handleOpenModal(p)}
                className="p-2 text-gray-500 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Editar"
              >
                <EditIcon className="w-5 h-5" />
              </button>
              {canManageProducts && (
                <button
                  onClick={() => handleOpenDeleteModal(p)}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Excluir"
                >
                  <DeleteIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      />

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do produto"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="Código SKU"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                EAN (Código de Barras)
              </label>
              <div className="flex gap-2">
                <Input
                  value={formData.ean}
                  onChange={(e) => setFormData({ ...formData, ean: e.target.value })}
                  placeholder="Ex: 7891234567890"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center gap-1"
                  title="Escanear código de barras"
                >
                  <QrCodeScannerIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <Input
            label="Descricao"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descricao do produto"
          />

          <MultiImageUpload
            label="Imagens do Produto"
            value={productImages}
            onChange={handleImagesChange}
            loading={uploadingImages}
            helperText="Adicione ate 4 imagens. A imagem principal sera exibida como thumbnail."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Preço *"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Preço de Custo"
              type="number"
              step="0.01"
              value={formData.cost_price}
              onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              placeholder="0.00"
            />
            <Select
              label="Categoria"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Selecione..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Estoque"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            />
            <Input
              label="Estoque Mínimo"
              type="number"
              value={formData.min_stock}
              onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Ativo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.show_in_catalog}
                onChange={(e) => setFormData({ ...formData, show_in_catalog: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Exibir no catálogo</span>
            </label>
          </div>

          <ModalFooter>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingProduct ? 'Salvar' : 'Criar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Excluir Produto"
        message={`Deseja excluir o produto "${deleteModal.product?.name}"?`}
        confirmText="Excluir"
        variant="danger"
        loading={deleting}
      />

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportPreview([]);
        }}
        title="Importar Produtos"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Importe produtos em massa usando uma planilha Excel.
              O SKU será gerado automaticamente para cada produto.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={handleDownloadTemplate}
            >
              <FileDownloadIcon className="w-4 h-4" />
              Baixar Modelo Excel
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selecionar Arquivo
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFileChange}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                dark:file:bg-primary-900/20 dark:file:text-primary-400
                dark:hover:file:bg-primary-900/30
                cursor-pointer"
            />
          </div>

          {importPreview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview ({importPreview.length} produtos)
              </p>
              <div className="max-h-48 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">Preço</th>
                      <th className="px-3 py-2 text-left">Categoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {importPreview.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{row['Nome *'] || row['Nome']}</td>
                        <td className="px-3 py-2">
                          R$ {parseFloat(String(row['Preço *'] || row['Preço'] || row['Preco *'] || row['Preco'] || 0)).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">{row['Categoria'] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.length > 10 && (
                  <p className="text-xs text-gray-500 p-2 text-center">
                    ... e mais {importPreview.length - 10} produtos
                  </p>
                )}
              </div>
            </div>
          )}

          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportProducts}
              loading={importing}
              disabled={importPreview.length === 0}
            >
              <FileUploadIcon className="w-4 h-4" />
              Importar {importPreview.length > 0 ? `(${importPreview.length})` : ''}
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(code) => {
          setFormData({ ...formData, ean: code });
          toast.success(`Código escaneado: ${code}`);
        }}
        title="Escanear EAN do Produto"
      />
    </PageContainer>
  );
}

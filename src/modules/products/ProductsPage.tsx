import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Badge, Modal, ModalFooter, Select, Card, ImageUpload, ConfirmModal } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { uploadProductImage, deleteProductImage, StorageError } from '../../services/storage';
import { Product, Category, TableColumn } from '../../types';
import { exportToExcel, exportToPDF } from '../../services/export';

export function ProductsPage() {
  const { currentCompany, canManageProducts } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
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

    setLoading(false);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        price: String(product.price),
        cost_price: product.cost_price ? String(product.cost_price) : '',
        stock: String(product.stock),
        min_stock: String(product.min_stock),
        category_id: product.category_id || '',
        is_active: product.is_active,
        show_in_catalog: product.show_in_catalog,
      });
      setCurrentImageUrl(product.image_url || null);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        sku: '',
        price: '',
        cost_price: '',
        stock: '0',
        min_stock: '0',
        category_id: '',
        is_active: true,
        show_in_catalog: true,
      });
      setCurrentImageUrl(null);
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error('Nome e preco sao obrigatorios');
      return;
    }

    setSubmitting(true);

    try {
      let imageUrl = currentImageUrl;

      // Upload da nova imagem se houver
      if (imageFile) {
        setUploadingImage(true);
        try {
          // Se ja tinha imagem, remover a antiga
          if (editingProduct?.image_url) {
            await deleteProductImage(editingProduct.image_url).catch(() => {
              // Ignora erro ao deletar imagem antiga
            });
          }
          const result = await uploadProductImage(imageFile, currentCompany!.id);
          imageUrl = result.url;
        } catch (err) {
          if (err instanceof StorageError) {
            toast.error(err.message);
          } else {
            toast.error('Erro ao enviar imagem');
          }
          setUploadingImage(false);
          setSubmitting(false);
          return;
        }
        setUploadingImage(false);
      }

      const productData = {
        company_id: currentCompany!.id,
        name: formData.name,
        description: formData.description || null,
        sku: formData.sku || null,
        price: parseFloat(formData.price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        show_in_catalog: formData.show_in_catalog,
        image_url: imageUrl,
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
      // Remover imagem do storage se existir
      if (deleteModal.product.image_url) {
        await deleteProductImage(deleteModal.product.image_url).catch(() => {
          // Ignora erro ao deletar imagem
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

  const handleRemoveImage = () => {
    setCurrentImageUrl(null);
    setImageFile(null);
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    const data = filteredProducts.map((p) => ({
      Nome: p.name,
      SKU: p.sku || '-',
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

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: TableColumn<Product>[] = [
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
          <button
            onClick={() => handleOpenModal(p)}
            className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          {canManageProducts && (
            <button
              onClick={() => handleOpenDeleteModal(p)}
              className="p-1 text-gray-500 hover:text-red-600 transition-colors"
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => handleExport('excel')}>
            <FileDownloadIcon className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="secondary" onClick={() => handleExport('pdf')}>
            <FileDownloadIcon className="w-4 h-4" />
            PDF
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <AddIcon className="w-4 h-4" />
            Novo Produto
          </Button>
        </div>
      }
    >
      {/* Search */}
      <Card className="p-4 mb-4">
        <Input
          placeholder="Buscar por nome ou SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<SearchIcon className="w-5 h-5" />}
        />
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredProducts}
        keyExtractor={(p) => p.id}
        loading={loading}
        emptyMessage="Nenhum produto encontrado"
      />

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do produto"
            />
            <Input
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="Código SKU"
            />
          </div>

          <Input
            label="Descricao"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descricao do produto"
          />

          <ImageUpload
            label="Imagem do Produto"
            value={currentImageUrl}
            onChange={(file) => setImageFile(file)}
            onRemove={handleRemoveImage}
            loading={uploadingImage}
            helperText="A imagem sera exibida no catalogo"
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
    </PageContainer>
  );
}

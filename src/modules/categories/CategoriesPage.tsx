import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Modal, ModalFooter, Card, ConfirmModal } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { Category, TableColumn } from '../../types';

export function CategoriesPage() {
  const { currentCompany, canManageProducts } = useTenant();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  });
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (currentCompany) {
      fetchCategories();
    }
  }, [currentCompany]);

  const fetchCategories = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('name');

    if (error) {
      toast.error('Erro ao carregar categorias');
    } else {
      setCategories(data || []);
    }

    setLoading(false);
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome e obrigatorio');
      return;
    }

    setSubmitting(true);

    try {
      const categoryData = {
        company_id: currentCompany!.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Categoria atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(categoryData);

        if (error) throw error;
        toast.success('Categoria criada com sucesso!');
      }

      setShowModal(false);
      fetchCategories();
    } catch {
      toast.error('Erro ao salvar categoria');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (category: Category) => {
    setDeleteModal({ open: true, category });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal({ open: false, category: null });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.category) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteModal.category.id);

      if (error) throw error;
      toast.success('Categoria excluida com sucesso!');
      handleCloseDeleteModal();
      fetchCategories();
    } catch {
      toast.error('Erro ao excluir categoria');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: TableColumn<Category>[] = [
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2">
          <CategoryIcon className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{c.name}</span>
        </div>
      )
    },
    {
      key: 'description',
      label: 'Descricao',
      render: (c) => c.description || '-'
    },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (c) => new Date(c.created_at).toLocaleDateString('pt-BR'),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (c) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenModal(c)}
            className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          {canManageProducts && (
            <button
              onClick={() => handleOpenDeleteModal(c)}
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
      <PageContainer title="Categorias">
        <EmptyState
          title="Selecione uma empresa"
          description="Selecione uma empresa para gerenciar as categorias"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Categorias"
      subtitle={`${filteredCategories.length} categorias cadastradas`}
      action={
        <Button onClick={() => handleOpenModal()}>
          <AddIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Categoria</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      }
    >
      {/* Search */}
      <Card className="p-4 mb-4">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<SearchIcon className="w-5 h-5" />}
        />
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredCategories}
        keyExtractor={(c) => c.id}
        loading={loading}
        emptyMessage="Nenhuma categoria encontrada"
        mobileCardRender={(c) => (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <CategoryIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenModal(c)}
                  className="p-2 text-gray-500 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Editar"
                >
                  <EditIcon className="w-5 h-5" />
                </button>
                {canManageProducts && (
                  <button
                    onClick={() => handleOpenDeleteModal(c)}
                    className="p-2 text-gray-500 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Excluir"
                  >
                    <DeleteIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {c.description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {c.description}
              </p>
            )}
          </div>
        )}
      />

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome da categoria"
            autoFocus
          />

          <Input
            label="Descricao"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descricao opcional"
          />

          <ModalFooter>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingCategory ? 'Salvar' : 'Criar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Excluir Categoria"
        message={`Deseja excluir a categoria "${deleteModal.category?.name}"?\n\nProdutos vinculados ficarao sem categoria.`}
        confirmText="Excluir"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  );
}

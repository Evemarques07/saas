import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Modal, ModalFooter, Card } from '../../components/ui';
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

  const handleDelete = async (category: Category) => {
    if (!confirm(`Deseja excluir a categoria "${category.name}"?\n\nProdutos vinculados ficarao sem categoria.`)) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      toast.success('Categoria excluida com sucesso!');
      fetchCategories();
    } catch {
      toast.error('Erro ao excluir categoria');
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
              onClick={() => handleDelete(c)}
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
          Nova Categoria
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
    </PageContainer>
  );
}

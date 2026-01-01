import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Input, Table, Badge, Modal, ModalFooter, Card } from '../../components/ui';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { Customer, TableColumn } from '../../types';
import { exportToExcel, exportToPDF } from '../../services/export';

export function CustomersPage() {
  const { currentCompany, isAdmin } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (currentCompany) {
      fetchCustomers();
    }
  }, [currentCompany]);

  const fetchCustomers = async () => {
    if (!currentCompany) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('name');

    if (!error && data) {
      setCustomers(data);
    }

    setLoading(false);
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        document: customer.document || '',
        notes: customer.notes || '',
        is_active: customer.is_active,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        document: '',
        notes: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSubmitting(true);

    const customerData = {
      company_id: currentCompany!.id,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      document: formData.document || null,
      notes: formData.notes || null,
      is_active: formData.is_active,
    };

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(customerData);

        if (error) throw error;
        toast.success('Cliente criado com sucesso!');
      }

      setShowModal(false);
      fetchCustomers();
    } catch {
      toast.error('Erro ao salvar cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Deseja excluir o cliente "${customer.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;
      toast.success('Cliente excluído com sucesso!');
      fetchCustomers();
    } catch {
      toast.error('Erro ao excluir cliente');
    }
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    const data = filteredCustomers.map((c) => ({
      Nome: c.name,
      Email: c.email || '-',
      Telefone: c.phone || '-',
      Documento: c.document || '-',
      Status: c.is_active ? 'Ativo' : 'Inativo',
    }));

    if (format === 'excel') {
      exportToExcel(data, 'clientes');
    } else {
      exportToPDF(data, 'clientes', 'Clientes');
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const columns: TableColumn<Customer>[] = [
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'email', label: 'Email', render: (c) => c.email || '-' },
    { key: 'phone', label: 'Telefone', render: (c) => c.phone || '-' },
    { key: 'document', label: 'Documento', render: (c) => c.document || '-' },
    {
      key: 'is_active',
      label: 'Status',
      render: (c) => (
        <Badge variant={c.is_active ? 'success' : 'default'}>
          {c.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (c) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenModal(c)}
            className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          {isAdmin && (
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
      <PageContainer title="Clientes">
        <EmptyState
          title="Selecione uma empresa"
          description="Selecione uma empresa para gerenciar os clientes"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Clientes"
      subtitle={`${filteredCustomers.length} clientes cadastrados`}
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
            Novo Cliente
          </Button>
        </div>
      }
    >
      {/* Search */}
      <Card className="p-4 mb-4">
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<SearchIcon className="w-5 h-5" />}
        />
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredCustomers}
        keyExtractor={(c) => c.id}
        loading={loading}
        emptyMessage="Nenhum cliente encontrado"
      />

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do cliente"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
            <Input
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <Input
            label="CPF/CNPJ"
            value={formData.document}
            onChange={(e) => setFormData({ ...formData, document: e.target.value })}
            placeholder="000.000.000-00"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              rows={3}
              placeholder="Observações sobre o cliente..."
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Cliente ativo</span>
          </label>

          <ModalFooter>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingCustomer ? 'Salvar' : 'Criar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </PageContainer>
  );
}

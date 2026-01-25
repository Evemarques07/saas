import { useState } from 'react';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StarIcon from '@mui/icons-material/Star';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const customers = [
  {
    id: 1,
    name: 'Maria Silva',
    phone: '(11) 99999-8888',
    avatar: 'M',
    totalSpent: 1250.80,
    ordersCount: 23,
    lastOrder: '2 dias atras',
    tier: 'Ouro',
    tierColor: 'text-yellow-500',
    tierBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    favorites: ['Perfumes', 'Skincare', 'Maquiagem'],
  },
  {
    id: 2,
    name: 'Joao Pedro',
    phone: '(11) 98888-7777',
    avatar: 'J',
    totalSpent: 456.50,
    ordersCount: 8,
    lastOrder: '1 semana atras',
    tier: 'Prata',
    tierColor: 'text-gray-400',
    tierBg: 'bg-gray-100 dark:bg-gray-800',
    favorites: ['Perfumes', 'Cremes'],
  },
  {
    id: 3,
    name: 'Ana Carolina',
    phone: '(11) 97777-6666',
    avatar: 'A',
    totalSpent: 189.90,
    ordersCount: 3,
    lastOrder: '3 dias atras',
    tier: 'Bronze',
    tierColor: 'text-orange-600',
    tierBg: 'bg-orange-100 dark:bg-orange-900/30',
    favorites: ['Batons', 'Esmaltes'],
  },
  {
    id: 4,
    name: 'Carlos Roberto',
    phone: '(11) 96666-5555',
    avatar: 'C',
    totalSpent: 2340.00,
    ordersCount: 45,
    lastOrder: 'Hoje',
    tier: 'Ouro',
    tierColor: 'text-yellow-500',
    tierBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    favorites: ['Joias', 'Relogios', 'Acessorios'],
  },
];

const orderHistory = [
  { id: '#1234', date: '15/01/2025', total: 89.90, items: 3 },
  { id: '#1198', date: '08/01/2025', total: 45.50, items: 2 },
  { id: '#1156', date: '02/01/2025', total: 128.00, items: 5 },
];

type Tab = 'historico' | 'dados' | 'notas';

export function CRMPreview() {
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('historico');

  if (selectedCustomer) {
    return (
      <div className="h-full flex flex-col animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => setSelectedCustomer(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
        >
          <ArrowBackIcon className="h-5 w-5" />
          <span className="text-sm">Voltar</span>
        </button>

        {/* Customer Header */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
            {selectedCustomer.avatar}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {selectedCustomer.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <PhoneIcon className="h-4 w-4" />
              {selectedCustomer.phone}
            </div>
            <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${selectedCustomer.tierBg} ${selectedCustomer.tierColor}`}>
              <StarIcon className="h-3 w-3" />
              {selectedCustomer.tier}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
            <AttachMoneyIcon className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              R$ {selectedCustomer.totalSpent.toFixed(0)}
            </p>
            <p className="text-[10px] text-gray-500">Total gasto</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
            <ShoppingBagIcon className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {selectedCustomer.ordersCount}
            </p>
            <p className="text-[10px] text-gray-500">Pedidos</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
            <CalendarTodayIcon className="h-5 w-5 text-purple-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {selectedCustomer.lastOrder}
            </p>
            <p className="text-[10px] text-gray-500">Ultimo pedido</p>
          </div>
        </div>

        {/* Favorites */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Produtos Favoritos</h4>
          <div className="flex flex-wrap gap-2">
            {selectedCustomer.favorites.map((fav, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-medium"
              >
                {fav}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          {(['historico', 'dados', 'notas'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'historico' && (
            <div className="space-y-2">
              {orderHistory.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
                >
                  <div>
                    <span className="font-mono text-sm text-gray-900 dark:text-white">{order.id}</span>
                    <p className="text-xs text-gray-500">{order.items} itens</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      R$ {order.total.toFixed(2)}
                    </span>
                    <p className="text-xs text-gray-500">{order.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'dados' && (
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <label className="text-xs text-gray-500">Nome completo</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedCustomer.name}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <label className="text-xs text-gray-500">Telefone</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedCustomer.phone}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <label className="text-xs text-gray-500">Cliente desde</label>
                <p className="text-sm text-gray-900 dark:text-white">Outubro 2024</p>
              </div>
            </div>
          )}
          {activeTab === 'notas' && (
            <div className="space-y-2">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">Cliente VIP - dar prioridade nos pedidos</p>
                <p className="text-xs text-yellow-600 mt-1">Adicionado em 10/01/2025</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">Prefere entregas no periodo da noite</p>
                <p className="text-xs text-gray-500 mt-1">Adicionado em 05/12/2024</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">Seus Clientes</h3>
        <span className="text-sm text-gray-500">{customers.length} clientes</span>
      </div>

      {/* Customer List */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {customers.map((customer) => (
          <button
            key={customer.id}
            onClick={() => setSelectedCustomer(customer)}
            className="w-full flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {customer.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white truncate">
                  {customer.name}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${customer.tierBg} ${customer.tierColor}`}>
                  {customer.tier}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{customer.ordersCount} pedidos</span>
                <span>•</span>
                <span>R$ {customer.totalSpent.toFixed(0)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{customer.lastOrder}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="text-xs text-center text-gray-400 mt-4">
        Clique em um cliente para ver detalhes
      </p>
    </div>
  );
}

import { useState } from 'react';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UndoIcon from '@mui/icons-material/Undo';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

type Tab = 'entradas' | 'movimentacoes';
type Filter = 'todos' | 'baixo' | 'critico';
type MovementType = 'entry' | 'sale' | 'cancellation' | 'adjustment';

interface StockEntry {
  id: number;
  product: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  supplier: string;
  invoice: string;
  date: string;
}

interface StockMovement {
  id: number;
  product: string;
  type: MovementType;
  quantity: number;
  unitCost: number;
  balanceAfter: number;
  date: string;
  notes: string;
}

const TYPE_CONFIG: Record<MovementType, { label: string; color: string; bg: string; icon: typeof ArrowUpwardIcon }> = {
  entry: { label: 'Entrada', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', icon: ArrowUpwardIcon },
  sale: { label: 'Venda', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', icon: ArrowDownwardIcon },
  cancellation: { label: 'Cancelamento', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: UndoIcon },
  adjustment: { label: 'Ajuste', color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700/50', icon: TuneIcon },
};

const initialEntries: StockEntry[] = [
  { id: 1, product: 'Anel Solitario Ouro 18k', quantityReceived: 20, quantityRemaining: 20, unitCost: 189.90, supplier: 'Joias Brasil', invoice: 'NF-4521', date: '02/04' },
  { id: 2, product: 'Brinco Perola Natural', quantityReceived: 30, quantityRemaining: 18, unitCost: 67.50, supplier: 'Perolas & Cia', invoice: 'NF-4518', date: '01/04' },
  { id: 3, product: 'Corrente Prata 925', quantityReceived: 50, quantityRemaining: 7, unitCost: 42.00, supplier: 'Silver Store', invoice: 'NF-4510', date: '28/03' },
  { id: 4, product: 'Pingente Coração Zircônia', quantityReceived: 40, quantityRemaining: 0, unitCost: 28.50, supplier: 'Joias Brasil', invoice: 'NF-4505', date: '25/03' },
  { id: 5, product: 'Pulseira Riviera', quantityReceived: 15, quantityRemaining: 3, unitCost: 155.00, supplier: 'Gold Premium', invoice: 'NF-4498', date: '22/03' },
];

const initialMovements: StockMovement[] = [
  { id: 1, product: 'Anel Solitario Ouro 18k', type: 'entry', quantity: 20, unitCost: 189.90, balanceAfter: 20, date: '02/04 14:30', notes: 'NF-4521 Joias Brasil' },
  { id: 2, product: 'Brinco Perola Natural', type: 'sale', quantity: -2, unitCost: 67.50, balanceAfter: 18, date: '02/04 11:15', notes: 'Venda #1234' },
  { id: 3, product: 'Corrente Prata 925', type: 'sale', quantity: -5, unitCost: 42.00, balanceAfter: 7, date: '02/04 10:42', notes: 'Venda #1233' },
  { id: 4, product: 'Pulseira Riviera', type: 'cancellation', quantity: 1, unitCost: 155.00, balanceAfter: 3, date: '01/04 16:20', notes: 'Cancelamento Venda #1230' },
  { id: 5, product: 'Brinco Perola Natural', type: 'sale', quantity: -10, unitCost: 67.50, balanceAfter: 20, date: '01/04 14:05', notes: 'Venda #1229' },
  { id: 6, product: 'Corrente Prata 925', type: 'adjustment', quantity: -3, unitCost: 42.00, balanceAfter: 12, date: '31/03 09:30', notes: 'Ajuste inventario' },
  { id: 7, product: 'Pingente Coração Zircônia', type: 'sale', quantity: -8, unitCost: 28.50, balanceAfter: 0, date: '30/03 15:50', notes: 'Venda #1225' },
];

function FifoStatusBadge({ received, remaining }: { received: number; remaining: number }) {
  if (remaining === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700/50 text-gray-500">
        <ErrorIcon className="h-3 w-3" /> Esgotado
      </span>
    );
  }
  if (remaining < received) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
        <WarningIcon className="h-3 w-3" /> Parcial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
      <CheckCircleIcon className="h-3 w-3" /> Integral
    </span>
  );
}

export function StockPreview() {
  const [tab, setTab] = useState<Tab>('entradas');
  const [entries, setEntries] = useState(initialEntries);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ product: '', quantity: 10, unitCost: 50.00, supplier: '' });

  const alerts = entries.filter(e => e.quantityRemaining === 0 || e.quantityRemaining <= e.quantityReceived * 0.2).length;

  const totalReceived = entries.reduce((s, e) => s + e.quantityReceived, 0);
  const totalRemaining = entries.reduce((s, e) => s + e.quantityRemaining, 0);
  const totalCost = entries.reduce((s, e) => s + e.quantityReceived * e.unitCost, 0);

  const handleAddEntry = () => {
    if (!newEntry.product) return;
    const entry: StockEntry = {
      id: entries.length + 1,
      product: newEntry.product,
      quantityReceived: newEntry.quantity,
      quantityRemaining: newEntry.quantity,
      unitCost: newEntry.unitCost,
      supplier: newEntry.supplier || 'Fornecedor',
      invoice: `NF-${4522 + entries.length}`,
      date: '04/04',
    };
    setEntries([entry, ...entries]);
    setShowAddModal(false);
    setNewEntry({ product: '', quantity: 10, unitCost: 50.00, supplier: '' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Alerts Banner */}
      {alerts > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-3 mb-4 text-white">
          <div className="flex items-center gap-2">
            <WarningIcon className="h-5 w-5" />
            <span className="font-medium text-sm">
              {alerts} {alerts === 1 ? 'lote FIFO esgotado ou quase' : 'lotes FIFO esgotados ou quase'}
            </span>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('entradas')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'entradas'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          Entradas FIFO
        </button>
        <button
          onClick={() => setTab('movimentacoes')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'movimentacoes'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          Movimentações
        </button>
      </div>

      {tab === 'entradas' ? (
        <>
          {/* Add Entry Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full mb-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2 text-sm font-medium"
          >
            <AddIcon className="h-4 w-4" />
            Nova Entrada de Estoque
          </button>

          {/* FIFO Entries List */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {entries.map((entry) => {
              const percentage = entry.quantityReceived > 0
                ? (entry.quantityRemaining / entry.quantityReceived) * 100
                : 0;
              return (
                <div
                  key={entry.id}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900 dark:text-white text-sm block truncate">
                        {entry.product}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {entry.supplier} · {entry.invoice} · {entry.date}
                      </span>
                    </div>
                    <FifoStatusBadge received={entry.quantityReceived} remaining={entry.quantityRemaining} />
                  </div>

                  {/* FIFO Progress Bar */}
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          entry.quantityRemaining === 0
                            ? 'bg-gray-400'
                            : entry.quantityRemaining < entry.quantityReceived
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Quantities Row */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex gap-3">
                      <span className="text-gray-500">
                        Recebido: <span className="font-semibold text-gray-700 dark:text-gray-300">{entry.quantityReceived}</span>
                      </span>
                      <span className="text-gray-500">
                        Restante: <span className={`font-semibold ${
                          entry.quantityRemaining === 0
                            ? 'text-gray-400'
                            : entry.quantityRemaining < entry.quantityReceived
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                        }`}>{entry.quantityRemaining}</span>
                      </span>
                    </div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      R$ {entry.unitCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals Footer */}
          <div className="mt-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-gray-500 block">Recebido</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{totalReceived} un</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Restante</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{totalRemaining} un</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Custo Total</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Movements Tab */
        <div className="flex-1 space-y-2 overflow-y-auto">
          {initialMovements.map((mov) => {
            const config = TYPE_CONFIG[mov.type];
            const Icon = config.icon;
            return (
              <div
                key={mov.id}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900 dark:text-white text-sm block truncate">
                      {mov.product}
                    </span>
                    <span className="text-[10px] text-gray-400">{mov.date}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex gap-3">
                    <span className={`font-semibold ${
                      mov.quantity > 0 ? 'text-green-600 dark:text-green-400' : mov.quantity < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                    }`}>
                      {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity} un
                    </span>
                    <span className="text-gray-500">
                      Custo: R$ {mov.unitCost.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    Saldo: <span className="font-semibold text-gray-700 dark:text-gray-300">{mov.balanceAfter}</span>
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 truncate">{mov.notes}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 w-[90%] max-w-sm animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900 dark:text-white">Nova Entrada</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Produto</label>
                <input
                  type="text"
                  value={newEntry.product}
                  onChange={(e) => setNewEntry({ ...newEntry, product: e.target.value })}
                  placeholder="Nome do produto"
                  className="w-full h-10 px-3 bg-gray-100 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Quantidade</label>
                  <input
                    type="number"
                    value={newEntry.quantity}
                    onChange={(e) => setNewEntry({ ...newEntry, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full h-10 px-3 bg-gray-100 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Custo Unit. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEntry.unitCost}
                    onChange={(e) => setNewEntry({ ...newEntry, unitCost: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full h-10 px-3 bg-gray-100 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Fornecedor</label>
                <input
                  type="text"
                  value={newEntry.supplier}
                  onChange={(e) => setNewEntry({ ...newEntry, supplier: e.target.value })}
                  placeholder="Nome do fornecedor"
                  className="w-full h-10 px-3 bg-gray-100 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleAddEntry}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Registrar Entrada
            </button>
          </div>
        </div>
      )}

      {/* Hint */}
      <p className="text-xs text-center text-gray-400 mt-3">
        {tab === 'entradas' ? 'Controle FIFO: primeiro que entra, primeiro que sai' : 'Histórico completo de entradas e saídas'}
      </p>
    </div>
  );
}

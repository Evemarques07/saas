import { useState } from 'react';
import StarIcon from '@mui/icons-material/Star';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const customerData = {
  name: 'Maria Silva',
  tier: 'Prata',
  points: 320,
  nextTier: 'Ouro',
  pointsToNextTier: 180,
  multiplier: 1.5,
};

const tiers = [
  { name: 'Bronze', minPoints: 0, multiplier: 1, color: 'from-orange-400 to-orange-600' },
  { name: 'Prata', minPoints: 200, multiplier: 1.5, color: 'from-gray-400 to-gray-500' },
  { name: 'Ouro', minPoints: 500, multiplier: 2, color: 'from-yellow-400 to-yellow-600' },
  { name: 'Diamante', minPoints: 1000, multiplier: 3, color: 'from-blue-400 to-purple-600' },
];

const rewards = [
  { id: 1, points: 100, value: 'R$ 5', description: 'de desconto', available: true },
  { id: 2, points: 250, value: 'R$ 15', description: 'de desconto', available: true },
  { id: 3, points: 500, value: 'Produto', description: 'gratis ate R$ 30', available: false },
  { id: 4, points: 1000, value: 'Frete', description: 'gratis por 1 mes', available: false },
];

const history = [
  { id: 1, action: 'Compra #1234', points: 45, date: 'Hoje' },
  { id: 2, action: 'Bonus de aniversario', points: 50, date: '15/01' },
  { id: 3, action: 'Compra #1198', points: 23, date: '08/01' },
];

export function LoyaltyPreview() {
  const [points, setPoints] = useState(customerData.points);
  const [redeemedReward, setRedeemedReward] = useState<number | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const currentTierIndex = tiers.findIndex(t => t.name === customerData.tier);
  const nextTier = tiers[currentTierIndex + 1];
  const progress = nextTier
    ? ((points - tiers[currentTierIndex].minPoints) / (nextTier.minPoints - tiers[currentTierIndex].minPoints)) * 100
    : 100;

  const handleRedeem = (reward: typeof rewards[0]) => {
    if (points >= reward.points && reward.available) {
      setPoints(points - reward.points);
      setRedeemedReward(reward.id);
      setTimeout(() => setRedeemedReward(null), 2000);
    }
  };

  const handleAddPoints = () => {
    setShowAnimation(true);
    setPoints(prev => prev + 25);
    setTimeout(() => setShowAnimation(false), 1000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Customer Card */}
      <div className={`relative bg-gradient-to-r ${tiers[currentTierIndex].color} rounded-2xl p-5 text-white mb-4 overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/70 text-sm">Cliente {customerData.tier}</p>
              <h3 className="text-xl font-bold">{customerData.name}</h3>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <StarIcon className="h-6 w-6" />
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/70 text-sm">Pontos disponiveis</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{points}</span>
                {showAnimation && (
                  <span className="text-green-300 font-bold animate-bounce">+25</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-sm">Multiplicador</p>
              <span className="text-xl font-bold">{customerData.multiplier}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress to Next Tier */}
      {nextTier && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Proximo nivel: <span className="font-semibold text-gray-900 dark:text-white">{nextTier.name}</span>
            </span>
            <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              {nextTier.minPoints - points} pts
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${nextTier.color} transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Simulate Purchase Button */}
      <button
        onClick={handleAddPoints}
        className="flex items-center justify-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 py-2 rounded-xl font-medium text-sm mb-4 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
      >
        <TrendingUpIcon className="h-4 w-4" />
        Simular compra (+25 pts)
      </button>

      {/* Rewards */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <CardGiftcardIcon className="h-5 w-5 text-indigo-500" />
          Recompensas
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {rewards.map((reward) => {
            const canRedeem = points >= reward.points && reward.available;
            const isRedeemed = redeemedReward === reward.id;

            return (
              <button
                key={reward.id}
                onClick={() => handleRedeem(reward)}
                disabled={!canRedeem || isRedeemed}
                className={`relative p-3 rounded-xl border text-left transition-all ${
                  isRedeemed
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                    : canRedeem
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                {isRedeemed ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium text-sm">Resgatado!</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {reward.value}
                      </span>
                      {!reward.available && (
                        <LockIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{reward.description}</p>
                    <div className={`mt-2 text-xs font-medium ${
                      canRedeem ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                    }`}>
                      {reward.points} pontos
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-hidden">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Historico de Pontos
        </h4>
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2"
            >
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.action}</p>
                <p className="text-xs text-gray-400">{item.date}</p>
              </div>
              <span className="text-sm font-semibold text-green-600">
                +{item.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

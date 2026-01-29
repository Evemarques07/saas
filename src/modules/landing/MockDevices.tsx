import { useState, useEffect } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

// Dashboard para Desktop
function DesktopDashboard() {
  const [salesValue, setSalesValue] = useState(0);
  const targetSales = 127450;

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = targetSales / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetSales) {
        setSalesValue(targetSales);
        clearInterval(timer);
      } else {
        setSalesValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <div className="w-full h-full bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="flex h-full">
        <div className="w-10 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-2 gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-2">
            <span className="text-[6px] font-bold">MV</span>
          </div>
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <TrendingUpIcon style={{ fontSize: 12 }} className="text-indigo-400" />
          </div>
          <div className="w-6 h-6 rounded-lg hover:bg-gray-800 flex items-center justify-center">
            <ShoppingBagIcon style={{ fontSize: 12 }} className="text-gray-500" />
          </div>
          <div className="w-6 h-6 rounded-lg hover:bg-gray-800 flex items-center justify-center">
            <InventoryIcon style={{ fontSize: 12 }} className="text-gray-500" />
          </div>
          <div className="w-6 h-6 rounded-lg hover:bg-gray-800 flex items-center justify-center">
            <PersonIcon style={{ fontSize: 12 }} className="text-gray-500" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-2 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[8px] text-gray-400">Bem-vindo de volta</p>
              <p className="text-[10px] font-bold">Bella Cosmeticos</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <NotificationsIcon style={{ fontSize: 14 }} className="text-gray-400" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-lg p-1.5 border border-green-500/20">
              <p className="text-[6px] text-gray-400">Faturamento</p>
              <p className="text-[9px] font-bold text-green-400">{formatCurrency(salesValue)}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <TrendingUpIcon style={{ fontSize: 8 }} className="text-green-400" />
                <span className="text-[6px] text-green-400">+18%</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-lg p-1.5 border border-blue-500/20">
              <p className="text-[6px] text-gray-400">Pedidos</p>
              <p className="text-[9px] font-bold text-blue-400">47</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <TrendingUpIcon style={{ fontSize: 8 }} className="text-blue-400" />
                <span className="text-[6px] text-blue-400">+12%</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 rounded-lg p-1.5 border border-purple-500/20">
              <p className="text-[6px] text-gray-400">Clientes</p>
              <p className="text-[9px] font-bold text-purple-400">234</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <TrendingUpIcon style={{ fontSize: 8 }} className="text-purple-400" />
                <span className="text-[6px] text-purple-400">+8%</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gray-900/50 rounded-lg p-1.5 border border-gray-800 mb-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[7px] text-gray-400">Vendas da Semana</p>
              <p className="text-[6px] text-green-400">+23% vs semana anterior</p>
            </div>
            <div className="flex items-end gap-1 h-12">
              {[35, 55, 40, 70, 50, 85, 65].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t transition-all duration-700"
                    style={{
                      height: `${height}%`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                  <span className="text-[5px] text-gray-500">
                    {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-gray-900/50 rounded-lg p-1.5 border border-gray-800">
            <p className="text-[7px] text-gray-400 mb-1">Pedidos Recentes</p>
            <div className="space-y-1">
              {[
                { name: 'Maria S.', product: 'Kit Skincare', value: 'R$ 234,90', status: 'new' },
                { name: 'João P.', product: 'Perfume Floral', value: 'R$ 189,00', status: 'confirmed' },
                { name: 'Ana L.', product: 'Paleta Sombras', value: 'R$ 129,90', status: 'new' },
              ].map((order, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded px-1.5 py-1">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'new' ? 'bg-green-400 animate-pulse' : 'bg-blue-400'}`} />
                    <div>
                      <p className="text-[7px] font-medium">{order.name}</p>
                      <p className="text-[5px] text-gray-500">{order.product}</p>
                    </div>
                  </div>
                  <span className="text-[7px] font-bold text-green-400">{order.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Feed de atividades para Mobile
function MobileActivityFeed() {
  const activities = [
    { type: 'sale', title: 'Nova Venda', subtitle: 'Maria Silva', value: 'R$ 234,90', icon: '💰', gradient: 'from-green-500 to-emerald-600' },
    { type: 'order', title: 'Novo Pedido', subtitle: 'Pedido #1234', value: 'R$ 189,00', icon: '🛍️', gradient: 'from-blue-500 to-cyan-600' },
    { type: 'customer', title: 'Cliente VIP', subtitle: 'Ana Carolina', value: '+500 pts', icon: '⭐', gradient: 'from-amber-500 to-yellow-600' },
    { type: 'stock', title: 'Estoque Baixo', subtitle: 'Serum Vitamina C', value: '5 un', icon: '📦', gradient: 'from-orange-500 to-red-500' },
    { type: 'sale', title: 'Nova Venda', subtitle: 'Carlos Santos', value: 'R$ 456,50', icon: '💰', gradient: 'from-green-500 to-emerald-600' },
    { type: 'coupon', title: 'Cupom Usado', subtitle: 'BEMVINDO10', value: '-10%', icon: '🎟️', gradient: 'from-purple-500 to-pink-600' },
    { type: 'sale', title: 'Nova Venda', subtitle: 'Julia Mendes', value: 'R$ 178,00', icon: '💰', gradient: 'from-green-500 to-emerald-600' },
    { type: 'order', title: 'Pedido Enviado', subtitle: 'Pedido #1230', value: 'Rastreio', icon: '🚚', gradient: 'from-indigo-500 to-purple-600' },
  ];

  return (
    <div className="w-full h-full bg-gray-950 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-[8px] font-bold">MV</span>
            </div>
            <div>
              <p className="text-[9px] font-semibold">Mercado Virtual</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[7px] text-white/70">Online</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <NotificationsIcon style={{ fontSize: 16 }} className="text-white/80" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full text-[6px] flex items-center justify-center">3</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 p-2 bg-gray-900/50">
        <div className="text-center">
          <p className="text-[10px] font-bold text-green-400">R$ 8.4k</p>
          <p className="text-[6px] text-gray-500">Hoje</p>
        </div>
        <div className="text-center border-x border-gray-800">
          <p className="text-[10px] font-bold text-blue-400">47</p>
          <p className="text-[6px] text-gray-500">Pedidos</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-purple-400">12</p>
          <p className="text-[6px] text-gray-500">Novos</p>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="flex-1 relative overflow-hidden">
        <div className="activity-feed absolute inset-0 px-2 py-1">
          {[...activities, ...activities].map((activity, index) => (
            <div
              key={index}
              className={`mb-2 bg-gradient-to-r ${activity.gradient} rounded-xl p-2 shadow-lg`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">{activity.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-semibold text-white">{activity.title}</p>
                  <p className="text-[7px] text-white/70 truncate">{activity.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-white">{activity.value}</p>
                  <p className="text-[6px] text-white/60">agora</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Fade overlays */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none z-10" />
      </div>

      {/* Bottom Nav */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex justify-around">
        <div className="flex flex-col items-center">
          <TrendingUpIcon style={{ fontSize: 14 }} className="text-indigo-400" />
          <span className="text-[6px] text-indigo-400">Home</span>
        </div>
        <div className="flex flex-col items-center">
          <ShoppingBagIcon style={{ fontSize: 14 }} className="text-gray-500" />
          <span className="text-[6px] text-gray-500">Pedidos</span>
        </div>
        <div className="flex flex-col items-center">
          <LocalOfferIcon style={{ fontSize: 14 }} className="text-gray-500" />
          <span className="text-[6px] text-gray-500">Cupons</span>
        </div>
        <div className="flex flex-col items-center">
          <PersonIcon style={{ fontSize: 14 }} className="text-gray-500" />
          <span className="text-[6px] text-gray-500">Perfil</span>
        </div>
      </div>

      <style>{`
        @keyframes scrollActivity {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .activity-feed {
          animation: scrollActivity 20s linear infinite;
        }
        .activity-feed:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

// Catálogo para Tablet
function TabletCatalog() {
  const [activeCategory, setActiveCategory] = useState(0);
  const categories = ['Todos', 'Perfumes', 'Skincare', 'Maquiagem'];

  const products = [
    { name: 'Perfume Floral', price: 'R$ 189,90', badge: 'Mais Vendido', gradient: 'from-pink-500 to-rose-500' },
    { name: 'Serum Vitamina C', price: 'R$ 79,90', badge: 'Novo', gradient: 'from-orange-500 to-amber-500' },
    { name: 'Paleta Sombras', price: 'R$ 129,90', badge: null, gradient: 'from-purple-500 to-indigo-500' },
    { name: 'Hidratante', price: 'R$ 89,90', badge: 'Promo', gradient: 'from-teal-500 to-cyan-500' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCategory((prev) => (prev + 1) % categories.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-gray-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <span className="text-[7px] font-bold text-white">MV</span>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-800">Bella Cosmeticos</p>
            <p className="text-[6px] text-green-500">Loja Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative bg-indigo-500 text-white px-2 py-1 rounded-full flex items-center gap-1">
            <ShoppingBagIcon style={{ fontSize: 12 }} />
            <span className="text-[8px] font-bold">3</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="bg-gray-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[8px] text-gray-400">Buscar produtos...</span>
        </div>
      </div>

      {/* Categories */}
      <div className="px-3 flex gap-1.5 overflow-x-auto pb-2">
        {categories.map((cat, i) => (
          <button
            key={i}
            className={`px-3 py-1 rounded-full text-[7px] font-medium whitespace-nowrap transition-all ${
              activeCategory === i
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="flex-1 px-3 pb-2 overflow-hidden">
        <div className="grid grid-cols-2 gap-2">
          {products.map((product, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 transition-all hover:shadow-md"
            >
              <div className={`relative bg-gradient-to-br ${product.gradient} rounded-lg h-16 mb-2 flex items-center justify-center`}>
                {product.badge && (
                  <span className="absolute top-1 right-1 bg-white/90 text-[5px] font-bold px-1.5 py-0.5 rounded-full text-gray-800">
                    {product.badge}
                  </span>
                )}
                <span className="text-2xl">✨</span>
              </div>
              <p className="text-[8px] font-semibold text-gray-800 truncate">{product.name}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[9px] font-bold text-indigo-600">{product.price}</p>
                <button className="w-5 h-5 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                  <span className="text-[10px]">+</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Summary */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 mx-3 mb-2 rounded-xl p-2 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[7px] text-white/70">3 itens no carrinho</p>
            <p className="text-[10px] font-bold">R$ 399,70</p>
          </div>
          <button className="bg-white/20 px-3 py-1 rounded-lg text-[8px] font-medium">
            Ver Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}

// Notificação Push
function PushNotification({ show, message, icon }: { show: boolean; message: string; icon: string }) {
  if (!show) return null;

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl shadow-black/20 px-3 py-2 flex items-center gap-2 z-50 min-w-[120px] border border-gray-100"
      style={{
        animation: 'notificationSlide 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
        <span className="text-sm">{icon}</span>
      </div>
      <div>
        <p className="text-[8px] font-bold text-gray-800">Mercado Virtual</p>
        <p className="text-[7px] text-gray-500">{message}</p>
      </div>
    </div>
  );
}

// Componente principal
export function MockDevices() {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({ message: '', icon: '' });
  const [syncPulse, setSyncPulse] = useState(false);

  useEffect(() => {
    const notifications = [
      { message: 'Novo pedido recebido!', icon: '🛒' },
      { message: '+R$ 234,90 em vendas', icon: '💰' },
      { message: 'Cliente VIP cadastrado', icon: '⭐' },
      { message: 'Cupom PROMO10 usado', icon: '🎟️' },
    ];

    const showNotif = () => {
      const notif = notifications[Math.floor(Math.random() * notifications.length)];
      setNotificationData(notif);
      setShowNotification(true);
      setSyncPulse(true);
      setTimeout(() => {
        setShowNotification(false);
        setSyncPulse(false);
      }, 3000);
    };

    const initialTimeout = setTimeout(showNotif, 2000);
    const interval = setInterval(showNotif, 6000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-end justify-center gap-4 sm:gap-6 lg:gap-8 pb-8">
      {/* Connection Lines SVG - hidden on mobile */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50 hidden sm:block" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 5 }}>
        <defs>
          <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity={syncPulse ? 1 : 0.3} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Curved connection lines */}
        <path
          d="M 25 60 Q 37 40 50 50"
          fill="none"
          stroke="url(#lineGradient1)"
          strokeWidth="0.5"
          strokeDasharray="1,1"
          className={syncPulse ? 'animate-pulse' : ''}
        />
        <path
          d="M 75 60 Q 63 40 50 50"
          fill="none"
          stroke="url(#lineGradient1)"
          strokeWidth="0.5"
          strokeDasharray="1,1"
          className={syncPulse ? 'animate-pulse' : ''}
        />
      </svg>

      {/* Mobile Device - hidden on mobile screens */}
      <div className="relative z-10 transform hover:-translate-y-4 transition-all duration-500 group hidden sm:block">
        <PushNotification show={showNotification} message={notificationData.message} icon={notificationData.icon} />

        {/* Phone Frame */}
        <div className="relative bg-gradient-to-b from-gray-800 via-gray-850 to-gray-900 rounded-[2.5rem] p-[6px] shadow-2xl shadow-black/50 border border-gray-700/50 group-hover:border-cyan-500/50 group-hover:shadow-cyan-500/20 transition-all duration-500">
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-full z-20 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-800" />
            <div className="w-1 h-1 rounded-full bg-gray-700" />
          </div>

          {/* Screen */}
          <div className="relative w-[140px] h-[280px] sm:w-[150px] sm:h-[300px] bg-black rounded-[2rem] overflow-hidden">
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-black to-transparent z-10 flex items-end justify-between px-6 pb-1">
              <span className="text-[9px] text-white font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div className="w-6 h-2.5 border border-white rounded-sm relative">
                  <div className="absolute inset-[1px] right-[2px] bg-green-400 rounded-sm" style={{ width: '80%' }} />
                  <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[2px] h-1 bg-white rounded-r" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="pt-7 h-full">
              <MobileActivityFeed />
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
          </div>
        </div>

        {/* Label */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-800 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-all duration-300">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-white text-sm">Mobile</span>
          </div>
        </div>
      </div>

      {/* Desktop Device - Center (Larger) */}
      <div className="relative z-20 transform hover:-translate-y-6 transition-all duration-500 group sm:-mt-8">
        {/* Sync Indicator - hidden on mobile */}
        <div className={`absolute -top-10 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm px-4 py-2 rounded-full border transition-all duration-500 z-30 ${
          syncPulse ? 'border-green-500/50 shadow-lg shadow-green-500/20' : 'border-gray-800'
        }`}>
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${syncPulse ? 'bg-green-400' : 'bg-gray-500'}`} />
            {syncPulse && <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping" />}
          </div>
          <span className={`text-xs font-medium ${syncPulse ? 'text-green-400' : 'text-gray-400'}`}>
            {syncPulse ? 'Sincronizando...' : 'Sincronizado'}
          </span>
        </div>

        {/* Monitor Frame */}
        <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-3 shadow-2xl shadow-black/50 border-2 border-indigo-500/30 group-hover:border-indigo-500/70 group-hover:shadow-indigo-500/30 transition-all duration-500">
          {/* Camera */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-700 rounded-full">
            <div className="absolute inset-0.5 rounded-full bg-gray-600" />
          </div>

          {/* Screen */}
          <div className="w-[280px] h-[175px] sm:w-[320px] sm:h-[200px] bg-black rounded-xl overflow-hidden">
            <DesktopDashboard />
          </div>
        </div>

        {/* Stand */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-8 bg-gradient-to-b from-gray-800 to-gray-900 rounded-b-lg shadow-inner" />
          <div className="w-32 h-3 bg-gradient-to-b from-gray-700 to-gray-800 rounded-full shadow-lg" />
        </div>

        {/* Label */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 backdrop-blur-sm px-5 py-2 rounded-full border border-indigo-500/30 group-hover:border-indigo-500/60 transition-all duration-300">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-white text-sm hidden sm:inline">Desktop</span>
            <span className="font-semibold text-white text-sm sm:hidden">Multiplataforma</span>
          </div>
        </div>
      </div>

      {/* Tablet Device - hidden on mobile screens */}
      <div className="relative z-10 transform hover:-translate-y-4 transition-all duration-500 group hidden sm:block">
        {/* Tablet Frame */}
        <div className="relative bg-gradient-to-b from-gray-800 via-gray-850 to-gray-900 rounded-[1.75rem] p-[6px] shadow-2xl shadow-black/50 border border-gray-700/50 group-hover:border-purple-500/50 group-hover:shadow-purple-500/20 transition-all duration-500">
          {/* Camera */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-700 rounded-full" />

          {/* Screen */}
          <div className="w-[160px] h-[220px] sm:w-[180px] sm:h-[250px] bg-white rounded-[1.25rem] overflow-hidden">
            <TabletCatalog />
          </div>
        </div>

        {/* Label */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-800 group-hover:border-purple-500/50 group-hover:bg-purple-500/10 transition-all duration-300">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-white text-sm">Tablet</span>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes notificationSlide {
          0% {
            transform: translateX(-50%) translateY(-20px);
            opacity: 0;
          }
          100% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

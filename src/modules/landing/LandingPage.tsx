import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { MockDashboard } from './MockDashboard';
import { MockCatalog } from './MockCatalog';
import { MockCoupons } from './MockCoupons';
import { MockPromotions } from './MockPromotions';
import { MockLoyalty } from './MockLoyalty';
import { MockDevices } from './MockDevices';
import { FeatureModal } from './components/FeatureModal';
import { CatalogPreview } from './components/feature-previews/CatalogPreview';
import { WhatsAppPreview } from './components/feature-previews/WhatsAppPreview';
import { DashboardPreview } from './components/feature-previews/DashboardPreview';
import { ScannerPreview } from './components/feature-previews/ScannerPreview';
import { CRMPreview } from './components/feature-previews/CRMPreview';
import { StockPreview } from './components/feature-previews/StockPreview';
import { LoyaltyPreview } from './components/feature-previews/LoyaltyPreview';
import { CouponsPreview } from './components/feature-previews/CouponsPreview';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import BarChartIcon from '@mui/icons-material/BarChart';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import TabletMacIcon from '@mui/icons-material/TabletMac';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SpeedIcon from '@mui/icons-material/Speed';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// Hook para animacao de scroll
// rootMargin negativo faz a animação acontecer quando o elemento está mais no centro da tela
function useInView(threshold = 0.1, rootMargin = '-20% 0px -20% 0px') {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isInView };
}

// Componente de contador animado
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, isInView } = useInView();

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeFeatureModal, setActiveFeatureModal] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      id: 'catalog',
      icon: ShoppingBagIcon,
      title: 'Catalogo Online',
      description: 'Catalogo digital profissional que seus clientes podem acessar 24h por dia, de qualquer lugar.',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      preview: CatalogPreview,
    },
    {
      id: 'whatsapp',
      icon: WhatsAppIcon,
      title: 'Pedidos via WhatsApp',
      description: 'Receba pedidos diretamente no WhatsApp com notificacoes instantaneas.',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      preview: WhatsAppPreview,
    },
    {
      id: 'dashboard',
      icon: BarChartIcon,
      title: 'Dashboard Inteligente',
      description: 'Metricas em tempo real: vendas, faturamento e comportamento de clientes.',
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-500/10',
      preview: DashboardPreview,
    },
    {
      id: 'scanner',
      icon: QrCodeScannerIcon,
      title: 'Scanner de Produtos',
      description: 'Cadastre produtos em segundos usando a camera do celular.',
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-500/10',
      preview: ScannerPreview,
    },
    {
      id: 'crm',
      icon: PeopleIcon,
      title: 'CRM de Clientes',
      description: 'Historico completo de compras e preferencias de cada cliente.',
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-500/10',
      preview: CRMPreview,
    },
    {
      id: 'stock',
      icon: InventoryIcon,
      title: 'Controle de Estoque',
      description: 'Alertas automaticos de produtos acabando e relatorios detalhados.',
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'bg-teal-500/10',
      preview: StockPreview,
    },
    {
      id: 'loyalty',
      icon: CardGiftcardIcon,
      title: 'Programa de Fidelidade',
      description: 'Sistema de pontos automatico que fideliza e aumenta recorrencia.',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10',
      preview: LoyaltyPreview,
    },
    {
      id: 'coupons',
      icon: LocalOfferIcon,
      title: 'Cupons Inteligentes',
      description: 'Crie cupons com regras personalizadas e acompanhe o desempenho.',
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-500/10',
      preview: CouponsPreview,
    }
  ];

  const comparison = {
    without: [
      'Anotar pedidos em papel ou caderno',
      'Perder vendas por falta de organizacao',
      'Nao saber quais produtos vendem mais',
      'Clientes esperando resposta no WhatsApp',
      'Estoque desorganizado e perdas',
      'Sem controle do faturamento real'
    ],
    with: [
      'Pedidos organizados automaticamente',
      'Catalogo online 24h recebendo pedidos',
      'Dashboard com metricas em tempo real',
      'Notificacoes instantaneas de pedidos',
      'Alertas de estoque baixo',
      'Relatorios completos de vendas'
    ]
  };

  const stats = [
    { value: 500, label: 'Empresas ativas', icon: RocketLaunchIcon, suffix: '+' },
    { value: 50, label: 'Mil pedidos processados', icon: ShoppingBagIcon, suffix: 'k+' },
    { value: 24, label: 'Horas disponivel', icon: AccessTimeIcon, suffix: '/7' },
    { value: 30, label: 'Aumento em vendas', icon: TrendingUpIcon, suffix: '%+' }
  ];

  const steps = [
    {
      number: '01',
      title: 'Crie sua conta',
      description: 'Cadastro gratuito em menos de 1 minuto. Sem cartao de credito.',
      icon: RocketLaunchIcon,
    },
    {
      number: '02',
      title: 'Configure sua empresa',
      description: 'Adicione logo, informacoes de contato e configure o WhatsApp.',
      icon: BarChartIcon,
    },
    {
      number: '03',
      title: 'Cadastre produtos',
      description: 'Adicione seus produtos com fotos, precos e categorias.',
      icon: InventoryIcon,
    },
    {
      number: '04',
      title: 'Compartilhe e venda',
      description: 'Divulgue seu catalogo e comece a receber pedidos.',
      icon: TrendingUpIcon,
    }
  ];

  const testimonials = [
    {
      name: 'Maria Silva',
      role: 'Dona de Confeitaria',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      content: 'O Mercado Virtual transformou meu negocio! Antes eu perdia pedidos anotados em papel, agora tudo fica organizado e recebo notificacoes no WhatsApp.',
      rating: 5,
    },
    {
      name: 'Carlos Santos',
      role: 'Dono de Petshop',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      content: 'Minhas vendas aumentaram 40% depois que comecei a usar o catalogo online. Os clientes adoram poder ver os produtos e fazer pedidos a qualquer hora.',
      rating: 5,
    },
    {
      name: 'Ana Oliveira',
      role: 'Dona de Loja de Roupas',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      content: 'O controle de estoque me salvou! Agora sei exatamente quando preciso repor produtos e nunca mais perdi venda por falta de mercadoria.',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: 'O Mercado Virtual e gratuito?',
      answer: 'Sim! Voce pode criar sua conta e usar o sistema gratuitamente. Oferecemos planos pagos com recursos adicionais para quem precisa de mais funcionalidades.'
    },
    {
      question: 'Preciso instalar algum aplicativo?',
      answer: 'Nao! O Mercado Virtual e um PWA (Progressive Web App) que funciona diretamente no navegador. Voce pode adicionar na tela inicial do celular como um app, mas nao precisa baixar nada.'
    },
    {
      question: 'Como meus clientes fazem pedidos?',
      answer: 'Seus clientes acessam seu catalogo online pelo link personalizado, escolhem os produtos e finalizam o pedido. O pedido e enviado automaticamente para seu WhatsApp.'
    },
    {
      question: 'Posso usar em mais de uma empresa?',
      answer: 'Sim! O sistema e multi-empresa. Voce pode gerenciar quantas empresas precisar com uma unica conta.'
    },
    {
      question: 'Funciona no celular?',
      answer: 'Sim! O sistema e 100% responsivo e funciona perfeitamente em celulares, tablets e computadores. Voce pode gerenciar seu negocio de qualquer lugar.'
    },
    {
      question: 'Como funciona o programa de fidelidade?',
      answer: 'Voce configura quantos pontos cada real gasto vale e quais recompensas oferece. O sistema calcula automaticamente os pontos de cada cliente a cada compra.'
    }
  ];

  // Hero aparece mais cedo pois é o primeiro elemento
  const heroSection = useInView(0.1, '-10% 0px -10% 0px');
  // Demais seções usam rootMargin maior para animar quando estiverem mais no centro da tela
  const statsSection = useInView(0.15, '-25% 0px -25% 0px');
  const comparisonSection = useInView(0.15, '-25% 0px -25% 0px');
  const featuresSection = useInView(0.1, '-20% 0px -20% 0px');
  const screenshotsSection = useInView(0.1, '-15% 0px -15% 0px');
  const responsiveSection = useInView(0.1, '-20% 0px -20% 0px');
  const stepsSection = useInView(0.1, '-20% 0px -20% 0px');
  const testimonialsSection = useInView(0.1, '-20% 0px -20% 0px');
  const faqSection = useInView(0.1, '-20% 0px -20% 0px');

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Main gradient orbs */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/40 via-purple-500/30 to-pink-500/20 rounded-full blur-[120px] animate-blob" />
        <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-gradient-to-bl from-cyan-500/30 via-blue-500/25 to-indigo-500/20 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-violet-500/25 via-fuchsia-500/20 to-pink-500/15 rounded-full blur-[90px] animate-blob" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '6s' }} />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl shadow-lg shadow-gray-900/5 border-b border-gray-200/50 dark:border-gray-800/50'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                <img src="/mv64x64b.png" alt="Mercado Virtual" className="relative h-10 w-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent hidden sm:inline">
                Mercado Virtual
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Recursos
              </a>
              <a href="#como-funciona" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Como funciona
              </a>
              <a href="#depoimentos" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Depoimentos
              </a>
              <a href="#faq" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                FAQ
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium text-sm px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-300"
              >
                Entrar
              </Link>
              <Link
                to="/registro"
                className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 flex items-center gap-2 overflow-hidden"
              >
                <span className="relative z-10">Comecar gratis</span>
                <ArrowForwardIcon className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroSection.ref} className="pt-32 lg:pt-40 pb-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 text-indigo-600 dark:text-indigo-400 px-5 py-2 rounded-full text-sm font-semibold mb-8 border border-indigo-200/50 dark:border-indigo-800/50 backdrop-blur-sm transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <AutoAwesomeIcon className="h-4 w-4 animate-pulse" />
              <span>Sistema completo de gestao de vendas</span>
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </div>

            {/* Main Heading */}
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 transition-all duration-700 delay-100 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="text-gray-900 dark:text-white">Sua Loja com catalogo online</span>
              <br />
              <span className="relative">
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  profissional
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-indigo-500/30" viewBox="0 0 200 9" fill="none">
                  <path d="M1 7C51 3 150 3 199 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="text-gray-900 dark:text-white"> em minutos</span>
            </h1>

            {/* Subheading */}
            <p className={`text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Crie seu catalogo digital, receba pedidos via WhatsApp e gerencie
              suas vendas em um <span className="text-indigo-600 dark:text-indigo-400 font-semibold">unico lugar</span>.
            </p>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-16 transition-all duration-700 delay-300 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link
                to="/registro"
                className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-500 shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 overflow-hidden"
              >
                <span className="relative z-10">Criar conta gratuita</span>
                <ArrowForwardIcon className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Link>
              <a
                href="/catalogo/newempire"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl hover:-translate-y-1"
              >
                <PlayArrowIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Ver demonstracao
              </a>
            </div>

            {/* Trust Badges */}
            <div className={`flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400 transition-all duration-700 delay-400 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span>Sem cartao de credito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span>Setup em 2 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span>Suporte via WhatsApp</span>
              </div>
            </div>
          </div>

          {/* Interactive Mock Dashboard */}
          <div className={`mt-16 sm:mt-20 relative transition-all duration-1000 delay-500 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}>
            {/* Glow effect behind dashboard */}
            <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-[2rem] sm:rounded-[3rem] blur-3xl" />

            {/* Mock Dashboard Component */}
            <div className="relative">
              <MockDashboard />
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mt-16">
            <a href="#stats" className="animate-bounce-slow">
              <KeyboardArrowDownIcon className="h-8 w-8 text-gray-400 dark:text-gray-600" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" ref={statsSection.ref} className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`group relative bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 transition-all duration-700 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 hover:border-indigo-200 dark:hover:border-indigo-800 ${
                  statsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                    <stat.icon className="text-indigo-600 dark:text-indigo-400 h-7 w-7" />
                  </div>
                  <div className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                    {statsSection.isInView ? (
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    ) : '0'}
                  </div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section ref={comparisonSection.ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-950 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[150px] animate-blob" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] animate-blob" style={{ animationDelay: '3s' }} />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className={`text-center mb-16 transition-all duration-700 ${comparisonSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
              Seu negocio perde vendas por{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                desorganizacao
              </span>?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Veja como o Mercado Virtual elimina esses problemas de vez
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Without */}
            <div className={`bg-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-800 transition-all duration-700 delay-100 ${comparisonSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                  <CancelIcon className="text-red-400 h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Sem o Mercado Virtual</h3>
                  <p className="text-gray-500">Gestao tradicional</p>
                </div>
              </div>
              <div className="space-y-4">
                {comparison.without.map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-4 bg-gray-800/50 rounded-2xl px-5 py-4 border border-gray-700/50 transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/5"
                  >
                    <CancelIcon className="h-5 w-5 text-red-400 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-gray-300 group-hover:text-white transition-colors">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* With */}
            <div className={`bg-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-emerald-500/20 transition-all duration-700 delay-200 ${comparisonSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <CheckCircleIcon className="text-emerald-400 h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Com o Mercado Virtual</h3>
                  <p className="text-gray-500">Gestao inteligente</p>
                </div>
              </div>
              <div className="space-y-4">
                {comparison.with.map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-4 bg-gray-800/50 rounded-2xl px-5 py-4 border border-emerald-500/20 transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  >
                    <CheckCircleIcon className="h-5 w-5 text-emerald-400 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-gray-300 group-hover:text-white transition-colors">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresSection.ref} className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${featuresSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <SpeedIcon className="h-4 w-4" />
              Recursos poderosos
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
              Tudo que voce precisa para{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                vender mais
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Ferramentas poderosas e intuitivas para transformar seu negocio
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeatureModal(feature.id)}
                className={`group relative bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 overflow-hidden text-left cursor-pointer ${
                  featuresSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                {/* Hover gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                {/* Icon */}
                <div className={`relative w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <feature.icon className="relative text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors duration-500" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Arrow indicator */}
                <div className="mt-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
                  <span>Ver preview</span>
                  <ArrowForwardIcon className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>

          {/* Feature Modals */}
          {features.map((feature) => (
            <FeatureModal
              key={feature.id}
              isOpen={activeFeatureModal === feature.id}
              onClose={() => setActiveFeatureModal(null)}
              title={feature.title}
              icon={<feature.icon />}
              color={feature.color}
            >
              <feature.preview />
            </FeatureModal>
          ))}
        </div>
      </section>

      {/* Screenshots Section */}
      <section ref={screenshotsSection.ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative">
          <div className={`text-center mb-16 transition-all duration-700 ${screenshotsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
              Interface{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                moderna e intuitiva
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Design pensado para facilitar seu dia a dia
            </p>
          </div>

          {/* Catalog Screenshot */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div className={`transition-all duration-700 delay-100 ${screenshotsSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-transform duration-500 group-hover:scale-[1.02] overflow-hidden" style={{ height: '480px' }}>
                  <MockCatalog />
                </div>
              </div>
            </div>
            <div className={`space-y-6 transition-all duration-700 delay-200 ${screenshotsSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                Catalogo profissional para seus clientes
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Seus clientes acessam seu catalogo de qualquer dispositivo,
                escolhem os produtos e fazem pedidos diretamente pelo WhatsApp.
              </p>
              <ul className="space-y-4">
                {['Link personalizado para sua empresa', 'Fotos de alta qualidade dos produtos', 'Carrinho de compras integrado'].map((item, index) => (
                  <li key={index} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      <CheckCircleIcon className="text-green-500 h-5 w-5" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Coupons Screenshot */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div className={`order-2 lg:order-1 space-y-6 transition-all duration-700 delay-100 ${screenshotsSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                Cupons e promocoes que funcionam
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Crie cupons de desconto com regras personalizadas: porcentagem ou valor fixo,
                limite de usos, validade e muito mais.
              </p>
              <ul className="space-y-4">
                {['Desconto em porcentagem ou valor', 'Limite de utilizacoes por cupom', 'Metricas de conversao'].map((item, index) => (
                  <li key={index} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      <CheckCircleIcon className="text-green-500 h-5 w-5" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`order-1 lg:order-2 transition-all duration-700 delay-200 ${screenshotsSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-transform duration-500 group-hover:scale-[1.02] overflow-hidden" style={{ height: '480px' }}>
                  <MockCoupons />
                </div>
              </div>
            </div>
          </div>

          {/* Promotions Screenshot */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div className={`transition-all duration-700 delay-100 ${screenshotsSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-rose-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-transform duration-500 group-hover:scale-[1.02] overflow-hidden" style={{ height: '480px' }}>
                  <MockPromotions />
                </div>
              </div>
            </div>
            <div className={`space-y-6 transition-all duration-700 delay-200 ${screenshotsSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                Promocoes automaticas inteligentes
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Configure promocoes que se aplicam automaticamente: aniversario, primeira compra,
                flash sales, reativacao de clientes inativos e muito mais.
              </p>
              <ul className="space-y-4">
                {['Desconto de aniversario automatico', 'Promocoes por nivel de fidelidade', 'Flash sales com contador regressivo'].map((item, index) => (
                  <li key={index} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      <CheckCircleIcon className="text-green-500 h-5 w-5" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Loyalty Screenshot */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className={`order-2 lg:order-1 space-y-6 transition-all duration-700 delay-100 ${screenshotsSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                Programa de fidelidade que engaja
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Crie niveis de fidelidade com beneficios exclusivos. Seus clientes acumulam pontos
                a cada compra e podem trocar por descontos.
              </p>
              <ul className="space-y-4">
                {['Pontos por real gasto configuravel', 'Niveis com multiplicadores de pontos', 'Resgate de pontos no checkout'].map((item, index) => (
                  <li key={index} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      <CheckCircleIcon className="text-green-500 h-5 w-5" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`order-1 lg:order-2 transition-all duration-700 delay-200 ${screenshotsSection.isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 transition-transform duration-500 group-hover:scale-[1.02] overflow-hidden" style={{ height: '520px' }}>
                  <MockLoyalty />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Responsive Section */}
      <section ref={responsiveSection.ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-950 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-gray-950 to-gray-950" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-indigo-500/20 via-purple-500/10 to-indigo-500/20 rounded-full blur-3xl animate-spin-slow" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className={`text-center mb-16 transition-all duration-700 ${responsiveSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 text-indigo-400 px-5 py-2 rounded-full text-sm font-semibold mb-6 border border-indigo-500/20">
              <PhoneIphoneIcon className="h-4 w-4 text-cyan-400" />
              <TabletMacIcon className="h-4 w-4 text-indigo-400" />
              <LaptopMacIcon className="h-4 w-4 text-purple-400" />
              <span>Multiplataforma</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
              Seu negocio no{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">
                bolso
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Acesse de qualquer dispositivo, a qualquer hora. Suas vendas nunca param.
            </p>
          </div>

          {/* Device Showcase - Interactive Mock */}
          <div className={`transition-all duration-700 ${responsiveSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative h-[450px] sm:h-[500px]">
              <MockDevices />
            </div>
          </div>

          {/* Features Cards */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: AccessTimeIcon, title: 'Sincronizacao instantanea', description: 'Dados atualizados em tempo real', color: 'cyan' },
              { icon: PhoneIphoneIcon, title: 'Instale como app', description: 'Adicione na tela inicial', color: 'indigo' },
              { icon: RocketLaunchIcon, title: 'Funciona offline', description: 'Continue sem internet', color: 'purple' },
            ].map((item, index) => (
              <div
                key={index}
                className={`group bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800 transition-all duration-500 hover:border-${item.color}-500/50 hover:-translate-y-2 ${
                  responsiveSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${300 + index * 100}ms` }}
              >
                <div className={`w-12 h-12 bg-${item.color}-500/20 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                  <item.icon className={`text-${item.color}-400 h-6 w-6`} />
                </div>
                <h4 className="font-bold text-white mb-2">{item.title}</h4>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" ref={stepsSection.ref} className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${stepsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
              Comece em{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                4 passos
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Setup rapido e simples para comecar a vender
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`relative group transition-all duration-700 ${stepsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-20 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-indigo-200 dark:from-indigo-800 to-transparent" />
                )}

                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 h-full transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-indigo-500/10 group-hover:-translate-y-3 group-hover:border-indigo-200 dark:group-hover:border-indigo-800">
                  {/* Step number */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                      <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-500">
                        <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors duration-500">
                          {step.number}
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="depoimentos" ref={testimonialsSection.ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${testimonialsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <StarIcon className="h-4 w-4" />
              Mais de 500 avaliacoes 5 estrelas
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
              O que nossos{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                clientes dizem
              </span>
            </h2>
          </div>

          {/* Testimonials Carousel */}
          <div className={`relative max-w-4xl mx-auto transition-all duration-700 delay-200 ${testimonialsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 sm:p-12 shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-hidden">
              {/* Quote icon */}
              <FormatQuoteIcon className="absolute top-6 left-6 h-16 w-16 text-indigo-100 dark:text-indigo-900/50" />

              {/* Content */}
              <div className="relative">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="h-6 w-6 text-yellow-400" />
                  ))}
                </div>

                <p className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
                  "{testimonials[activeTestimonial].content}"
                </p>

                <div className="flex items-center gap-4">
                  <img
                    src={testimonials[activeTestimonial].image}
                    alt={testimonials[activeTestimonial].name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-100 dark:border-indigo-900"
                  />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {testimonials[activeTestimonial].name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {testimonials[activeTestimonial].role}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation dots */}
            <div className="flex justify-center gap-3 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`transition-all duration-300 ${
                    index === activeTestimonial
                      ? 'w-8 h-3 bg-indigo-600 rounded-full'
                      : 'w-3 h-3 bg-gray-300 dark:bg-gray-700 rounded-full hover:bg-indigo-300 dark:hover:bg-indigo-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" ref={faqSection.ref} className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-700 ${faqSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
              Perguntas{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                frequentes
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Tire suas duvidas sobre o Mercado Virtual
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-all duration-500 ${
                  openFaq === index
                    ? 'border-indigo-200 dark:border-indigo-800 shadow-xl shadow-indigo-500/5'
                    : 'border-gray-100 dark:border-gray-800 hover:border-indigo-100 dark:hover:border-indigo-900'
                } ${faqSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left group"
                >
                  <span className={`font-semibold pr-4 transition-colors ${
                    openFaq === index
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                  }`}>
                    {faq.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    openFaq === index
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 rotate-180'
                      : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50'
                  }`}>
                    <ExpandMoreIcon className={`transition-colors ${
                      openFaq === index ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
                    }`} />
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-500 ${
                  openFaq === index ? 'max-h-96' : 'max-h-0'
                }`}>
                  <div className="px-6 pb-6 pt-0">
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />

        {/* Animated orbs */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-500/20 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />

        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6">
            Pronto para{' '}
            <span className="underline decoration-wavy decoration-yellow-300 underline-offset-8">
              vender mais
            </span>?
          </h2>
          <p className="text-xl sm:text-2xl text-white/80 mb-10 max-w-2xl mx-auto">
            Junte-se a centenas de empreendedores que ja usam o Mercado Virtual
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/registro"
              className="group relative inline-flex items-center justify-center gap-3 bg-white text-indigo-600 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 shadow-2xl shadow-black/20 hover:shadow-black/30 hover:scale-105 hover:-translate-y-1 overflow-hidden"
            >
              <span className="relative z-10">Comecar gratuitamente</span>
              <ArrowForwardIcon className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </div>
          <p className="mt-6 text-white/60 text-sm flex items-center justify-center gap-2">
            <CheckCircleIcon className="h-5 w-5" />
            Sem cartao de credito. Sem compromisso.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-950 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <img src="/mv64x64b.png" alt="Mercado Virtual" className="h-10 w-10" />
              <span className="text-xl font-bold text-white">Mercado Virtual</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
              <a href="#features" className="hover:text-white transition-colors">Recursos</a>
              <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
              <a href="#depoimentos" className="hover:text-white transition-colors">Depoimentos</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <Link to="/login" className="hover:text-white transition-colors">Entrar</Link>
              <Link to="/registro" className="hover:text-white transition-colors">Criar conta</Link>
            </div>

            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Mercado Virtual App
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

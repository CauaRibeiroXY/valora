'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  BrainCircuit,
  FileText,
  PlusCircle,
  RefreshCw,
  Trash2,
  Edit3,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  HelpCircle,
  Upload,
  Download,
  Link2,
  Search,
  BarChart3,
  Building2,
  Wallet,
  Landmark,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Asset, AssetAnalysis, AssetType, RecommendationAction } from '@/lib/types';
import { DEFAULT_RULES_MARKDOWN } from '@/lib/defaultData';
import { PluggyConnectButton } from '@/components/PluggyConnectButton';

const COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

// Normaliza categoria de tipo
function getAssetCategory(asset: Asset): 'stock' | 'fii' | 'fixed_income' | 'bdr_etf' {
  const t = asset.ticker.toUpperCase();
  if (asset.type === 'fixed_income' || t.startsWith('CDB') || t.startsWith('TESOURO') || t.startsWith('BRSTN')) {
    return 'fixed_income';
  }
  if (asset.type === 'fii' || (t.endsWith('11') && !['SMAL11', 'DIVO11', 'BOVA11', 'IVVB11'].includes(t))) {
    return 'fii';
  }
  if (t.endsWith('34') || ['SMAL11', 'DIVO11', 'BOVA11', 'IVVB11'].includes(t)) {
    return 'bdr_etf';
  }
  return 'stock';
}

export default function InvestmentApp() {
  // Estado de navegação principal
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'ai_summary' | 'rules' | 'settings'>('dashboard');
  const [portfolio, setPortfolio] = useState<Asset[]>([]);
  const [rulesMarkdown, setRulesMarkdown] = useState<string>('');
  const [analyses, setAnalyses] = useState<Record<string, AssetAnalysis>>({});
  const [isAnalyzingAll, setIsAnalyzingAll] = useState<boolean>(false);
  const [analyzingAssetId, setAnalyzingAssetId] = useState<string | null>(null);
  const [isUpdatingQuotes, setIsUpdatingQuotes] = useState<boolean>(false);
  
  // Filtros rápidos
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'stock' | 'fii' | 'bdr_etf' | 'fixed_income'>('all');
  const [selectedAction, setSelectedAction] = useState<'all' | RecommendationAction>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'value' | 'profit' | 'roe' | 'ticker'>('value');
  
  // Chaves e Configurações
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [brapiToken, setBrapiToken] = useState<string>('');
  const [pluggyClientId, setPluggyClientId] = useState<string>('');
  const [pluggyClientSecret, setPluggyClientSecret] = useState<string>('');
  
  // Modais
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AssetAnalysis | null>(null);

  // Carregar dados salvos no localStorage
  useEffect(() => {
    const savedPortfolio = localStorage.getItem('investai_portfolio');
    const savedRules = localStorage.getItem('investai_rules');
    const savedAnalyses = localStorage.getItem('investai_analyses');
    const savedGeminiKey = localStorage.getItem('investai_gemini_key') || '';
    const savedBrapiToken = localStorage.getItem('investai_brapi_token') || '';
    const savedPluggyId = localStorage.getItem('investai_pluggy_id') || '';
    const savedPluggySecret = localStorage.getItem('investai_pluggy_secret') || '';

    if (savedPortfolio) {
      try {
        const parsed = JSON.parse(savedPortfolio);
        // Filtra estritamente ativos válidos (sem resíduo de log com preço 0 ou PM 0)
        const onlyReal = parsed.filter(
          (a: Asset) =>
            a.id &&
            (a.id.startsWith('pluggy-') || a.id.startsWith('manual-')) &&
            a.quantity > 0 &&
            a.currentPrice > 0 &&
            a.averagePrice > 0
        );
        setPortfolio(onlyReal);
        localStorage.setItem('investai_portfolio', JSON.stringify(onlyReal));
      } catch {
        setPortfolio([]);
      }
    }

    if (savedRules) {
      setRulesMarkdown(savedRules);
    } else {
      setRulesMarkdown(DEFAULT_RULES_MARKDOWN);
    }

    if (savedAnalyses) {
      try {
        setAnalyses(JSON.parse(savedAnalyses));
      } catch {}
    }

    setGeminiKey(savedGeminiKey);
    setBrapiToken(savedBrapiToken);
    setPluggyClientId(savedPluggyId);
    setPluggyClientSecret(savedPluggySecret);
  }, []);

  const updatePortfolio = (newPortfolio: Asset[]) => {
    setPortfolio(newPortfolio);
    localStorage.setItem('investai_portfolio', JSON.stringify(newPortfolio));
  };

  const updateRules = (newRules: string) => {
    setRulesMarkdown(newRules);
    localStorage.setItem('investai_rules', newRules);
  };

  const updateAnalyses = (newAnalyses: Record<string, AssetAnalysis>) => {
    setAnalyses(newAnalyses);
    localStorage.setItem('investai_analyses', JSON.stringify(newAnalyses));
  };

  // Atualização de Cotações com Yahoo Finance
  const updateQuotesForList = async (list: Asset[]) => {
    setIsUpdatingQuotes(true);
    const updated = [...list];

    for (let i = 0; i < updated.length; i++) {
      const asset = updated[i];
      if (asset.type === 'fixed_income') continue;

      try {
        const queryParams = new URLSearchParams({ ticker: asset.ticker });
        if (brapiToken) queryParams.append('token', brapiToken);

        const res = await fetch(`/api/quote?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.price === 'number') {
            updated[i] = {
              ...asset,
              name: data.name || asset.name,
              currentPrice: data.price > 0 ? data.price : asset.currentPrice,
              change24h: data.changePercent !== undefined ? data.changePercent : asset.change24h,
              pl: data.pl !== undefined ? data.pl : asset.pl,
              pvp: data.pvp !== undefined ? data.pvp : asset.pvp,
              lpa: data.lpa !== undefined ? data.lpa : asset.lpa,
              roe: data.roe !== undefined ? data.roe : asset.roe,
              profitMargins: data.profitMargins !== undefined ? data.profitMargins : asset.profitMargins,
              evEbitda: data.evEbitda !== undefined ? data.evEbitda : asset.evEbitda,
              dividendYield: data.dividendYield !== undefined ? data.dividendYield : asset.dividendYield,
            };
          }
        }
      } catch (err) {
        console.error(`Erro ao atualizar ${asset.ticker}:`, err);
      }
    }

    updatePortfolio(updated);
    setIsUpdatingQuotes(false);
  };

  const handlePluggyImportSuccess = (importedAssets: Asset[]) => {
    const valid = importedAssets.filter(a => a.quantity > 0 && a.currentPrice > 0 && a.averagePrice > 0);
    const currentTickers = new Set(portfolio.map(a => a.ticker.toUpperCase()));
    const merged = [...portfolio];

    valid.forEach(item => {
      if (currentTickers.has(item.ticker.toUpperCase())) {
        const idx = merged.findIndex(a => a.ticker.toUpperCase() === item.ticker.toUpperCase());
        if (idx !== -1) {
          merged[idx] = {
            ...merged[idx],
            quantity: item.quantity,
            averagePrice: item.averagePrice,
            currentPrice: item.currentPrice,
            name: item.name || merged[idx].name
          };
        }
      } else {
        merged.push(item);
      }
    });

    updatePortfolio(merged);
    updateQuotesForList(merged);
  };

  // Cálculos de métricas consolidadas
  const metrics = useMemo(() => {
    let totalInvested = 0;
    let currentTotal = 0;
    let buyCount = 0;
    let holdCount = 0;
    let sellCount = 0;

    let stocksTotal = 0;
    let fiisTotal = 0;
    let bdrEtfTotal = 0;
    let fixedIncomeTotal = 0;

    portfolio.forEach(asset => {
      const invested = asset.quantity * asset.averagePrice;
      const current = asset.quantity * asset.currentPrice;
      totalInvested += invested;
      currentTotal += current;

      const cat = getAssetCategory(asset);
      if (cat === 'stock') stocksTotal += current;
      else if (cat === 'fii') fiisTotal += current;
      else if (cat === 'bdr_etf') bdrEtfTotal += current;
      else if (cat === 'fixed_income') fixedIncomeTotal += current;

      const analysis = analyses[asset.id];
      if (analysis) {
        if (analysis.action === 'COMPRAR_MAIS') buyCount++;
        else if (analysis.action === 'MANTER') holdCount++;
        else if (analysis.action === 'VENDER') sellCount++;
      }
    });

    const totalProfitLoss = currentTotal - totalInvested;
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentTotal,
      totalProfitLoss,
      totalProfitLossPercent,
      buyCount,
      holdCount,
      sellCount,
      stocksTotal,
      fiisTotal,
      bdrEtfTotal,
      fixedIncomeTotal
    };
  }, [portfolio, analyses]);

  // Dados para gráficos do Recharts
  const allocationPieData = useMemo(() => {
    const list = [
      { name: 'Ações B3', value: metrics.stocksTotal, color: '#10b981' },
      { name: 'Fundos Imobiliários', value: metrics.fiisTotal, color: '#0ea5e9' },
      { name: 'BDRs & ETFs Globais', value: metrics.bdrEtfTotal, color: '#8b5cf6' },
      { name: 'Renda Fixa', value: metrics.fixedIncomeTotal, color: '#f59e0b' }
    ].filter(item => item.value > 0);

    return list.map(item => ({
      ...item,
      percent: metrics.currentTotal > 0 ? ((item.value / metrics.currentTotal) * 100).toFixed(1) : '0'
    }));
  }, [metrics]);

  const topAssetsBarData = useMemo(() => {
    return [...portfolio]
      .map(a => ({
        ticker: a.ticker,
        valor: Number((a.quantity * a.currentPrice).toFixed(2)),
        lucro: Number(((a.quantity * a.currentPrice) - (a.quantity * a.averagePrice)).toFixed(2))
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [portfolio]);

  // Lista filtrada e ordenada de ativos
  const filteredAssets = useMemo(() => {
    let list = portfolio.filter(asset => {
      // Filtro por Categoria
      if (selectedCategory !== 'all') {
        const cat = getAssetCategory(asset);
        if (cat !== selectedCategory) return false;
      }
      // Filtro por Ação da IA
      if (selectedAction !== 'all') {
        const a = analyses[asset.id];
        if (!a || a.action !== selectedAction) return false;
      }
      // Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTicker = asset.ticker.toLowerCase().includes(q);
        const matchesName = (asset.name || '').toLowerCase().includes(q);
        if (!matchesTicker && !matchesName) return false;
      }
      return true;
    });

    // Ordenação
    list.sort((a, b) => {
      const totalA = a.quantity * a.currentPrice;
      const totalB = b.quantity * b.currentPrice;
      const profitA = totalA - (a.quantity * a.averagePrice);
      const profitB = totalB - (b.quantity * b.averagePrice);

      if (sortBy === 'value') return totalB - totalA;
      if (sortBy === 'profit') return profitB - profitA;
      if (sortBy === 'roe') return (b.roe || 0) - (a.roe || 0);
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
      return 0;
    });

    return list;
  }, [portfolio, selectedCategory, selectedAction, searchQuery, sortBy, analyses]);

  // Executar Análise com IA
  const handleAnalyzeAsset = async (asset: Asset) => {
    setAnalyzingAssetId(asset.id);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset,
          rulesMarkdown,
          geminiApiKey: geminiKey || undefined,
          brapiToken: brapiToken || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        const result: AssetAnalysis = {
          assetId: data.assetId,
          ticker: data.ticker,
          action: data.action,
          confidenceScore: data.confidenceScore,
          summary: data.summary,
          thesisAlignment: data.thesisAlignment,
          reasons: data.reasons,
          suggestedActionDetail: data.suggestedActionDetail,
          analyzedAt: data.analyzedAt
        };
        const updatedAnalyses = { ...analyses, [asset.id]: result };
        updateAnalyses(updatedAnalyses);

        if (data.enrichedAsset) {
          const updatedPortfolio = portfolio.map(a => a.id === asset.id ? data.enrichedAsset : a);
          updatePortfolio(updatedPortfolio);
        }
      }
    } catch (err) {
      console.error('Falha ao analisar:', err);
    } finally {
      setAnalyzingAssetId(null);
    }
  };

  const handleAnalyzeAll = async () => {
    if (portfolio.length === 0) return;
    setIsAnalyzingAll(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: portfolio,
          rulesMarkdown,
          geminiApiKey: geminiKey || undefined,
          brapiToken: brapiToken || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results)) {
          const newMap: Record<string, AssetAnalysis> = { ...analyses };
          data.results.forEach((item: AssetAnalysis) => {
            newMap[item.assetId] = item;
          });
          updateAnalyses(newMap);
        }
        if (Array.isArray(data.enrichedAssets) && data.enrichedAssets.length > 0) {
          updatePortfolio(data.enrichedAssets);
        }
      }
    } catch (err) {
      console.error('Falha na análise:', err);
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm('Deseja remover este ativo da carteira?')) {
      const nextPortfolio = portfolio.filter(a => a.id !== id);
      updatePortfolio(nextPortfolio);
      const nextAnalyses = { ...analyses };
      delete nextAnalyses[id];
      updateAnalyses(nextAnalyses);
    }
  };

  const handleExportData = () => {
    const data = { portfolio, rulesMarkdown, analyses, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carteira-valora-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['Ticker', 'Nome', 'Categoria', 'Qtd', 'PM', 'Preco', 'Total', 'PL', 'PVP', 'ROE', 'DY', 'Decisao_IA'];
    const rows = portfolio.map(a => {
      const cat = getAssetCategory(a);
      const dec = analyses[a.id]?.action || 'PENDENTE';
      return [
        a.ticker,
        `"${(a.name || '').replace(/"/g, '""')}"`,
        cat,
        a.quantity,
        a.averagePrice,
        a.currentPrice,
        (a.quantity * a.currentPrice).toFixed(2),
        a.pl ?? '',
        a.pvp ?? '',
        a.roe ?? '',
        a.dividendYield ?? '',
        dec
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `carteira-valora-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar - Clean, Minimalist, Single-Row */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          
          {/* Logo & Clean Brand Name: VALORA */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-sm tracking-tight shadow-sm shadow-emerald-500/10">
              V
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                VALORA
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-semibold uppercase">CAPITAL</span>
              </span>
            </div>
          </div>

          {/* Navegação Central: Segmented Clean Pills */}
          <nav className="hidden md:flex items-center bg-slate-900/90 border border-slate-800/80 rounded-xl p-1 gap-1 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Visão Geral
            </button>

            <button
              onClick={() => setActiveTab('assets')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'assets'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custódia
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800/80 text-slate-400">
                {portfolio.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai_summary')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'ai_summary'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Diagnóstico IA
              {(metrics.buyCount > 0 || metrics.sellCount > 0) && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 font-bold">
                  {metrics.buyCount + metrics.sellCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'rules'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Critérios (.md)
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'settings'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ajustes
            </button>
          </nav>

          {/* Ações da Direita: Clean & Discretas */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Atualizar Cotações */}
            <button
              onClick={() => updateQuotesForList(portfolio)}
              disabled={isUpdatingQuotes || portfolio.length === 0}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition disabled:opacity-40"
              title="Atualizar cotações e múltiplos de mercado"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isUpdatingQuotes ? 'animate-spin text-emerald-400' : 'text-slate-400'} sm:mr-1.5`} />
              <span className="hidden sm:inline">{isUpdatingQuotes ? 'Atualizando...' : 'Atualizar'}</span>
            </button>

            {/* Sincronizar Pluggy */}
            <PluggyConnectButton
              onSuccessImport={handlePluggyImportSuccess}
              pluggyClientId={pluggyClientId}
              pluggyClientSecret={pluggyClientSecret}
            />

            {/* Analisar Carteira (IA) */}
            <button
              onClick={handleAnalyzeAll}
              disabled={isAnalyzingAll || portfolio.length === 0}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/20 transition disabled:opacity-40"
            >
              <Sparkles className={`h-3.5 w-3.5 mr-1.5 ${isAnalyzingAll ? 'animate-spin' : ''}`} />
              <span>{isAnalyzingAll ? 'Analisando...' : 'Analisar'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="md:hidden flex items-center px-4 py-2 border-t border-slate-800/60 overflow-x-auto gap-1.5 bg-slate-950 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap ${
              activeTab === 'assets' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Custódia ({portfolio.length})
          </button>
          <button
            onClick={() => setActiveTab('ai_summary')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap ${
              activeTab === 'ai_summary' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Diagnóstico IA
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap ${
              activeTab === 'rules' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Critérios
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 rounded-md font-medium whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Ajustes
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* KPI CARDS (Visíveis no topo) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Patrimônio Total</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-white">
              R$ {metrics.currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 flex items-center text-[11px]">
              {metrics.totalProfitLoss >= 0 ? (
                <span className="text-emerald-400 flex items-center font-semibold">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  +R$ {metrics.totalProfitLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (+{metrics.totalProfitLossPercent.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-rose-400 flex items-center font-semibold">
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                  -R$ {Math.abs(metrics.totalProfitLoss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({metrics.totalProfitLossPercent.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Custo Aportado</span>
              <Wallet className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-200">
              R$ {metrics.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {portfolio.length} ativos em custódia
            </div>
          </div>

          <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
              <span>Comprar Mais (Oportunidades)</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-emerald-400">
              {metrics.buyCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              ROE $\ge$ 15% & Desconto Patrimonial
            </div>
          </div>

          <div className="bg-slate-900/60 border border-rose-500/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-rose-400 text-xs font-medium">
              <span>Vender / Atenção</span>
              <ShieldAlert className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-rose-400">
              {metrics.sellCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              ROE fraco ou stop acionado
            </div>
          </div>
        </section>

        {/* =========================================================================
            ABA 1: DASHBOARD COM GRÁFICOS
           ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Cards por Classe de Ativo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => { setSelectedCategory('stock'); setActiveTab('assets'); }}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <TrendingUp className="h-3.5 w-3.5" /> Ações B3
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 transition">Ver ativos &rarr;</span>
                </div>
                <div className="text-lg font-bold text-white">
                  R$ {metrics.stocksTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500">
                  {metrics.currentTotal > 0 ? ((metrics.stocksTotal / metrics.currentTotal) * 100).toFixed(1) : 0}% da carteira
                </div>
              </button>

              <button
                onClick={() => { setSelectedCategory('fii'); setActiveTab('assets'); }}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-sky-400">
                    <Building2 className="h-3.5 w-3.5" /> Fundos Imob. (FIIs)
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:text-sky-400 transition">Ver ativos &rarr;</span>
                </div>
                <div className="text-lg font-bold text-white">
                  R$ {metrics.fiisTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500">
                  {metrics.currentTotal > 0 ? ((metrics.fiisTotal / metrics.currentTotal) * 100).toFixed(1) : 0}% da carteira
                </div>
              </button>

              <button
                onClick={() => { setSelectedCategory('bdr_etf'); setActiveTab('assets'); }}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-purple-400">
                    <PieChartIcon className="h-3.5 w-3.5" /> BDRs & ETFs Globais
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:text-purple-400 transition">Ver ativos &rarr;</span>
                </div>
                <div className="text-lg font-bold text-white">
                  R$ {metrics.bdrEtfTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500">
                  {metrics.currentTotal > 0 ? ((metrics.bdrEtfTotal / metrics.currentTotal) * 100).toFixed(1) : 0}% da carteira
                </div>
              </button>

              <button
                onClick={() => { setSelectedCategory('fixed_income'); setActiveTab('assets'); }}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-amber-400">
                    <Landmark className="h-3.5 w-3.5" /> Renda Fixa
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:text-amber-400 transition">Ver ativos &rarr;</span>
                </div>
                <div className="text-lg font-bold text-white">
                  R$ {metrics.fixedIncomeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500">
                  {metrics.currentTotal > 0 ? ((metrics.fixedIncomeTotal / metrics.currentTotal) * 100).toFixed(1) : 0}% da carteira
                </div>
              </button>
            </div>

            {/* Gráficos Recharts: Alocação & Maiores Posições */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico 1: Pizza de Distribuição */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-emerald-400" /> Distribuição por Classe
                  </h3>
                  <span className="text-xs text-slate-400">Alocação Atual</span>
                </div>

                <div className="h-64 w-full flex items-center justify-center">
                  {allocationPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                        >
                          {allocationPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-500">Nenhum ativo para exibir no gráfico.</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  {allocationPieData.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300">{item.name}</span>
                      </div>
                      <span className="font-semibold text-white">{item.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico 2: Maiores Posições */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-cyan-400" /> Maiores Posições (R$)
                  </h3>
                  <span className="text-xs text-slate-400">Top 8 Ativos</span>
                </div>

                <div className="h-64 w-full">
                  {topAssetsBarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topAssetsBarData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="ticker" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                        <Tooltip
                          formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Posição']}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                        />
                        <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      Nenhum dado disponível.
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  Dica: Clique na aba <strong>&quot;Minha Carteira&quot;</strong> para visualizar os indicadores fundamentalistas (P/L, P/VP, ROE) de cada um.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 2: MINHA CARTEIRA (FILTROS RÁPIDOS + TABELA COMPLETA)
           ========================================================================= */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            {/* Barra de Filtros Segmentados */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
              {/* Categoria Tabs (Pills) */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 mr-2 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Classe:
                </span>

                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Todos ({portfolio.length})
                </button>

                <button
                  onClick={() => setSelectedCategory('stock')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCategory === 'stock'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Ações B3 ({portfolio.filter(a => getAssetCategory(a) === 'stock').length})
                </button>

                <button
                  onClick={() => setSelectedCategory('fii')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCategory === 'fii'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Fundos Imobiliários ({portfolio.filter(a => getAssetCategory(a) === 'fii').length})
                </button>

                <button
                  onClick={() => setSelectedCategory('bdr_etf')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCategory === 'bdr_etf'
                      ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  BDRs & ETFs ({portfolio.filter(a => getAssetCategory(a) === 'bdr_etf').length})
                </button>

                <button
                  onClick={() => setSelectedCategory('fixed_income')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCategory === 'fixed_income'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Renda Fixa ({portfolio.filter(a => getAssetCategory(a) === 'fixed_income').length})
                </button>
              </div>

              {/* Linha de Busca e Decisão da IA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Campo de Busca */}
                  <div className="relative w-full sm:w-64">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por código ou nome..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Filtro por Decisão IA */}
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">Todas as Decisões IA</option>
                    <option value="COMPRAR_MAIS">Comprar Mais</option>
                    <option value="MANTER">Manter</option>
                    <option value="VENDER">Vender</option>
                  </select>

                  {/* Ordenação */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="value">Ordenar: Maior Posição (R$)</option>
                    <option value="profit">Ordenar: Maior Lucro (R$)</option>
                    <option value="roe">Ordenar: Maior ROE (%)</option>
                    <option value="ticker">Ordenar: Ticker (A-Z)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleExportCSV}
                    disabled={portfolio.length === 0}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    title="Exportar para planilha Excel / CSV"
                  >
                    <Download className="h-3.5 w-3.5 inline mr-1" /> CSV
                  </button>
                  <button
                    onClick={() => { setEditingAsset(null); setIsAssetModalOpen(true); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5 inline mr-1" /> Adicionar Manual
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Ativos Profissional */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">Ativo</th>
                    <th scope="col" className="px-4 py-3.5">Qtd.</th>
                    <th scope="col" className="px-4 py-3.5">Preço Médio</th>
                    <th scope="col" className="px-4 py-3.5">Cotação Atual</th>
                    <th scope="col" className="px-4 py-3.5">Posição Total</th>
                    <th scope="col" className="px-4 py-3.5">Indicadores (Yahoo)</th>
                    <th scope="col" className="px-4 py-3.5 text-center">Veredito IA</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-slate-500 space-y-2">
                        <Layers className="h-8 w-8 mx-auto text-slate-700" />
                        <div className="text-sm font-medium text-slate-300">Nenhum ativo nesta categoria ou filtro</div>
                        <p className="text-xs text-slate-500">
                          Tente trocar o filtro acima ou importar seus ativos via Pluggy.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(asset => {
                      const totalInvested = asset.quantity * asset.averagePrice;
                      const currentTotal = asset.quantity * asset.currentPrice;
                      const profitLoss = currentTotal - totalInvested;
                      const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
                      const analysis = analyses[asset.id];
                      const isAnalyzing = analyzingAssetId === asset.id;
                      const cat = getAssetCategory(asset);

                      return (
                        <tr key={asset.id} className="hover:bg-slate-800/30 transition">
                          {/* Coluna 1: Ticker & Categoria */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white tracking-wide text-sm">{asset.ticker}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                cat === 'stock' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                cat === 'fii' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                cat === 'bdr_etf' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {cat === 'stock' ? 'AÇÃO' : cat === 'fii' ? 'FII' : cat === 'bdr_etf' ? 'BDR/ETF' : 'RENDA FIXA'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-[170px]" title={asset.name}>
                              {asset.name}
                            </div>
                          </td>

                          {/* Coluna 2: Qtd */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-200 text-xs font-mono">
                            {asset.quantity.toLocaleString('pt-BR')}
                          </td>

                          {/* Coluna 3: Preço Médio */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-200 text-xs font-mono">
                            R$ {asset.averagePrice.toFixed(2)}
                          </td>

                          {/* Coluna 4: Cotação Atual */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-medium text-slate-100 text-xs font-mono">
                              R$ {asset.currentPrice.toFixed(2)}
                            </div>
                            {asset.change24h !== undefined && (
                              <div className={`text-[11px] font-medium ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                              </div>
                            )}
                          </td>

                          {/* Coluna 5: Posição Total & Rentabilidade */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-100 text-xs font-mono">
                              R$ {currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className={`text-[11px] font-medium ${profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {profitLoss >= 0 ? '+' : ''}{profitLossPct.toFixed(1)}% (R$ {profitLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                            </div>
                          </td>

                          {/* Coluna 6: Múltiplos Fundamentalistas */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                            {cat === 'fixed_income' ? (
                              <span className="text-slate-500 text-[11px]">Taxa Contratada / Pós-fixado</span>
                            ) : (
                              <div className="space-y-1 text-[11px]">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-slate-400">P/L:</span>
                                  <span className={asset.pl && asset.pl < 12 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                                    {asset.pl !== undefined ? `${asset.pl}x` : '-'}
                                  </span>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-slate-400">P/VP:</span>
                                  <span className={asset.pvp && asset.pvp < 1.0 ? 'text-sky-400 font-semibold' : 'text-slate-300'}>
                                    {asset.pvp !== undefined ? `${asset.pvp}x` : '-'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-slate-400">ROE:</span>
                                  <span className={asset.roe && asset.roe >= 15 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                                    {asset.roe !== undefined ? `${asset.roe}%` : '-'}
                                  </span>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-slate-400">DY:</span>
                                  <span className={asset.dividendYield && asset.dividendYield >= 6 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                                    {asset.dividendYield !== undefined ? `${asset.dividendYield}%` : '-'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Coluna 7: Decisão IA */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            {analysis ? (
                              <div className="flex flex-col items-center">
                                {analysis.action === 'COMPRAR_MAIS' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    <TrendingUp className="h-3 w-3 mr-1" /> COMPRAR MAIS
                                  </span>
                                )}
                                {analysis.action === 'MANTER' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> MANTER
                                  </span>
                                )}
                                {analysis.action === 'VENDER' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                    <TrendingDown className="h-3 w-3 mr-1" /> VENDER
                                  </span>
                                )}
                                <button
                                  onClick={() => setSelectedAnalysis(analysis)}
                                  className="mt-1 text-[10px] text-slate-400 hover:text-cyan-400 underline transition"
                                >
                                  Ver parecer ({analysis.confidenceScore}%)
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAnalyzeAsset(asset)}
                                disabled={isAnalyzing}
                                className="inline-flex items-center px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              >
                                <Sparkles className={`h-3 w-3 mr-1 ${isAnalyzing ? 'animate-spin text-emerald-400' : ''}`} />
                                {isAnalyzing ? '...' : 'Avaliar'}
                              </button>
                            )}
                          </td>

                          {/* Coluna 8: Ações Rápidas */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1">
                            <button
                              onClick={() => handleAnalyzeAsset(asset)}
                              disabled={isAnalyzing}
                              title="Reanalisar ativo"
                              className="p-1 rounded text-slate-400 hover:text-emerald-400 transition"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => { setEditingAsset(asset); setIsAssetModalOpen(true); }}
                              title="Editar ativo"
                              className="p-1 rounded text-slate-400 hover:text-cyan-400 transition"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset.id)}
                              title="Remover ativo"
                              className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 3: PLANO DE AÇÃO CONSOLIDADO DA IA
           ========================================================================= */}
        {activeTab === 'ai_summary' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" /> Diagnóstico Executivo da Carteira
                </h2>
                <p className="text-xs text-slate-400">
                  Agrupamento inteligente dos seus ativos com base nos critérios de ROE, P/L, P/VP e risco do seu Guia.
                </p>
              </div>

              <button
                onClick={handleAnalyzeAll}
                disabled={isAnalyzingAll}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition"
              >
                Reanalisar Todos
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Oportunidades: COMPRAR MAIS */}
              <div className="bg-slate-900/40 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <h3 className="font-bold text-sm text-emerald-400">Comprar Mais (Aporte)</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                    {metrics.buyCount}
                  </span>
                </div>

                <div className="space-y-3">
                  {portfolio
                    .filter(a => analyses[a.id]?.action === 'COMPRAR_MAIS')
                    .map(asset => {
                      const analysis = analyses[asset.id];
                      return (
                        <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="text-white text-sm">{asset.ticker}</span>
                            <span className="text-emerald-400">R$ {asset.currentPrice.toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{analysis?.summary}</p>
                          <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded-lg">
                            <strong className="text-emerald-400">Conduta:</strong> {analysis?.suggestedActionDetail}
                          </div>
                        </div>
                      );
                    })}
                  {metrics.buyCount === 0 && (
                    <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum ativo classificado para compra no momento.</p>
                  )}
                </div>
              </div>

              {/* Posições Equilibradas: MANTER */}
              <div className="bg-slate-900/40 border border-blue-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                    <h3 className="font-bold text-sm text-blue-400">Manter Posição</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold">
                    {metrics.holdCount}
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {portfolio
                    .filter(a => analyses[a.id]?.action === 'MANTER')
                    .map(asset => {
                      const analysis = analyses[asset.id];
                      return (
                        <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="text-white text-sm">{asset.ticker}</span>
                            <span className="text-blue-400">R$ {asset.currentPrice.toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{analysis?.summary}</p>
                          <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded-lg">
                            <strong className="text-blue-400">Conduta:</strong> {analysis?.suggestedActionDetail}
                          </div>
                        </div>
                      );
                    })}
                  {metrics.holdCount === 0 && (
                    <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum ativo classificado para manter.</p>
                  )}
                </div>
              </div>

              {/* Pontos de Saída: VENDER */}
              <div className="bg-slate-900/40 border border-rose-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <h3 className="font-bold text-sm text-rose-400">Vender / Realizar Lucro</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold">
                    {metrics.sellCount}
                  </span>
                </div>

                <div className="space-y-3">
                  {portfolio
                    .filter(a => analyses[a.id]?.action === 'VENDER')
                    .map(asset => {
                      const analysis = analyses[asset.id];
                      const totalPos = asset.quantity * asset.currentPrice;
                      return (
                        <div key={asset.id} className="bg-slate-900 border border-rose-900/50 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="text-white text-sm">{asset.ticker}</span>
                            <span className="text-rose-400 font-mono">Resgate: R$ {totalPos.toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{analysis?.summary}</p>
                          <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded-lg">
                            <strong className="text-rose-400">Conduta:</strong> {analysis?.suggestedActionDetail}
                          </div>
                        </div>
                      );
                    })}
                  {metrics.sellCount === 0 && (
                    <p className="text-xs text-slate-500 italic py-4 text-center">Nenhum ativo com recomendação de venda ou stop acionado.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 4: REGRAS E GUIA DE INDICADORES (MARKDOWN)
           ========================================================================= */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Guia de Indicadores & Critérios da IA</h2>
                <p className="text-xs text-slate-400">
                  Defina as fórmulas (ROE $\ge$ 15%, P/VP, P/L, DY) que a inteligência artificial deve seguir.
                </p>
              </div>

              <button
                onClick={() => updateRules(DEFAULT_RULES_MARKDOWN)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg transition"
              >
                Restaurar Padrão
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Editor Markdown</span>
                <textarea
                  value={rulesMarkdown}
                  onChange={(e) => updateRules(e.target.value)}
                  rows={20}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Pré-visualização</span>
                <div className="h-[430px] overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {rulesMarkdown}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 5: CONFIGURAÇÕES & BACKUP
           ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-lg font-bold text-white">Configurações & Chaves de API</h2>
              <p className="text-xs text-slate-400">
                Gerencie as integrações do Pluggy Open Finance e Google Gemini.
              </p>
            </div>

            {/* Configuração Pluggy */}
            <div className="bg-slate-900/60 border border-sky-500/30 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Pluggy Open Finance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">PLUGGY_CLIENT_ID</label>
                  <input
                    type="text"
                    value={pluggyClientId}
                    onChange={(e) => { setPluggyClientId(e.target.value); localStorage.setItem('investai_pluggy_id', e.target.value); }}
                    placeholder="Cole seu Client ID..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">PLUGGY_CLIENT_SECRET</label>
                  <input
                    type="password"
                    value={pluggyClientSecret}
                    onChange={(e) => { setPluggyClientSecret(e.target.value); localStorage.setItem('investai_pluggy_secret', e.target.value); }}
                    placeholder="Cole seu Client Secret..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Configuração Gemini */}
            <div className="bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Google Gemini AI
              </h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">GEMINI_API_KEY (Gratuita)</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => { setGeminiKey(e.target.value); localStorage.setItem('investai_gemini_key', e.target.value); }}
                  placeholder="Cole sua chave do Google AI Studio..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Obtenha gratuitamente em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-400 underline">aistudio.google.com</a>. Caso não informe chave, o sistema usa o modelo determinístico do seu guia.
                </p>
              </div>
            </div>

            {/* Backup & Restauração */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Download className="h-4 w-4 text-cyan-400" /> Backup e Exportação
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleExportData}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5 inline mr-1.5" /> Baixar Carteira (JSON)
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5 inline mr-1.5" /> Baixar Planilha (CSV)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: PARECER DETALHADO DA IA */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-white">{selectedAnalysis.ticker}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  selectedAnalysis.action === 'COMPRAR_MAIS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                  selectedAnalysis.action === 'MANTER' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}>
                  {selectedAnalysis.action}
                </span>
              </div>
              <button onClick={() => setSelectedAnalysis(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Diagnóstico</span>
                <p className="text-slate-200 text-sm font-medium">{selectedAnalysis.summary}</p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-emerald-400 font-semibold uppercase tracking-wider block text-[11px]">
                  Confronto com o Guia
                </span>
                <p className="text-slate-300 leading-relaxed">{selectedAnalysis.thesisAlignment}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Múltiplos e Fatores:</span>
                <ul className="space-y-1.5 list-disc list-inside text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {selectedAnalysis.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/30">
                <span className="text-emerald-400 font-semibold uppercase tracking-wider block text-[11px] mb-1">
                  Conduta Prática Sugerida
                </span>
                <p className="text-slate-200 font-medium">{selectedAnalysis.suggestedActionDetail}</p>
              </div>

              <div className="text-[10px] text-slate-500 flex justify-between pt-2 border-t border-slate-800">
                <span>Convicção: {selectedAnalysis.confidenceScore}%</span>
                <span>Avaliado em: {new Date(selectedAnalysis.analyzedAt).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR ATIVO MANUAL */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">
                {editingAsset ? `Editar Ativo: ${editingAsset.ticker}` : 'Novo Ativo'}
              </h3>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const ticker = (formData.get('ticker') as string).toUpperCase().trim();
                const type = formData.get('type') as AssetType;
                const quantity = parseFloat(formData.get('quantity') as string) || 0;
                const averagePrice = parseFloat(formData.get('averagePrice') as string) || 0;
                const currentPrice = parseFloat(formData.get('currentPrice') as string) || averagePrice;

                if (!ticker || quantity <= 0 || averagePrice <= 0) return;

                if (editingAsset) {
                  const updated = portfolio.map(a => a.id === editingAsset.id ? { ...a, ticker, type, quantity, averagePrice, currentPrice } : a);
                  updatePortfolio(updated);
                } else {
                  const newA: Asset = {
                    id: `manual-${Date.now()}`,
                    ticker,
                    name: ticker,
                    type,
                    quantity,
                    averagePrice,
                    currentPrice
                  };
                  updatePortfolio([...portfolio, newA]);
                }
                setIsAssetModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-400 mb-1">Código / Ticker</label>
                <input name="ticker" defaultValue={editingAsset?.ticker || ''} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 uppercase" placeholder="Ex: PETR4, HGLG11" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Classe de Ativo</label>
                <select name="type" defaultValue={editingAsset?.type || 'stock'} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2">
                  <option value="stock">Ação B3</option>
                  <option value="fii">Fundo Imobiliário</option>
                  <option value="fixed_income">Renda Fixa</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Quantidade</label>
                  <input name="quantity" type="number" step="any" defaultValue={editingAsset?.quantity || 1} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Preço Médio (R$)</label>
                  <input name="averagePrice" type="number" step="0.01" defaultValue={editingAsset?.averagePrice || ''} required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Cotação Atual (R$)</label>
                  <input name="currentPrice" type="number" step="0.01" defaultValue={editingAsset?.currentPrice || ''} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setIsAssetModalOpen(false)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
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
  Link2
} from 'lucide-react';
import { Asset, AssetAnalysis, AssetType, RecommendationAction } from '@/lib/types';
import { DEFAULT_RULES_MARKDOWN } from '@/lib/defaultData';
import { PluggyConnectButton } from '@/components/PluggyConnectButton';

export default function InvestmentApp() {
  // State
  const [activeTab, setActiveTab] = useState<'portfolio' | 'rules' | 'ai_summary' | 'settings'>('portfolio');
  const [portfolio, setPortfolio] = useState<Asset[]>([]);
  const [rulesMarkdown, setRulesMarkdown] = useState<string>('');
  const [analyses, setAnalyses] = useState<Record<string, AssetAnalysis>>({});
  const [isAnalyzingAll, setIsAnalyzingAll] = useState<boolean>(false);
  const [analyzingAssetId, setAnalyzingAssetId] = useState<string | null>(null);
  const [isUpdatingQuotes, setIsUpdatingQuotes] = useState<boolean>(false);
  
  // Settings / Keys
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [brapiToken, setBrapiToken] = useState<string>('');
  const [pluggyClientId, setPluggyClientId] = useState<string>('');
  const [pluggyClientSecret, setPluggyClientSecret] = useState<string>('');
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState<'all' | AssetType>('all');
  const [actionFilter, setActionFilter] = useState<'all' | RecommendationAction>('all');
  
  // Modals
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AssetAnalysis | null>(null);

  // Load saved state from LocalStorage on mount
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
        // Remove quaisquer ativos de exemplo antigos, mantendo apenas ativos reais importados
        const onlyReal = parsed.filter((a: Asset) => a.id && a.id.startsWith('pluggy-'));
        setPortfolio(onlyReal);
        localStorage.setItem('investai_portfolio', JSON.stringify(onlyReal));
      } catch {
        setPortfolio([]);
        localStorage.setItem('investai_portfolio', JSON.stringify([]));
      }
    } else {
      setPortfolio([]);
      localStorage.setItem('investai_portfolio', JSON.stringify([]));
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

  // Save changes to LocalStorage
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

  // Merge investments from Pluggy import
  const handlePluggyImportSuccess = (importedAssets: Asset[]) => {
    const currentTickers = new Set(portfolio.map(a => a.ticker.toUpperCase()));
    const merged = [...portfolio];

    importedAssets.forEach(item => {
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
  };

  // Calculations
  const metrics = useMemo(() => {
    let totalInvested = 0;
    let currentTotal = 0;
    let buyCount = 0;
    let holdCount = 0;
    let sellCount = 0;

    portfolio.forEach(asset => {
      const invested = asset.quantity * asset.averagePrice;
      const current = asset.quantity * asset.currentPrice;
      totalInvested += invested;
      currentTotal += current;

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
      sellCount
    };
  }, [portfolio, analyses]);

  // Update real-time quotes via API
  const handleUpdateQuotes = async () => {
    setIsUpdatingQuotes(true);
    const updated = [...portfolio];

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
              currentPrice: data.price,
              change24h: data.changePercent !== undefined ? data.changePercent : asset.change24h
            };
          }
        }
      } catch (err) {
        console.error(`Erro ao atualizar cotação de ${asset.ticker}:`, err);
      }
    }

    updatePortfolio(updated);
    setIsUpdatingQuotes(false);
  };

  // Run AI analysis on a single asset
  const handleAnalyzeAsset = async (asset: Asset) => {
    setAnalyzingAssetId(asset.id);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset,
          rulesMarkdown,
          geminiApiKey: geminiKey || undefined
        })
      });

      if (res.ok) {
        const result: AssetAnalysis = await res.json();
        const updated = { ...analyses, [asset.id]: result };
        updateAnalyses(updated);
      }
    } catch (err) {
      console.error('Falha ao analisar com IA:', err);
    } finally {
      setAnalyzingAssetId(null);
    }
  };

  // Run AI analysis for entire portfolio
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
          geminiApiKey: geminiKey || undefined
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
      }
    } catch (err) {
      console.error('Falha na análise em lote com IA:', err);
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  // Delete an asset
  const handleDeleteAsset = (id: string) => {
    if (confirm('Tem certeza que deseja remover este ativo da carteira?')) {
      const nextPortfolio = portfolio.filter(a => a.id !== id);
      updatePortfolio(nextPortfolio);
      const nextAnalyses = { ...analyses };
      delete nextAnalyses[id];
      updateAnalyses(nextAnalyses);
    }
  };

  // Save an asset from modal (create or update)
  const handleSaveAssetModal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ticker = (formData.get('ticker') as string).toUpperCase().trim();
    const name = formData.get('name') as string;
    const type = formData.get('type') as AssetType;
    const quantity = parseFloat(formData.get('quantity') as string) || 0;
    const averagePrice = parseFloat(formData.get('averagePrice') as string) || 0;
    const currentPrice = parseFloat(formData.get('currentPrice') as string) || averagePrice;
    const targetPrice = formData.get('targetPrice') ? parseFloat(formData.get('targetPrice') as string) : undefined;
    const stopLossPrice = formData.get('stopLossPrice') ? parseFloat(formData.get('stopLossPrice') as string) : undefined;
    const dividendYield = formData.get('dividendYield') ? parseFloat(formData.get('dividendYield') as string) : undefined;
    const pl = formData.get('pl') ? parseFloat(formData.get('pl') as string) : undefined;
    const pvp = formData.get('pvp') ? parseFloat(formData.get('pvp') as string) : undefined;
    const sector = formData.get('sector') as string;
    const notes = formData.get('notes') as string;

    if (!ticker) return;

    if (editingAsset) {
      const updated = portfolio.map(a =>
        a.id === editingAsset.id
          ? {
              ...a,
              ticker,
              name: name || ticker,
              type,
              quantity,
              averagePrice,
              currentPrice,
              targetPrice,
              stopLossPrice,
              dividendYield,
              pl,
              pvp,
              sector,
              notes
            }
          : a
      );
      updatePortfolio(updated);
    } else {
      const newAsset: Asset = {
        id: `manual-${Date.now()}`,
        ticker,
        name: name || ticker,
        type,
        quantity,
        averagePrice,
        currentPrice,
        targetPrice,
        stopLossPrice,
        dividendYield,
        pl,
        pvp,
        sector,
        notes
      };
      updatePortfolio([...portfolio, newAsset]);
    }

    setIsAssetModalOpen(false);
    setEditingAsset(null);
  };

  // Export & Import backup
  const handleExportData = () => {
    const data = {
      portfolio,
      rulesMarkdown,
      analyses,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carteira-investai-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.portfolio) updatePortfolio(json.portfolio);
        if (json.rulesMarkdown) updateRules(json.rulesMarkdown);
        if (json.analyses) updateAnalyses(json.analyses);
        alert('Dados importados com sucesso!');
      } catch {
        alert('Arquivo inválido ou corrompido.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return portfolio.filter(asset => {
      if (typeFilter !== 'all' && asset.type !== typeFilter) return false;
      if (actionFilter !== 'all') {
        const a = analyses[asset.id];
        if (!a || a.action !== actionFilter) return false;
      }
      return true;
    });
  }, [portfolio, typeFilter, actionFilter, analyses]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BrainCircuit className="h-6 w-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  InvestAI
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Vercel Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">Decisor Autônomo de Carteira: Vender, Manter ou Comprar Mais</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Pluggy Connect Button */}
            <PluggyConnectButton
              onSuccessImport={handlePluggyImportSuccess}
              pluggyClientId={pluggyClientId}
              pluggyClientSecret={pluggyClientSecret}
            />

            <button
              onClick={handleUpdateQuotes}
              disabled={isUpdatingQuotes || portfolio.length === 0}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
              title="Atualiza as cotações via API de mercado"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isUpdatingQuotes ? 'animate-spin text-cyan-400' : ''}`} />
              {isUpdatingQuotes ? 'Atualizando...' : 'Atualizar Cotações'}
            </button>

            <button
              onClick={handleAnalyzeAll}
              disabled={isAnalyzingAll || portfolio.length === 0}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/25 transition disabled:opacity-50"
            >
              <Sparkles className={`h-4 w-4 mr-1.5 ${isAnalyzingAll ? 'animate-spin' : ''}`} />
              {isAnalyzingAll ? 'Processando com IA...' : 'Analisar Carteira (IA)'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metric Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Patrimônio Atual</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              R$ {metrics.currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 flex items-center text-xs">
              {metrics.totalProfitLoss >= 0 ? (
                <span className="text-emerald-400 flex items-center font-medium">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  +R$ {metrics.totalProfitLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (+{metrics.totalProfitLossPercent.toFixed(2)}%)
                </span>
              ) : (
                <span className="text-rose-400 flex items-center font-medium">
                  <TrendingDown className="h-3.5 w-3.5 mr-1" />
                  -R$ {Math.abs(metrics.totalProfitLoss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({metrics.totalProfitLossPercent.toFixed(2)}%)
                </span>
              )}
              <span className="text-slate-500 ml-1.5">vs custo investido</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Investido</span>
              <PieChart className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              R$ {metrics.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {portfolio.length} ativos cadastrados na carteira
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Oportunidades de Aporte</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-400">
              {metrics.buyCount} <span className="text-sm font-normal text-slate-400">ativos</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Descontados com margem de segurança
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Alertas de Venda / Lucro</span>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-rose-400">
              {metrics.sellCount} <span className="text-sm font-normal text-slate-400">ativos</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Atingiram alvo ou ativaram stop/risco
            </p>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'portfolio'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Minha Carteira & Veredito da IA</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'rules'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Documento de Regras e Teses (Markdown)</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_summary')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'ai_summary'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Plano de Ação Consolidado</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'settings'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Chaves & Conexões (Pluggy / Gemini)</span>
          </button>
        </div>

        {/* TAB 1: PORTFOLIO & RECOMENDAÇÕES */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Filter and Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center text-xs text-slate-400 mr-2">
                  <Filter className="h-3.5 w-3.5 mr-1" /> Filtros:
                </div>

                {/* Filter by Type */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="stock">Ações B3</option>
                  <option value="fii">Fundos Imobiliários (FIIs)</option>
                  <option value="fixed_income">Renda Fixa</option>
                </select>

                {/* Filter by Recommendation */}
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as any)}
                  className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">Todas as Decisões</option>
                  <option value="COMPRAR_MAIS">Apenas Comprar Mais</option>
                  <option value="MANTER">Apenas Manter</option>
                  <option value="VENDER">Apenas Vender</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setEditingAsset(null);
                    setIsAssetModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 transition w-full sm:w-auto"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Adicionar Ativo Manual
                </button>
              </div>
            </div>

            {/* Assets Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-900/90 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">Ativo / Tipo</th>
                    <th scope="col" className="px-4 py-3.5">Qtd.</th>
                    <th scope="col" className="px-4 py-3.5">Preço Médio</th>
                    <th scope="col" className="px-4 py-3.5">Cotação Atual</th>
                    <th scope="col" className="px-4 py-3.5">Posição Total</th>
                    <th scope="col" className="px-4 py-3.5">Alvo / Stop</th>
                    <th scope="col" className="px-4 py-3.5 text-center">Decisão da IA</th>
                    <th scope="col" className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-slate-500 space-y-3">
                        <Layers className="h-10 w-10 mx-auto text-slate-700" />
                        <div className="text-sm font-medium text-slate-300">Nenhum ativo importado ainda</div>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Clique no botão azul <span className="text-sky-400 font-semibold">"Conectar B3 / Corretora (Pluggy)"</span> no topo para sincronizar sua carteira oficial ou adicione manualmente.
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

                      return (
                        <tr key={asset.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white tracking-wide">{asset.ticker}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                                {asset.type === 'stock' ? 'AÇÃO' : asset.type === 'fii' ? 'FII' : 'RENDA FIXA'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-[160px]">{asset.name}</div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-slate-200">
                            {asset.quantity.toLocaleString('pt-BR')}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-slate-200">
                            R$ {asset.averagePrice.toFixed(2)}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-medium text-slate-100">
                              R$ {asset.currentPrice.toFixed(2)}
                            </div>
                            {asset.change24h !== undefined && (
                              <div className={`text-xs ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-100">
                              R$ {currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className={`text-xs font-medium ${profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {profitLoss >= 0 ? '+' : ''}{profitLossPct.toFixed(1)}% (R$ {profitLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-400">
                            <div>Alvo: {asset.targetPrice ? `R$ ${asset.targetPrice.toFixed(2)}` : '-'}</div>
                            <div>Stop: {asset.stopLossPrice ? `R$ ${asset.stopLossPrice.toFixed(2)}` : '-'}</div>
                          </td>

                          {/* AI Decision Cell */}
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {analysis ? (
                              <div className="flex flex-col items-center">
                                {analysis.action === 'COMPRAR_MAIS' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    <TrendingUp className="h-3 w-3 mr-1" /> COMPRAR MAIS
                                  </span>
                                )}
                                {analysis.action === 'MANTER' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> MANTER
                                  </span>
                                )}
                                {analysis.action === 'VENDER' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                    <TrendingDown className="h-3 w-3 mr-1" /> VENDER
                                  </span>
                                )}
                                <button
                                  onClick={() => setSelectedAnalysis(analysis)}
                                  className="mt-1 text-[11px] text-slate-400 hover:text-cyan-400 flex items-center underline underline-offset-2 transition"
                                >
                                  Ver justificativa ({analysis.confidenceScore}%)
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAnalyzeAsset(asset)}
                                disabled={isAnalyzing}
                                className="inline-flex items-center px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              >
                                <Sparkles className={`h-3 w-3 mr-1 ${isAnalyzing ? 'animate-spin text-emerald-400' : ''}`} />
                                {isAnalyzing ? 'Analisando...' : 'Avaliar'}
                              </button>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 whitespace-nowrap text-right space-x-2">
                            <button
                              onClick={() => handleAnalyzeAsset(asset)}
                              disabled={isAnalyzing}
                              title="Reanalisar este ativo com IA"
                              className="p-1 rounded text-slate-400 hover:text-emerald-400 transition"
                            >
                              <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingAsset(asset);
                                setIsAssetModalOpen(true);
                              }}
                              title="Editar ativo"
                              className="p-1 rounded text-slate-400 hover:text-cyan-400 transition"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset.id)}
                              title="Remover ativo"
                              className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Helper Banner */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-400">
              <HelpCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">Como funciona o algoritmo de decisão:</span> A IA lê todo o seu documento de regras e teses na aba <span className="text-emerald-400 font-medium">Teses e Regras</span> e cruza com a cotação em tempo real, margem de segurança, dividendos e preço-alvo. Você pode customizar suas regras a qualquer momento!
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RULES AND THESIS DOCUMENT (MARKDOWN) */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Seu Documento de Teses & Regras (Markdown)</h2>
                <p className="text-xs text-slate-400">
                  A IA usará estritamente os critérios definidos neste documento para deliberar se você deve Vender, Manter ou Comprar mais.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateRules(DEFAULT_RULES_MARKDOWN)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  Restaurar Regras Padrão
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Editor de Texto / Markdown
                </label>
                <textarea
                  value={rulesMarkdown}
                  onChange={(e) => updateRules(e.target.value)}
                  rows={24}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Escreva aqui suas diretrizes de investimento..."
                />
              </div>

              {/* Preview / Structured View */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Visualização Formatada
                </label>
                <div className="h-[520px] overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-300 leading-relaxed space-y-4">
                  <div className="whitespace-pre-wrap font-sans">
                    {rulesMarkdown}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONSOLIDATED ACTION PLAN (AI SUMMARY) */}
        {activeTab === 'ai_summary' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Diagnóstico e Plano de Ação Consolidado da IA</h2>
              <p className="text-xs text-slate-400">
                Visão executiva agregando todos os ativos categorizados pela recomendação de conduta.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Coluna COMPRAR MAIS */}
              <div className="bg-slate-900/40 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                    <h3 className="font-bold text-sm text-emerald-400">Comprar Mais (Oportunidades)</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                    {metrics.buyCount}
                  </span>
                </div>
                <div className="space-y-3">
                  {portfolio
                    .filter(a => analyses[a.id]?.action === 'COMPRAR_MAIS')
                    .map(asset => {
                      const analysis = analyses[asset.id];
                      return (
                        <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="text-white">{asset.ticker}</span>
                            <span className="text-emerald-400">R$ {asset.currentPrice.toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{analysis?.summary}</p>
                          <div className="text-[10px] text-slate-500">
                            Ação sugerida: <span className="text-slate-300">{analysis?.suggestedActionDetail}</span>
                          </div>
                        </div>
                      );
                    })}
                  {metrics.buyCount === 0 && (
                    <p className="text-xs text-slate-500 italic">Nenhum ativo classificado para compra imediata.</p>
                  )}
                </div>
              </div>

              {/* Coluna MANTER */}
              <div className="bg-slate-900/40 border border-blue-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                    <h3 className="font-bold text-sm text-blue-400">Manter Posição</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
                    {metrics.holdCount}
                  </span>
                </div>
                <div className="space-y-3">
                  {portfolio
                    .filter(a => analyses[a.id]?.action === 'MANTER')
                    .map(asset => {
                      const analysis = analyses[asset.id];
                      return (
                        <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="text-white">{asset.ticker}</span>
                            <span className="text-blue-400">R$ {asset.currentPrice.toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{analysis?.summary}</p>
                          <div className="text-[10px] text-slate-500">
                            Ação sugerida: <span className="text-slate-300">{analysis?.suggestedActionDetail}</span>
                          </div>
                        </div>
                      );
                    })}
                  {metrics.holdCount === 0 && (
                    <p className="text-xs text-slate-500 italic">Nenhum ativo classificado para manter.</p>
                  )}
                </div>
              </div>

              {/* Coluna VENDER */}
              <div className="bg-slate-900/40 border border-rose-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-rose-400"></div>
                    <h3 className="font-bold text-sm text-rose-400">Vender / Realizar Lucro</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold">
                    {metrics.sellCount}
                  </span>
                </div>
                <div className="space-y-3">
                  {portfolio
                    .filter(a => analyses[a.id]?.action === 'VENDER')
                    .map(asset => {
                      const analysis = analyses[asset.id];
                      return (
                        <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="text-white">{asset.ticker}</span>
                            <span className="text-rose-400">R$ {asset.currentPrice.toFixed(2)}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{analysis?.summary}</p>
                          <div className="text-[10px] text-slate-500">
                            Ação sugerida: <span className="text-rose-300 font-medium">{analysis?.suggestedActionDetail}</span>
                          </div>
                        </div>
                      );
                    })}
                  {metrics.sellCount === 0 && (
                    <p className="text-xs text-slate-500 italic">Nenhum ativo com recomendação de venda ou stop acionado.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & DEPLOY GUIDANCE */}
        {activeTab === 'settings' && (
          <div className="space-y-8 max-w-4xl">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Configurações de APIs & Conexão Pluggy</h2>
              <p className="text-xs text-slate-400">
                Gerencie suas credenciais para sincronização de investimentos Open Finance e análise de IA.
              </p>
            </div>

            {/* Pluggy Open Finance Configuration */}
            <div className="bg-slate-900/60 border border-sky-500/30 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-sky-400 uppercase tracking-wider flex items-center">
                <Link2 className="h-4 w-4 mr-2" /> Pluggy Open Finance (B3 & Corretoras)
              </h3>
              <p className="text-xs text-slate-300">
                Permite conectar sua conta da B3, XP, BTG, Inter, NuInvest, etc., sem precisar de banco de dados Supabase no momento.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    PLUGGY_CLIENT_ID
                  </label>
                  <input
                    type="text"
                    value={pluggyClientId}
                    onChange={(e) => {
                      setPluggyClientId(e.target.value);
                      localStorage.setItem('investai_pluggy_id', e.target.value);
                    }}
                    placeholder="Cole seu Client ID da Pluggy..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    PLUGGY_CLIENT_SECRET
                  </label>
                  <input
                    type="password"
                    value={pluggyClientSecret}
                    onChange={(e) => {
                      setPluggyClientSecret(e.target.value);
                      localStorage.setItem('investai_pluggy_secret', e.target.value);
                    }}
                    placeholder="Cole seu Client Secret da Pluggy..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Obtenha em <a href="https://dashboard.pluggy.ai" target="_blank" rel="noreferrer" className="text-sky-400 underline">dashboard.pluggy.ai</a> ou defina no arquivo <code className="text-sky-300">.env.local</code>.
              </p>
            </div>

            {/* AI & Market APIs Configuration */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center">
                <Sparkles className="h-4 w-4 mr-2" /> Inteligência Artificial & Cotações
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => {
                      setGeminiKey(e.target.value);
                      localStorage.setItem('investai_gemini_key', e.target.value);
                    }}
                    placeholder="Cole sua API Key do Google AI Studio..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Obtenha gratuitamente em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-400 underline">aistudio.google.com</a>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Brapi Token (Opcional para cotações em tempo real)
                  </label>
                  <input
                    type="password"
                    value={brapiToken}
                    onChange={(e) => {
                      setBrapiToken(e.target.value);
                      localStorage.setItem('investai_brapi_token', e.target.value);
                    }}
                    placeholder="Cole seu token da Brapi..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Obtenha em <a href="https://brapi.dev" target="_blank" rel="noreferrer" className="text-emerald-400 underline">brapi.dev</a>. Se vazio, o sistema usa Yahoo Finance.
                  </p>
                </div>
              </div>

              {/* Data Backup */}
              <div className="pt-4 border-t border-slate-800 flex items-center gap-4">
                <button
                  onClick={handleExportData}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Fazer Backup (Exportar JSON)
                </button>

                <label className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer">
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Restaurar Backup (Importar JSON)
                  <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                </label>
              </div>
            </div>

            {/* Deploy to Vercel Guide */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center">
                <ExternalLink className="h-4 w-4 mr-2" /> Como subir para a Vercel
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Este projeto é 100% desenvolvido em Next.js no padrão nativo da Vercel:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-400">
                <li>Suba o projeto para o seu GitHub (<code className="text-emerald-400">git push origin master</code>).</li>
                <li>No dashboard da <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Vercel</a>, selecione <strong>Add New Project</strong>.</li>
                <li>Adicione as variáveis de ambiente:
                  <ul className="list-disc list-inside ml-4 mt-1 font-mono text-[11px] text-slate-300">
                    <li><code className="text-sky-300">PLUGGY_CLIENT_ID</code></li>
                    <li><code className="text-sky-300">PLUGGY_CLIENT_SECRET</code></li>
                    <li><code className="text-emerald-400">GEMINI_API_KEY</code></li>
                    <li><code className="text-emerald-400">BRAPI_TOKEN</code> (opcional)</li>
                  </ul>
                </li>
                <li>Pronto! Sincronização e IA funcionando online.</li>
              </ol>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD / EDIT ASSET */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100">
                {editingAsset ? `Editar Ativo: ${editingAsset.ticker}` : 'Adicionar Novo Ativo'}
              </h3>
              <button
                onClick={() => {
                  setIsAssetModalOpen(false);
                  setEditingAsset(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssetModal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Ticker / Código *</label>
                  <input
                    name="ticker"
                    required
                    defaultValue={editingAsset?.ticker || ''}
                    placeholder="Ex: PETR4, HGLG11"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 uppercase font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Tipo de Aplicação *</label>
                  <select
                    name="type"
                    defaultValue={editingAsset?.type || 'stock'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="stock">Ação (B3)</option>
                    <option value="fii">FII (Fundo Imobiliário)</option>
                    <option value="fixed_income">Renda Fixa / Título</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Nome da Empresa / Título</label>
                <input
                  name="name"
                  defaultValue={editingAsset?.name || ''}
                  placeholder="Ex: Petrobras ON, Tesouro Selic 2029"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Quantidade *</label>
                  <input
                    name="quantity"
                    type="number"
                    step="any"
                    required
                    defaultValue={editingAsset?.quantity ?? 100}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Preço Médio (R$) *</label>
                  <input
                    name="averagePrice"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={editingAsset?.averagePrice ?? 30.00}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Cotação Atual (R$)</label>
                  <input
                    name="currentPrice"
                    type="number"
                    step="0.01"
                    defaultValue={editingAsset?.currentPrice ?? 30.00}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Preço-Alvo / Teto (R$)</label>
                  <input
                    name="targetPrice"
                    type="number"
                    step="0.01"
                    defaultValue={editingAsset?.targetPrice || ''}
                    placeholder="Ex: 45.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Stop Loss Fundamentalista (R$)</label>
                  <input
                    name="stopLossPrice"
                    type="number"
                    step="0.01"
                    defaultValue={editingAsset?.stopLossPrice || ''}
                    placeholder="Ex: 25.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">DY (%)</label>
                  <input
                    name="dividendYield"
                    type="number"
                    step="0.1"
                    defaultValue={editingAsset?.dividendYield || ''}
                    placeholder="Ex: 9.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">P/L</label>
                  <input
                    name="pl"
                    type="number"
                    step="0.1"
                    defaultValue={editingAsset?.pl || ''}
                    placeholder="Ex: 6.2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">P/VP</label>
                  <input
                    name="pvp"
                    type="number"
                    step="0.01"
                    defaultValue={editingAsset?.pvp || ''}
                    placeholder="Ex: 1.10"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Notas / Tese Resumida</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingAsset?.notes || ''}
                  placeholder="Ex: Comprado com foco no dividendo extraordinário..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssetModalOpen(false);
                    setEditingAsset(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20 transition"
                >
                  {editingAsset ? 'Salvar Alterações' : 'Adicionar Ativo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ANALYSIS DETAILS */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="font-extrabold text-lg text-white">{selectedAnalysis.ticker}</div>
                {selectedAnalysis.action === 'COMPRAR_MAIS' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    COMPRAR MAIS
                  </span>
                )}
                {selectedAnalysis.action === 'MANTER' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
                    MANTER
                  </span>
                )}
                {selectedAnalysis.action === 'VENDER' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    VENDER
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                  Resumo do Parecer
                </span>
                <p className="text-slate-200 text-sm font-medium">{selectedAnalysis.summary}</p>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-semibold uppercase tracking-wider block text-[11px]">
                  Alinhamento com as Regras da sua Tese
                </span>
                <p className="text-slate-300 leading-relaxed">{selectedAnalysis.thesisAlignment}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                  Fatores Determinantes:
                </span>
                <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                  {selectedAnalysis.reasons.map((reason, idx) => (
                    <li key={idx} className="leading-relaxed">{reason}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <span className="text-cyan-400 font-semibold uppercase tracking-wider block text-[11px] mb-1">
                  Recomendação Prática de Execução
                </span>
                <p className="text-slate-200 font-medium">{selectedAnalysis.suggestedActionDetail}</p>
              </div>

              <div className="text-[10px] text-slate-500 text-right">
                Analisado em: {new Date(selectedAnalysis.analyzedAt).toLocaleString('pt-BR')} (Convicção: {selectedAnalysis.confidenceScore}%)
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

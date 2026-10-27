'use client';

import React, { useState, useEffect } from 'react';
import { Link2, Loader2, CheckCircle2 } from 'lucide-react';
import { Asset } from '@/lib/types';

interface PluggyConnectModalProps {
  onSuccessImport: (newAssets: Asset[]) => void;
  pluggyClientId?: string;
  pluggyClientSecret?: string;
}

export function PluggyConnectButton({
  onSuccessImport,
  pluggyClientId,
  pluggyClientSecret,
}: PluggyConnectModalProps) {
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInvestments, setIsFetchingInvestments] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Escuta os eventos postMessage do iframe do Pluggy (quando o usuário conclui o fluxo ou fecha)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Pluggy envia mensagens com dados da conexão
      if (!event.data) return;

      const data = event.data;
      
      // Evento de sucesso (conclusão do login no banco/B3)
      if (data.event === 'item/created' || data.event === 'item/updated' || data.type === 'item/created' || (data.item && data.item.id)) {
        const itemId = data.item?.id || data.itemId || data.id;
        if (itemId) {
          setIsOpen(false);
          setConnectUrl(null);
          await fetchInvestmentsByItemId(itemId);
        }
      }

      // Evento de fechamento pelo usuário dentro do widget
      if (data.event === 'close' || data.type === 'close' || data.action === 'close') {
        setIsOpen(false);
        setConnectUrl(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pluggyClientId, pluggyClientSecret]);

  const handleOpenConnect = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/pluggy/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: pluggyClientId || undefined,
          clientSecret: pluggyClientSecret || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar token');
      }

      const token = data.accessToken;
      // Constrói a URL direta do widget webapp oficial do Pluggy
      // https://connect.pluggy.ai/?connectToken=...
      const url = `https://connect.pluggy.ai/?connectToken=${token}&includeSandbox=true`;
      setConnectUrl(url);
      setIsOpen(true);
    } catch (error) {
      console.error('Falha ao conectar com Pluggy:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Falha ao conectar. Verifique suas credenciais do Pluggy na aba Configurações.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvestmentsByItemId = async (itemId: string) => {
    setIsFetchingInvestments(true);
    setStatusMessage('Conta conectada com sucesso! Importando seus investimentos...');

    try {
      const queryParams = new URLSearchParams({ itemId });
      if (pluggyClientId) queryParams.append('clientId', pluggyClientId);
      if (pluggyClientSecret) queryParams.append('clientSecret', pluggyClientSecret);

      const res = await fetch(`/api/pluggy/investments?${queryParams.toString()}`);
      const invData = await res.json();

      if (!res.ok) {
        throw new Error(invData.error || 'Falha ao recuperar investimentos');
      }

      if (invData.assets && invData.assets.length > 0) {
        onSuccessImport(invData.assets);
        setStatusMessage(`Sucesso! ${invData.assets.length} ativos importados para a carteira.`);
      } else {
        setStatusMessage('Conexão realizada, mas nenhum investimento foi localizado.');
      }
    } catch (error) {
      console.error('Erro ao sincronizar investimentos:', error);
      setStatusMessage('Erro ao sincronizar investimentos.');
    } finally {
      setIsFetchingInvestments(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setConnectUrl(null);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleOpenConnect}
          disabled={isLoading || isFetchingInvestments}
          className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20 transition disabled:opacity-50"
          title="Conectar com B3 ou sua Corretora via Open Finance Pluggy"
        >
          {isLoading || isFetchingInvestments ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
          )}
          {isLoading
            ? 'Iniciando...'
            : isFetchingInvestments
            ? 'Importando Ativos...'
            : 'Conectar B3 / Corretora (Pluggy)'}
        </button>

        {statusMessage && (
          <div className="text-xs text-sky-400 flex items-center bg-sky-950/40 border border-sky-800/60 px-2.5 py-1 rounded-lg animate-pulse">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-sky-400" />
            {statusMessage}
          </div>
        )}
      </div>

      {/* Modal responsivo e controlado de tela cheia com Iframe direto do Pluggy */}
      {isOpen && connectUrl && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md h-[92vh] max-h-[720px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-sky-400" /> Pluggy Open Finance
              </span>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm hover:bg-slate-800 transition"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Iframe Direto e Limpo com dimensões 100% */}
            <div className="flex-1 w-full h-full bg-white relative">
              <iframe
                src={connectUrl}
                title="Pluggy Connect"
                className="w-full h-full border-0"
                allow="camera; microphone; geolocation"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

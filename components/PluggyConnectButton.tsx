'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Link2, Loader2, CheckCircle2 } from 'lucide-react';
import { Item } from 'pluggy-sdk';
import { Asset } from '@/lib/types';

// Load PluggyConnect widget dynamically on client side
const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((mod) => mod.PluggyConnect),
  {
    ssr: false,
    loading: () => null,
  }
);

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
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInvestments, setIsFetchingInvestments] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

      setConnectToken(data.accessToken);
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

  const handleSuccess = async (data: { item: Item }) => {
    setIsOpen(false);
    setIsFetchingInvestments(true);
    setStatusMessage(`Conexão realizada com sucesso (${data.item.connector?.name || 'Instituição'})! Baixando seus investimentos...`);

    try {
      const queryParams = new URLSearchParams({ itemId: data.item.id });
      if (pluggyClientId) queryParams.append('clientId', pluggyClientId);
      if (pluggyClientSecret) queryParams.append('clientSecret', pluggyClientSecret);

      const res = await fetch(`/api/pluggy/investments?${queryParams.toString()}`);
      const invData = await res.json();

      if (!res.ok) {
        throw new Error(invData.error || 'Falha ao recuperar investimentos');
      }

      if (invData.assets && invData.assets.length > 0) {
        onSuccessImport(invData.assets);
        setStatusMessage(`Sucesso! ${invData.assets.length} ativos importados para a sua carteira.`);
      } else {
        setStatusMessage('Conexão realizada, mas nenhum investimento foi localizado nesta conta.');
      }
    } catch (error) {
      console.error('Erro ao sincronizar investimentos:', error);
      setStatusMessage('Erro ao sincronizar os investimentos da conta conectada.');
    } finally {
      setIsFetchingInvestments(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  const handleError = (error: { message?: string }) => {
    console.error('Erro no widget Pluggy:', error);
    setIsOpen(false);
    alert(error.message || 'Erro durante a conexão com a instituição.');
  };

  const handleClose = () => {
    setIsOpen(false);
    setConnectToken(null);
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

      {/* Modal Container Overlay com z-index alto e tela cheia */}
      {typeof window !== 'undefined' && connectToken && isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg h-[640px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-sky-400" /> Conectar via Pluggy Open Finance
              </span>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm transition"
                title="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 w-full h-full relative">
              <PluggyConnect
                connectToken={connectToken}
                includeSandbox
                onSuccess={handleSuccess}
                onError={handleError}
                onClose={handleClose}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

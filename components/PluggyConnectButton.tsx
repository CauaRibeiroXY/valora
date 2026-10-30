'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { Link2, Loader2, CheckCircle2, Landmark } from 'lucide-react';
import { Item } from 'pluggy-sdk';
import { Asset } from '@/lib/types';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          : 'Falha ao conectar. Verifique suas credenciais do Pluggy na aba Ajustes.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async (data: { item: Item }) => {
    setIsOpen(false);
    setConnectToken(null);
    setIsFetchingInvestments(true);
    setStatusMessage(`Sincronizando ativos...`);

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
        setStatusMessage(`${invData.assets.length} ativos importados`);
      } else {
        setStatusMessage('Nenhum ativo localizado');
      }
    } catch (error) {
      console.error('Erro ao sincronizar investimentos:', error);
      setStatusMessage('Erro ao sincronizar');
    } finally {
      setIsFetchingInvestments(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleError = (error: { message?: string }) => {
    console.error('Erro no widget Pluggy:', error);
    setIsOpen(false);
    setConnectToken(null);
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
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition disabled:opacity-50"
          title="Conectar com B3 / Corretora via Open Finance"
        >
          {isLoading || isFetchingInvestments ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-emerald-400" />
          ) : (
            <Landmark className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
          )}
          {isLoading
            ? 'Conectando...'
            : isFetchingInvestments
            ? 'Importando...'
            : 'Sincronizar B3'}
        </button>

        {statusMessage && (
          <div className="text-[11px] text-emerald-400 flex items-center bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
            {statusMessage}
          </div>
        )}
      </div>

      {mounted &&
        typeof window !== 'undefined' &&
        connectToken &&
        isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999999999] pointer-events-auto">
            <PluggyConnect
              connectToken={connectToken}
              includeSandbox
              onSuccess={handleSuccess}
              onError={handleError}
              onClose={handleClose}
            />
          </div>,
          document.body
        )}
    </>
  );
}

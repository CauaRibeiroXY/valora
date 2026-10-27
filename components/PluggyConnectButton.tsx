'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { Link2, Loader2, CheckCircle2 } from 'lucide-react';
import { Item } from 'pluggy-sdk';
import { Asset } from '@/lib/types';

// Carrega o componente oficial do SDK da Pluggy dinamicamente no client-side
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
          : 'Falha ao conectar. Verifique suas credenciais do Pluggy na aba Configurações.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async (data: { item: Item }) => {
    setIsOpen(false);
    setConnectToken(null);
    setIsFetchingInvestments(true);
    setStatusMessage(`Conexão realizada (${data.item.connector?.name || 'Instituição'})! Importando seus investimentos...`);

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

      {/* Renderiza via createPortal diretamente no document.body para escapar do backdrop-blur do header */}
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

import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, Ban } from 'lucide-react';
import { EtapaStatus } from '../types';

interface StatusBadgeProps {
  status: EtapaStatus | 'Sucesso' | 'Falha';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'Concluída':
    case 'Sucesso':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" /> {status}
        </span>
      );
    case 'Falha':
    case 'Falhou':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800">
          <XCircle className="w-3.5 h-3.5" /> {status}
        </span>
      );
    case 'Em andamento':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-400 dark:border-teal-800 animate-pulse">
          <div className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /> Em andamento
        </span>
      );
    case 'Cancelada':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5" /> Cancelada
        </span>
      );
    case 'Não habilitada':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
          <Ban className="w-3.5 h-3.5" /> Não habilitada
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <Clock className="w-3.5 h-3.5" /> Aguardando
        </span>
      );
  }
};
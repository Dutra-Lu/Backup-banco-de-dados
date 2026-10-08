import React from 'react';
import { Check, Loader2, X, MinusCircle, Clock } from 'lucide-react';
import { EtapaStatus } from '../types';

interface StepperItemProps {
  titulo: string;
  status: EtapaStatus;
  isLast?: boolean;
}

export const StepperItem: React.FC<StepperItemProps> = ({ titulo, status, isLast }) => {
  const getIcon = () => {
    switch (status) {
      case 'Concluída':
        return <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Em andamento':
        return <Loader2 className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin" />;
      case 'Falhou':
        return <X className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'Cancelada':
        return <MinusCircle className="w-4 h-4 text-amber-500" />;
      case 'Não habilitada':
        return <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'Concluída':
        return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
      case 'Em andamento':
        return 'border-teal-600 bg-teal-50 dark:bg-teal-950/30 animate-pulse';
      case 'Falhou':
        return 'border-rose-500 bg-rose-50 dark:bg-rose-950/30';
      default:
        return 'border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700';
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'Concluída':
        return 'text-slate-900 dark:text-slate-100 font-medium';
      case 'Em andamento':
        return 'text-teal-900 dark:text-teal-200 font-semibold';
      case 'Falhou':
        return 'text-rose-900 dark:text-rose-200 font-semibold';
      case 'Não habilitada':
      case 'Cancelada':
        return 'text-slate-400 dark:text-slate-500';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <article className="flex items-start relative pb-6 last:pb-0">
      {!isLast && (
        <span className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
      )}
      <figure className={`flex items-center justify-center w-8 h-8 rounded-full border-2 z-10 m-0 ${getBorderColor()}`}>
        {getIcon()}
      </figure>
      <p className="ml-4 flex items-center justify-between flex-1 m-0">
        <span className={`text-sm ${getTextColor()}`}>{titulo}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
          {status === 'Não habilitada' ? 'Não habilitada' : status.toLowerCase()}
        </span>
      </p>
    </article>
  );
};
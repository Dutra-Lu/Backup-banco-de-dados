import React from 'react';
import { GitBranch } from 'lucide-react';
import { MaintenanceMode, SimulatedLastMaintenance } from '../types';

interface DecisionPanelProps {
  modo: MaintenanceMode;
  ultimaManutencao: SimulatedLastMaintenance;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({ modo, ultimaManutencao }) => {
  const calcularDecisao = () => {
    if (modo !== 'Automático') {
      return {
        tipo: 'Manual',
        acao: modo,
        regra: 'A escolha manual sempre prevalece sobre a regra automática configurada.'
      };
    }

    switch (ultimaManutencao) {
      case 'Há 12 dias':
        return { tipo: 'Automática', acao: 'Nenhuma manutenção', regra: 'Menos de 30 dias desde a última manutenção.' };
      case 'Há 45 dias':
        return { tipo: 'Automática', acao: 'VACUUM', regra: 'Última manutenção entre 30 e 60 dias.' };
      case 'Há 75 dias':
      case 'Sem histórico':
        return { tipo: 'Automática', acao: 'VACUUM FULL ANALYZE', regra: 'Mais de 60 dias ou sem histórico registrado.' };
      default:
        return { tipo: 'Automática', acao: 'Nenhuma manutenção', regra: 'Padrão.' };
    }
  };

  const info = calcularDecisao();

  return (
    <section className="p-4 rounded-xl bg-teal-50/70 border border-teal-100 dark:bg-teal-950/20 dark:border-teal-900/50 mt-4">
      <header className="flex items-center gap-2 text-teal-900 dark:text-teal-300 font-medium text-sm mb-3">
        <GitBranch className="w-4 h-4 text-teal-700 dark:text-teal-400" />
        Decisão de manutenção
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <article>
          <span className="text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider font-semibold">Tipo da decisão</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{info.tipo}</span>
        </article>

        <article>
          <span className="text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider font-semibold">Ação</span>
          <span className="font-semibold text-teal-900 dark:text-teal-300 text-sm">{info.acao}</span>
        </article>

        <article>
          <span className="text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider font-semibold">Regra aplicada</span>
          <span className="text-slate-700 dark:text-slate-300 text-sm">{info.regra}</span>
        </article>
      </div>
    </section>
  );
};
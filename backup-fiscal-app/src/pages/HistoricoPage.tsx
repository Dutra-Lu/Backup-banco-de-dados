import React from 'react';
import { StatusBadge } from '../components/StatusBadge';
import { Execucao } from '../types';

interface HistoricoPageProps {
  historico: Execucao[];
  onVerLog: (execucao: Execucao) => void;
}

export const HistoricoPage = ({ historico, onVerLog }: HistoricoPageProps) => {
  return (
    <section className="space-y-6">
      <hgroup>
        <span className="text-xs font-semibold text
        -teal-700 dark:text-teal-400 tracking-wider uppercase block mb-1">Histórico</span>
        <h2 className="text-3xl font-bold font-['Bricolage_Grotesque'] text-slate-900 dark:text-white">
          Execuções anteriores
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Consulte resultados, decisões de manutenção e registros de cada processo.
        </p>
      </hgroup>

      <figure className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm m-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <th className="p-4">Data</th>
              <th className="p-4">Duração</th>
              <th className="p-4">Tipo da decisão</th>
              <th className="p-4">Manutenção aplicada</th>
              <th className="p-4">Resultado</th>
              <th className="p-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {historico.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{item.data}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400">{item.duracao}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400">{item.tipoDecisao}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400">{item.manutencaoAplicada}</td>
                <td className="p-4"><StatusBadge status={item.resultado} /></td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => onVerLog(item)}
                    className="text-teal-700 dark:text-teal-400 font-medium hover:underline"
                  >
                    Ver log
                  </button>
                </td>
              </tr>
            ))}
            {historico.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">Nenhuma execução registrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </figure>
    </section>
  );
};
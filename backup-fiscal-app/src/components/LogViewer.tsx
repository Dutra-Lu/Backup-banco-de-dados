import React from 'react';
import { Execucao } from '../types';
import { StatusBadge } from './StatusBadge';
import { ArrowLeft, Mail, ShieldAlert } from 'lucide-react';

interface LogViewerProps {
  execucao: Execucao;
  onVoltar?: () => void;
  titulo?: string;
  subtitulo?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  execucao,
  onVoltar,
  titulo = 'Detalhes do processamento',
  subtitulo = 'Registro técnico estruturado do backup selecionado.',
}) => {
  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          {onVoltar && (
          <button
            onClick={onVoltar}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para histórico
          </button>
          )}
          <h2 className="text-2xl font-bold font-['Bricolage_Grotesque'] text-slate-900 dark:text-white">
            {titulo}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {subtitulo}
          </p>
        </hgroup>
      </header>

      <article className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
          <p>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Data</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{execucao.data}</span>
          </p>
          <p>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Tipo de decisão</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{execucao.tipoDecisao}</span>
          </p>
          <p>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Ação</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{execucao.manutencaoAplicada}</span>
          </p>
          <p className="flex items-center justify-between">
            <span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Duração</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{execucao.duracao}</span>
            </span>
            <StatusBadge status={execucao.resultado} />
          </p>
        </section>

        {execucao.emailEnviado && (
          <aside className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
            <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Alerta de falha enviado por e-mail com sucesso para o administrador (simulado via MailHog).</span>
          </aside>
        )}

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Eventos registrados</h3>
          <figure className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden m-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3.5">Horário</th>
                  <th className="p-3.5">Etapa</th>
                  <th className="p-3.5">Mensagem</th>
                  <th className="p-3.5">Saída técnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs font-['Instrument_Sans']">
                {execucao.logs && execucao.logs.length > 0 ? (
                  execucao.logs.map((log, idx) => (
                    <tr key={idx} className={log.isError ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">{log.horario}</td>
                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">{log.etapa}</td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">{log.mensagem}</td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/30 rounded">
                        {log.saidaTecnica}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      Nenhum evento detalhado registrado para esta execução. Senhas e chaves ocultadas como ********.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </figure>
          
          <footer className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Dados sensíveis são sempre ocultados: senha do banco, chave AES e senha do ZIP aparecem como ********.</span>
          </footer>
        </section>
      </article>
    </section>
  );
};
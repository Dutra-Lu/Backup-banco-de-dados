import React, { useEffect, useRef } from 'react';
import { Play, Square, Terminal, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { StepperItem } from '../components/StepperItem';
import { ETAPAS_LISTA } from '../hooks/useExecucao';
import { Configuracao, EtapaStatus, LogEntry } from '../types';

interface ExecucaoPageProps {
  config: Configuracao;
  acaoAtualCalculada: string;
  simularFalhaEm: string;
  setSimularFalhaEm: React.Dispatch<React.SetStateAction<string>>;
  executando: boolean;
  conexaoStatus: { tested: boolean; success: boolean; message: string };
  etapasStatus: Record<string, EtapaStatus>;
  resultadoFinal: { status: 'Sucesso' | 'Falha' | 'Cancelada'; mensagem: string; duracao: string } | null;
  logsAtuais: LogEntry[];
  cancelando: boolean;
  onCancelar: () => void;
  onIniciarProcesso: () => void;
  onVerLog: () => void;
  showVacuumModal: boolean;
  setShowVacuumModal: React.Dispatch<React.SetStateAction<boolean>>;
  onExecutarAposModal: () => void;
}

export const ExecucaoPage: React.FC<ExecucaoPageProps> = ({
  config,
  acaoAtualCalculada,
  simularFalhaEm,
  setSimularFalhaEm,
  executando,
  conexaoStatus,
  etapasStatus,
  resultadoFinal,
  logsAtuais,
  cancelando,
  onCancelar,
  onIniciarProcesso,
  onVerLog,
  showVacuumModal,
  setShowVacuumModal,
  onExecutarAposModal
}) => {
  const logRef = useRef<HTMLDivElement>(null);

  // rola o log para a última linha a cada novo evento
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logsAtuais.length]);

  return (
    <section className="space-y-6">
      <hgroup>
        <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 tracking-wider uppercase block mb-1">Execução</span>
        <h2 className="text-3xl font-bold font-['Bricolage_Grotesque'] text-slate-900 dark:text-white">
          Executar backup
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Acompanhe cada etapa sem interromper o uso da plataforma.
        </p>
      </hgroup>

      <article className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Resumo da configuração</h3>
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
          <p className="m-0">
            <span className="text-slate-400 block mb-1">Banco</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{config.database}</span>
          </p>
          <p className="m-0">
            <span className="text-slate-400 block mb-1">Destino</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{config.caminhoDestino}</span>
          </p>
          <p className="m-0">
            <span className="text-slate-400 block mb-1">Manutenção</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{acaoAtualCalculada}</span>
          </p>
          <p className="m-0">
            <span className="text-slate-400 block mb-1">Etapas opcionais</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {[config.criptografarAES && 'AES', config.compactarZIP && 'ZIP', config.backupsManter > 0 && 'Retenção'].filter(Boolean).join(', ') || 'Nenhuma'}
            </span>
          </p>
        </section>
      </article>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
          <section className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">Controles da execução</h3>
            <p className="m-0">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Simular falha em</label>
              <select
                value={simularFalhaEm}
                onChange={e => setSimularFalhaEm(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="Nenhuma etapa">Nenhuma etapa</option>
                {ETAPAS_LISTA.map(etp => (
                  <option key={etp} value={etp}>{etp}</option>
                ))}
              </select>
            </p>
          </section>

          <footer className="space-y-3">
            <button
              onClick={onIniciarProcesso}
              disabled={executando || !conexaoStatus.success}
              className={`w-full py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                !conexaoStatus.success
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : executando
                  ? 'bg-teal-700/50 text-white cursor-wait'
                  : 'bg-teal-700 hover:bg-teal-800 text-white shadow-lg shadow-teal-700/20'
              }`}
            >
              <Play className="w-4 h-4" /> {executando ? 'Executando...' : 'Iniciar processo'}
            </button>
            {executando && (
              <button
                onClick={onCancelar}
                disabled={cancelando}
                className="w-full py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-all disabled:opacity-60 disabled:cursor-wait"
              >
                <Square className="w-4 h-4" /> {cancelando ? 'Parando...' : 'Parar backup'}
              </button>
            )}
            {!conexaoStatus.success && (
              <span className="text-[11px] text-amber-600 block text-center">Faça um teste de conexão bem-sucedido na configuração para liberar a execução.</span>
            )}
          </footer>
        </article>

        <article className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-6">Etapas do processo</h3>
          <section className="space-y-0">
            {ETAPAS_LISTA.map((etp, idx) => (
              <StepperItem
                key={etp}
                titulo={etp}
                status={etapasStatus[etp]}
                isLast={idx === ETAPAS_LISTA.length - 1}
              />
            ))}
          </section>
        </article>
      </section>

      {(executando || logsAtuais.length > 0) && (
        <article className="bg-slate-950 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
          <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300 m-0 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-teal-400" /> Log em tempo real
            </h3>
            {executando && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-teal-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> ao vivo
              </span>
            )}
          </header>
          <div ref={logRef} className="max-h-72 overflow-y-auto p-4 font-mono text-xs space-y-2">
            {logsAtuais.length === 0 ? (
              <p className="m-0 text-slate-500">Aguardando o primeiro evento…</p>
            ) : (
              logsAtuais.map((l, i) => (
                <p key={i} className={`m-0 leading-relaxed ${l.isError ? 'text-rose-400' : 'text-slate-300'}`}>
                  <span className="text-slate-500">[{l.horario}]</span>{' '}
                  <span className="text-teal-300 font-semibold">{l.etapa}</span>{' '}
                  {l.mensagem}
                  <span className="block pl-4 text-slate-500 break-all">{l.saidaTecnica}</span>
                </p>
              ))
            )}
          </div>
        </article>
      )}

      {resultadoFinal && (
        <aside className={`p-4 rounded-2xl border flex items-center justify-between ${
          resultadoFinal.status === 'Sucesso'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : resultadoFinal.status === 'Cancelada'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <p className="flex items-center gap-3 m-0">
            {resultadoFinal.status === 'Sucesso' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : resultadoFinal.status === 'Cancelada' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>
              <span className="font-semibold text-sm block">
                {resultadoFinal.status === 'Sucesso'
                  ? `Backup concluído (${resultadoFinal.duracao})`
                  : resultadoFinal.status === 'Cancelada'
                  ? 'Backup cancelado'
                  : 'Processo interrompido por falha'}
              </span>
              <span className="text-xs opacity-90">{resultadoFinal.mensagem}</span>
            </span>
          </p>
          <button
            onClick={onVerLog}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Ver log
          </button>
        </aside>
      )}

      {showVacuumModal && (
        <dialog open className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 m-0 w-full h-full max-w-none">
          <article className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <header className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Confirmação de VACUUM FULL</h3>
            </header>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed m-0">
              A operação <strong className="text-slate-800 dark:text-slate-100">VACUUM FULL ANALYZE</strong> bloqueia tabelas exclusivas do banco PostgreSQL e pode demorar dependendo do volume fiscal. Deseja prosseguir com a execução?
            </p>
            <menu className="flex items-center justify-end gap-3 pt-2 m-0 p-0">
              <button
                onClick={() => setShowVacuumModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={onExecutarAposModal}
                className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-medium hover:bg-teal-800 shadow-md shadow-teal-700/20"
              >
                Confirmar e executar
              </button>
            </menu>
          </article>
        </dialog>
      )}
    </section>
  );
};
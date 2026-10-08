import React from 'react';
import { Database, Folder, Shield, Play, CheckCircle2, XCircle } from 'lucide-react';
import { DecisionPanel } from '../components/DecisionPanel';
import { Configuracao, MaintenanceMode, SimulatedLastMaintenance } from '../types';

// Converte o texto digitado em inteiro positivo: ignora '-', '.', letras e zeros à esquerda.
// Campo vazio (ou só zeros) vira 0, e o input mostra vazio quando o valor é 0.
const apenasInteiro = (texto: string, max: number) => {
  const digitos = texto.replace(/\D/g, '');
  return digitos ? Math.min(Number(digitos), max) : 0;
};

interface ConfiguracaoPageProps {
  config: Configuracao;
  setConfig: React.Dispatch<React.SetStateAction<Configuracao>>;
  errosValidacao: Record<string, string>;
  conexaoStatus: { tested: boolean; success: boolean; message: string };
  testandoConn: boolean;
  onTestarConexao: () => void;
  onSalvar: () => void;
}

export const ConfiguracaoPage: React.FC<ConfiguracaoPageProps> = ({
  config,
  setConfig,
  errosValidacao,
  conexaoStatus,
  testandoConn,
  onTestarConexao,
  onSalvar
}) => {
  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <hgroup>
        <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 tracking-wider uppercase block mb-1">Configuração</span>
        <h2 className="text-3xl font-bold font-['Bricolage_Grotesque'] text-slate-900 dark:text-white">
          Prepare seu backup fiscal
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Defina a origem, o destino e as regras de proteção antes de iniciar o processo.
        </p>
      </hgroup>

      <fieldset className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 m-0">
        <header className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400">
            <Database className="w-5 h-5" />
          </span>
          <hgroup>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">Conexão com o banco</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Credenciais do PostgreSQL de gestão fiscal</p>
          </hgroup>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome da conexão</label>
            <input
              type="text"
              placeholder="Ex.: PostgreSQL fiscal"
              value={config.conexaoNome}
              onChange={e => setConfig({ ...config, conexaoNome: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </p>
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Host</label>
            <input
              type="text"
              value={config.host}
              onChange={e => setConfig({ ...config, host: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errosValidacao.host && <span className="text-[11px] text-rose-600 mt-1 block">{errosValidacao.host}</span>}
          </p>
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Porta</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="5432"
              value={config.porta || ''}
              onChange={e => setConfig({ ...config, porta: apenasInteiro(e.target.value, 65535) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errosValidacao.porta && <span className="text-[11px] text-rose-600 mt-1 block">{errosValidacao.porta}</span>}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Banco de dados</label>
            <input
              type="text"
              placeholder="Ex.: gestao_fiscal"
              value={config.database}
              onChange={e => setConfig({ ...config, database: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errosValidacao.database && <span className="text-[11px] text-rose-600 mt-1 block">{errosValidacao.database}</span>}
          </p>
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Usuário</label>
            <input
              type="text"
              value={config.usuario}
              onChange={e => setConfig({ ...config, usuario: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errosValidacao.usuario && <span className="text-[11px] text-rose-600 mt-1 block">{errosValidacao.usuario}</span>}
          </p>
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Senha</label>
            <input
              type="password"
              placeholder="********"
              value={config.senha || ''}
              onChange={e => setConfig({ ...config, senha: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </p>
        </section>

        <menu className="pt-2 flex items-center gap-4 m-0 p-0">
          <button
            type="button"
            onClick={onTestarConexao}
            disabled={testandoConn}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
          >
            {testandoConn ? 'Testando…' : 'Testar conexão'}
          </button>
          {conexaoStatus.tested && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${conexaoStatus.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {conexaoStatus.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {conexaoStatus.message}
            </span>
          )}
        </menu>
      </fieldset>

      <fieldset className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 m-0">
        <header className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400">
            <Folder className="w-5 h-5" />
          </span>
          <hgroup>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">Destino e retenção</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Local dos arquivos e política de armazenamento</p>
          </hgroup>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Caminho de destino *</label>
            <input
              type="text"
              value={config.caminhoDestino}
              onChange={e => setConfig({ ...config, caminhoDestino: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errosValidacao.caminhoDestino && <span className="text-[11px] text-rose-600 mt-1 block">{errosValidacao.caminhoDestino}</span>}
          </p>
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Backups a manter (opcional)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="Ex.: 10"
              value={config.backupsManter || ''}
              onChange={e => setConfig({ ...config, backupsManter: apenasInteiro(e.target.value, 9999) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errosValidacao.backupsManter && <span className="text-[11px] text-rose-600 mt-1 block">{errosValidacao.backupsManter}</span>}
          </p>
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cópia adicional (opcional)</label>
            <input
              type="text"
              placeholder="/copia/seguranca"
              value={config.copiaAdicional || ''}
              onChange={e => setConfig({ ...config, copiaAdicional: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errosValidacao.copiaAdicional && <span className="text-[11px] text-rose-600 mt-1 block">{errosValidacao.copiaAdicional}</span>}
          </p>
        </section>
      </fieldset>

      <fieldset className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 m-0">
        <header className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400">
            <Database className="w-5 h-5" />
          </span>
          <hgroup>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">Manutenção antes do backup</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Escolha uma regra automática ou uma ação manual</p>
          </hgroup>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <p className="m-0">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Modo de manutenção</label>
            <select
              value={config.modoManutencao}
              onChange={e => setConfig({ ...config, modoManutencao: e.target.value as MaintenanceMode })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="Automático">Automático</option>
              <option value="Não executar manutenção">Não executar manutenção</option>
              <option value="VACUUM">VACUUM</option>
              <option value="VACUUM FULL ANALYZE">VACUUM FULL ANALYZE</option>
            </select>
          </p>

          {config.modoManutencao === 'Automático' && (
            <p className="m-0">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Simular última manutenção</label>
              <select
                value={config.ultimaManutencaoSimulada}
                onChange={e => setConfig({ ...config, ultimaManutencaoSimulada: e.target.value as SimulatedLastMaintenance })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="Há 12 dias">Há 12 dias</option>
                <option value="Há 45 dias">Há 45 dias</option>
                <option value="Há 75 dias">Há 75 dias</option>
                <option value="Sem histórico">Sem histórico</option>
              </select>
            </p>
          )}
        </section>
        <DecisionPanel modo={config.modoManutencao} ultimaManutencao={config.ultimaManutencaoSimulada} />
      </fieldset>

      <fieldset className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 m-0">
        <header className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400">
            <Shield className="w-5 h-5" />
          </span>
          <hgroup>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">Proteção do arquivo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Recursos opcionais para proteger o backup</p>
          </hgroup>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 items-start">
          <section className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Criptografar (AES)</span>
              <input
                type="checkbox"
                checked={config.criptografarAES}
                onChange={e => setConfig({ ...config, criptografarAES: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
            </label>
            {config.criptografarAES && (
              <p className="m-0">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Chave AES *</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Senha para criptografar o backup"
                  value={config.chaveAES || ''}
                  onChange={e => setConfig({ ...config, chaveAES: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                {errosValidacao.chaveAES && <span className="text-[11px] text-rose-600 mt-1 block">{errosValidacao.chaveAES}</span>}
                <span className="text-[11px] text-slate-400 mt-1 block">Guarde esta chave: sem ela o backup não pode ser restaurado.</span>
              </p>
            )}
          </section>

          <section className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Compactar (ZIP com senha)</span>
              <input
                type="checkbox"
                checked={config.compactarZIP}
                onChange={e => setConfig({ ...config, compactarZIP: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
            </label>
            {config.compactarZIP && (
              <p className="m-0">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Senha do ZIP *</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Senha para abrir o ZIP"
                  value={config.senhaZIP || ''}
                  onChange={e => setConfig({ ...config, senhaZIP: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                {errosValidacao.senhaZIP && <span className="text-[11px] text-rose-600 mt-1 block">{errosValidacao.senhaZIP}</span>}
                <span className="text-[11px] text-slate-400 mt-1 block">O ZIP usa criptografia AES-256 com esta senha.</span>
              </p>
            )}
          </section>
        </section>
      </fieldset>

      <menu className="flex justify-end pt-4 m-0 p-0">
        <button
          type="button"
          onClick={onSalvar}
          className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs shadow-lg shadow-teal-700/20 transition-all flex items-center gap-2"
        >
          <Play className="w-4 h-4" /> Salvar e ir para a execução
        </button>
      </menu>
    </form>
  );
};
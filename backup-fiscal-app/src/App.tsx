import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { LogViewer } from './components/LogViewer';
import { ConfiguracaoPage } from './pages/ConfiguracaoPage';
import { ExecucaoPage } from './pages/ExecucaoPage';
import { HistoricoPage } from './pages/HistoricoPage';
import { useExecucao } from './hooks/useExecucao';
import { api } from './services/api';
import { Configuracao, Execucao } from './types';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('configuracao');

  // Só host, porta e usuário vêm preenchidos; o resto o usuário digita.
  const [config, setConfig] = useState<Configuracao>({
    conexaoNome: '',
    host: 'localhost',
    porta: 5432,
    database: '',
    usuario: 'postgres',
    senha: '',
    caminhoDestino: '/backups/fiscal',
    backupsManter: 10,
    copiaAdicional: '',
    modoManutencao: 'Automático',
    ultimaManutencaoSimulada: 'Há 45 dias',
    criptografarAES: false,
    chaveAES: '',
    compactarZIP: false,
    senhaZIP: ''
  });

  const [errosValidacao, setErrosValidacao] = useState<Record<string, string>>({});
  const [conexaoStatus, setConexaoStatus] = useState<{ tested: boolean; success: boolean; message: string }>({
    tested: false, success: false, message: ''
  });
  const [testandoConn, setTestandoConn] = useState(false);

  const [historico, setHistorico] = useState<Execucao[]>([]);
  // Histórico: execução aberta para ver os detalhes (null = mostra a lista)
  const [logSelecionado, setLogSelecionado] = useState<Execucao | null>(null);
  // Log da execução: sempre a última execução feita nesta sessão
  const [ultimaExecucao, setUltimaExecucao] = useState<Execucao | null>(null);
  const [simularFalhaEm, setSimularFalhaEm] = useState<string>('Nenhuma etapa');
  const [showVacuumModal, setShowVacuumModal] = useState(false);

  const {
    executando,
    cancelando,
    etapasStatus,
    resultadoFinal,
    logsAtuais,
    iniciarExecucao,
    cancelarExecucao,
    resetar: resetarExecucao
  } = useExecucao();

  useEffect(() => {
    api.carregarHistoricoInicial().then(setHistorico);
  }, []);

  // Mudou host/porta/banco/usuário/senha: o teste de conexão anterior deixa de valer
  useEffect(() => {
    setConexaoStatus({ tested: false, success: false, message: '' });
  }, [config.host, config.porta, config.database, config.usuario, config.senha]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Terminou uma execução e o usuário saiu da tela de execução:
  // zera etapas, log e resultado, e limpa a proteção (AES/ZIP e senhas)
  // para a próxima execução começar do zero.
  useEffect(() => {
    const sobrouAlgo = resultadoFinal !== null || logsAtuais.length > 0;
    if (!executando && abaAtiva !== 'execucao' && sobrouAlgo) {
      resetarExecucao();
      setSimularFalhaEm('Nenhuma etapa');
      setErrosValidacao({});
      setConfig(prev => ({
        ...prev,
        criptografarAES: false,
        chaveAES: '',
        compactarZIP: false,
        senhaZIP: ''
      }));
    }
  }, [executando, abaAtiva, resultadoFinal, logsAtuais.length]);

  const trocarAba = (aba: string) => {
    setLogSelecionado(null); // ao clicar no menu, o Histórico volta para a lista
    setAbaAtiva(aba);
  };

  const validarCampos = () => {
    const errors: Record<string, string> = {};
    if (!config.host.trim()) errors.host = 'Informe o host.';
    if (!config.porta || config.porta > 65535) errors.porta = 'Porta inválida (1 a 65535).';
    if (!config.usuario.trim()) errors.usuario = 'Informe o usuário.';
    if (config.copiaAdicional && /(\.\.|;|\|)/.test(config.copiaAdicional)) {
      errors.copiaAdicional = 'Caminho inválido (contém caracteres proibidos).';
    }
    if (!config.caminhoDestino) errors.caminhoDestino = 'Destino obrigatório.';
    if (!config.database.trim()) {
      errors.database = 'Informe o nome do banco.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(config.database)) {
      errors.database = 'Nome do banco só com letras, números e sublinhado.';
    }
    if (config.caminhoDestino && (config.caminhoDestino.includes('..') || config.caminhoDestino.includes(';') || config.caminhoDestino.includes('|'))) {
      errors.caminhoDestino = 'Caminho inválido (contém caracteres proibidos).';
    }
    // "Backups a manter" é opcional: vazio (0) = sem política de retenção.
    if (config.criptografarAES && (config.chaveAES || '').length < 6) {
      errors.chaveAES = 'Informe a chave AES (mínimo de 6 caracteres).';
    }
    if (config.compactarZIP && (config.senhaZIP || '').length < 6) {
      errors.senhaZIP = 'Informe a senha do ZIP (mínimo de 6 caracteres).';
    }
    setErrosValidacao(errors);
    return Object.keys(errors).length === 0;
  };

  // Remove espaços acidentais (ex.: " 172.23.8.128") dos campos de conexão
  const configLimpa = (): Configuracao => ({
    ...config,
    host: config.host.trim(),
    usuario: config.usuario.trim(),
    database: config.database.trim(),
  });

  const handleTestarConexao = async () => {
    if (!config.database.trim()) {
      setConexaoStatus({ tested: true, success: false, message: 'Informe o nome do banco antes de testar.' });
      return;
    }
    setTestandoConn(true);
    const res = await api.testarConexao(configLimpa());
    setTestandoConn(false);
    setConexaoStatus({ tested: true, success: res.success, message: res.message });
  };

  const handleSalvarEIrParaExecucao = () => {
    if (!validarCampos()) return;
    trocarAba('execucao');
  };

  const calcularAcaoManutencaoAtual = () => {
    if (config.modoManutencao !== 'Automático') return config.modoManutencao;
    switch (config.ultimaManutencaoSimulada) {
      case 'Há 12 dias': return 'Nenhuma manutenção';
      case 'Há 45 dias': return 'VACUUM';
      case 'Há 75 dias':
      case 'Sem histórico': return 'VACUUM FULL ANALYZE';
      default: return 'Nenhuma manutenção';
    }
  };

  const acaoAtualCalculada = calcularAcaoManutencaoAtual();

  const aoFinalizarExecucao = (novaExec: Execucao) => {
    setHistorico(prev => [novaExec, ...prev]);
    setUltimaExecucao(novaExec);
  };

  const handleConfirmarInicioProcesso = () => {
    if (acaoAtualCalculada === 'VACUUM FULL ANALYZE') {
      setShowVacuumModal(true);
    } else {
      iniciarExecucao(configLimpa(), simularFalhaEm, aoFinalizarExecucao);
    }
  };

  const handleExecutarAposModal = () => {
    setShowVacuumModal(false);
    iniciarExecucao(configLimpa(), simularFalhaEm, aoFinalizarExecucao);
  };

  return (
    <section className="flex h-screen bg-[#EEF2F1] dark:bg-slate-950 font-['Instrument_Sans'] overflow-hidden text-slate-800 dark:text-slate-100">
      <Sidebar
        abaAtiva={abaAtiva}
        setAbaAtiva={trocarAba}
        conexaoStatus={conexaoStatus}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="flex-1 overflow-y-auto p-8 lg:p-12">
        <section className="max-w-5xl mx-auto">
          {abaAtiva === 'configuracao' && (
            <ConfiguracaoPage
              config={config}
              setConfig={setConfig}
              errosValidacao={errosValidacao}
              conexaoStatus={conexaoStatus}
              testandoConn={testandoConn}
              onTestarConexao={handleTestarConexao}
              onSalvar={handleSalvarEIrParaExecucao}
            />
          )}

          {abaAtiva === 'execucao' && (
            <ExecucaoPage
              config={config}
              acaoAtualCalculada={acaoAtualCalculada}
              simularFalhaEm={simularFalhaEm}
              setSimularFalhaEm={setSimularFalhaEm}
              executando={executando}
              conexaoStatus={conexaoStatus}
              etapasStatus={etapasStatus}
              resultadoFinal={resultadoFinal}
              logsAtuais={logsAtuais}
              cancelando={cancelando}
              onCancelar={cancelarExecucao}
              onIniciarProcesso={handleConfirmarInicioProcesso}
              onVerLog={() => {
                if (ultimaExecucao) trocarAba('log');
              }}
              showVacuumModal={showVacuumModal}
              setShowVacuumModal={setShowVacuumModal}
              onExecutarAposModal={handleExecutarAposModal}
            />
          )}

          {/* Histórico: lista de todas as execuções; "Ver log" abre os detalhes aqui mesmo */}
          {abaAtiva === 'historico' && !logSelecionado && (
            <HistoricoPage
              historico={historico}
              onVerLog={(exec) => setLogSelecionado(exec)}
            />
          )}

          {abaAtiva === 'historico' && logSelecionado && (
            <LogViewer
              execucao={logSelecionado}
              onVoltar={() => setLogSelecionado(null)}
            />
          )}

          {/* Log da execução: registro técnico da última execução feita */}
          {abaAtiva === 'log' && ultimaExecucao && (
            <LogViewer
              execucao={ultimaExecucao}
              titulo="Log da última execução"
              subtitulo="Registro técnico do backup mais recente executado nesta sessão."
            />
          )}

          {abaAtiva === 'log' && !ultimaExecucao && (
            <section className="space-y-6">
              <hgroup>
                <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 tracking-wider uppercase block mb-1">Log</span>
                <h2 className="text-3xl font-bold font-['Bricolage_Grotesque'] text-slate-900 dark:text-white">
                  Log da execução
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Registro técnico do backup mais recente.
                </p>
              </hgroup>
              <article className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 m-0">
                  Nenhuma execução realizada ainda. Inicie um backup na aba Execução para ver o log aqui.
                </p>
              </article>
            </section>
          )}
        </section>
      </main>
    </section>
  );
}
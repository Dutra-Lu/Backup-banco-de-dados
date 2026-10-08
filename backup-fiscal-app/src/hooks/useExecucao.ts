import { useState, useRef } from 'react';
import { Configuracao, EtapaStatus, Execucao, LogEntry } from '../types';
import { api, ApiError, BackupSnapshot } from '../services/api';

export const ETAPAS_LISTA = [
  'Validação',
  'Manutenção',
  'Geração do backup',
  'Criptografia AES',
  'Compactação ZIP',
  'Retenção',
  'Cópia adicional',
  'Resumo final',
];

type ResultadoFinal = {
  status: 'Sucesso' | 'Falha' | 'Cancelada';
  mensagem: string;
  duracao: string;
};

const formatarDuracao = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
};

const statusInicial = () =>
  Object.fromEntries(ETAPAS_LISTA.map((e) => [e, 'Aguardando'])) as Record<string, EtapaStatus>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useExecucao() {
  const [executando, setExecutando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [etapasStatus, setEtapasStatus] = useState<Record<string, EtapaStatus>>(statusInicial);
  const [etapaAtualIndex, setEtapaAtualIndex] = useState(-1);
  const [resultadoFinal, setResultadoFinal] = useState<ResultadoFinal | null>(null);
  const [logsAtuais, setLogsAtuais] = useState<LogEntry[]>([]);

  const jobIdRef = useRef<string | null>(null);

  const iniciarExecucao = async (
    config: Configuracao,
    simularFalhaEm: string,
    onFinish: (novaExec: Execucao) => void
  ) => {
    setExecutando(true);
    setCancelando(false);
    setResultadoFinal(null);
    setLogsAtuais([]);
    setEtapaAtualIndex(-1);

    const novosStatus: Record<string, EtapaStatus> = {
      'Validação': 'Aguardando',
      'Manutenção': config.modoManutencao === 'Não executar manutenção' ? 'Não habilitada' : 'Aguardando',
      'Geração do backup': 'Aguardando',
      'Criptografia AES': config.criptografarAES ? 'Aguardando' : 'Não habilitada',
      'Compactação ZIP': config.compactarZIP ? 'Aguardando' : 'Não habilitada',
      'Retenção': config.backupsManter > 0 ? 'Aguardando' : 'Não habilitada',
      'Cópia adicional': config.copiaAdicional?.trim() ? 'Aguardando' : 'Não habilitada',
      'Resumo final': 'Aguardando',
    };
    setEtapasStatus(novosStatus);

    const inicio = Date.now();
    const agora = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const tipoDecisao = config.modoManutencao === 'Automático' ? 'Automática' : 'Manual';
    const habilitadas = ETAPAS_LISTA.filter((e) => novosStatus[e] !== 'Não habilitada');

    // Falha de etapa: anteriores concluídas, a falha marcada e as seguintes canceladas
    const marcarFalha = (etapaFalha: string) => {
      const idxFalha = ETAPAS_LISTA.indexOf(etapaFalha);
      setEtapasStatus(() => {
        const n = { ...novosStatus };
        ETAPAS_LISTA.forEach((e, i) => {
          if (n[e] === 'Não habilitada' && e !== etapaFalha) return;
          n[e] = i < idxFalha ? 'Concluída' : i === idxFalha ? 'Falhou' : 'Cancelada';
        });
        return n;
      });
      setEtapaAtualIndex(idxFalha);
    };

    const finalizarComFalha = (etapa: string, mensagem: string, logs: LogEntry[], extra: string) => {
      const duracao = formatarDuracao(Date.now() - inicio);
      const logErro: LogEntry = {
        horario: new Date().toLocaleTimeString('pt-BR'),
        etapa,
        mensagem,
        saidaTecnica: `[ERROR] ${extra}`,
        isError: true,
      };
      const todos = [...logs, logErro];
      marcarFalha(etapa);
      setLogsAtuais(todos);
      setExecutando(false);
      setCancelando(false);
      jobIdRef.current = null;
      setResultadoFinal({ status: 'Falha', mensagem: `A etapa '${etapa}' falhou: ${mensagem}`, duracao });
      onFinish({
        id: Date.now().toString(),
        data: agora(),
        duracao,
        tipoDecisao,
        manutencaoAplicada: config.modoManutencao,
        resultado: 'Falha',
        emailEnviado: true,
        logs: todos,
      });
    };

    // Status de cada etapa a partir do que o backend informou
    const calcularStatus = (snap: BackupSnapshot): Record<string, EtapaStatus> => {
      const n = { ...novosStatus };
      habilitadas.forEach((e) => {
        if (snap.status === 'sucesso' || snap.etapasConcluidas.includes(e)) {
          n[e] = 'Concluída';
        } else if (snap.etapaAtual === e) {
          n[e] =
            snap.status === 'executando' ? 'Em andamento' : snap.status === 'falha' ? 'Falhou' : 'Cancelada';
        } else {
          n[e] = snap.status === 'executando' ? 'Aguardando' : 'Cancelada';
        }
      });
      return n;
    };

    const finalizarPeloBackend = (snap: BackupSnapshot) => {
      setExecutando(false);
      setCancelando(false);
      jobIdRef.current = null;

      const base = {
        id: snap.id,
        data: snap.data,
        duracao: snap.duracao,
        tipoDecisao: snap.tipoDecisao,
        manutencaoAplicada: snap.manutencaoAplicada,
        logs: snap.logs,
      };

      if (snap.status === 'sucesso') {
        setResultadoFinal({
          status: 'Sucesso',
          mensagem: `Backup do banco '${config.database}' gerado com sucesso em ${snap.arquivoFinal ?? config.caminhoDestino}.`,
          duracao: snap.duracao,
        });
        onFinish({ ...base, resultado: 'Sucesso' });
      } else if (snap.status === 'cancelada') {
        setResultadoFinal({ status: 'Cancelada', mensagem: snap.mensagem, duracao: snap.duracao });
        onFinish({ ...base, resultado: 'Cancelada' });
      } else {
        setResultadoFinal({
          status: 'Falha',
          mensagem: `A etapa '${snap.etapaAtual ?? 'Validação'}' falhou: ${snap.mensagem}`,
          duracao: snap.duracao,
        });
        onFinish({ ...base, resultado: 'Falha', emailEnviado: true });
      }
    };

    // Falha simulada (teste do fluxo de erro): não chama o backend
    if (simularFalhaEm && simularFalhaEm !== 'Nenhuma etapa') {
      setTimeout(() => {
        finalizarComFalha(
          simularFalhaEm,
          `Falha crítica simulada na etapa ${simularFalhaEm}.`,
          [],
          `Processo interrompido na etapa ${simularFalhaEm}. Código de saída 1.`
        );
      }, 800);
      return;
    }

    // Execução real: inicia no backend e acompanha o progresso
    let jobId: string;
    try {
      ({ jobId } = await api.iniciarBackup(config));
      jobIdRef.current = jobId;
    } catch (e) {
      finalizarComFalha('Validação', (e as ApiError).message, [], (e as ApiError).message);
      return;
    }

    let etapaAtualLocal = 'Validação';
    let falhasRede = 0;
    let ultimosLogs: LogEntry[] = [];

    while (true) {
      await sleep(700);
      try {
        const snap = await api.consultarBackup(jobId);
        falhasRede = 0;
        if (snap.etapaAtual) etapaAtualLocal = snap.etapaAtual;
        ultimosLogs = snap.logs;

        setLogsAtuais((prev) => (prev.length === snap.logs.length ? prev : snap.logs));
        setEtapasStatus(calcularStatus(snap));
        setEtapaAtualIndex(snap.etapaAtual ? ETAPAS_LISTA.indexOf(snap.etapaAtual) : -1);

        if (snap.status !== 'executando') {
          finalizarPeloBackend(snap);
          return;
        }
      } catch (e) {
        falhasRede++;
        if (falhasRede >= 5) {
          const msg = (e as ApiError).message || 'Conexão com o backend perdida.';
          finalizarComFalha(etapaAtualLocal, msg, ultimosLogs, msg);
          return;
        }
      }
    }
  };

  // Pede ao backend para parar; a tela atualiza quando o backend confirmar
  const cancelarExecucao = async () => {
    const jobId = jobIdRef.current;
    if (!jobId || cancelando) return;
    setCancelando(true);
    try {
      const res = await api.cancelarBackup(jobId);
      if (!res.ok) setCancelando(false);
    } catch {
      setCancelando(false);
    }
  };

  // Volta a tela de execução ao estado inicial (só deve ser chamada com nada em andamento)
  const resetar = () => {
    setExecutando(false);
    setCancelando(false);
    setEtapasStatus(statusInicial());
    setEtapaAtualIndex(-1);
    setResultadoFinal(null);
    setLogsAtuais([]);
    jobIdRef.current = null;
  };

  return {
    executando,
    cancelando,
    etapasStatus,
    etapaAtualIndex,
    resultadoFinal,
    logsAtuais,
    iniciarExecucao,
    cancelarExecucao,
    resetar,
  };
}
import { Configuracao, Execucao, LogEntry } from '../types';

const API_URL = 'http://localhost:8000';

export class ApiError extends Error {
  etapa?: string;
  logs: LogEntry[];
  constructor(message: string, etapa?: string, logs: LogEntry[] = []) {
    super(message);
    this.etapa = etapa;
    this.logs = logs;
  }
}

export interface BackupSnapshot {
  id: string;
  status: 'executando' | 'sucesso' | 'falha' | 'cancelada';
  etapaAtual: string | null;
  etapasConcluidas: string[];
  logs: LogEntry[];
  mensagem: string;
  duracao: string;
  data: string;
  tipoDecisao: 'Automática' | 'Manual';
  manutencaoAplicada: string;
  arquivoFinal: string | null;
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`Não foi possível conectar ao backend em ${API_URL}. Ele está rodando?`);
  }

  if (!res.ok) {
    const corpo = await res.json().catch(() => ({}));
    const detail = corpo?.detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      throw new ApiError(detail.mensagem ?? 'Erro no backend', detail.etapa, detail.logs ?? []);
    }
    if (Array.isArray(detail)) {
      // erro 422 do FastAPI: campos que não batem com o ConfiguracaoModel
      const campos = detail.map((d: any) => d.loc?.slice(1).join('.')).join(', ');
      throw new ApiError(`Dados inválidos enviados ao backend (campos: ${campos}).`);
    }
    throw new ApiError(typeof detail === 'string' ? detail : `Erro ${res.status} no backend`);
  }
  return res.json();
}

export const api = {
  async testarConexao(config: Configuracao): Promise<{ success: boolean; message: string }> {
    try {
      return await request('POST', '/api/testar-conexao', config);
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  },

  // Inicia o backup em segundo plano e devolve o id para acompanhar
  async iniciarBackup(config: Configuracao): Promise<{ jobId: string }> {
    return request('POST', '/api/executar-backup', config);
  },

  // Progresso, etapas e log da execução (chamado de tempos em tempos)
  async consultarBackup(jobId: string): Promise<BackupSnapshot> {
    return request('GET', `/api/execucao/${jobId}`);
  },

  async cancelarBackup(jobId: string): Promise<{ ok: boolean; mensagem: string }> {
    return request('POST', `/api/execucao/${jobId}/cancelar`, {});
  },

  // Histórico real: vem do backend (arquivo historico.json ao lado do main.py)
  async carregarHistoricoInicial(): Promise<Execucao[]> {
    try {
      return await request<Execucao[]>('GET', '/api/historico');
    } catch {
      return [];
    }
  },
};
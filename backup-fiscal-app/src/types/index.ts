export type MaintenanceMode = 'Automático' | 'Não executar manutenção' | 'VACUUM' | 'VACUUM FULL ANALYZE';
export type SimulatedLastMaintenance = 'Há 12 dias' | 'Há 45 dias' | 'Há 75 dias' | 'Sem histórico';

export interface Configuracao {
  conexaoNome: string;
  host: string;
  porta: number;
  database: string;
  usuario: string;
  senha?: string;
  caminhoDestino: string;
  backupsManter: number;
  copiaAdicional?: string;
  modoManutencao: MaintenanceMode;
  ultimaManutencaoSimulada: SimulatedLastMaintenance;
  criptografarAES: boolean;
  chaveAES?: string;
  compactarZIP: boolean;
  senhaZIP?: string;
}

export type EtapaStatus = 'Aguardando' | 'Em andamento' | 'Concluída' | 'Falhou' | 'Não habilitada' | 'Cancelada';

export interface LogEntry {
  horario: string;
  etapa: string;
  mensagem: string;
  saidaTecnica: string;
  isError?: boolean;
}

export interface Execucao {
  id: string;
  data: string;
  duracao: string;
  tipoDecisao: 'Automática' | 'Manual';
  manutencaoAplicada: string;
  resultado: 'Sucesso' | 'Falha' | 'Cancelada';
  logs: LogEntry[];
  emailEnviado?: boolean;
}

export interface ExecucaoRequest {
  configuracao: Configuracao;
}

export interface ExecucaoResponse {
  status: 'Sucesso' | 'Falha';
  regraAplicada: string;
  mensagem: string;
  arquivoGerado?: string;
  tamanhoBytes?: number;
  logs: LogEntry[];
}

export interface TesteConexaoResponse {
  sucesso: boolean;
  mensagem: string;
}
import React from 'react';
import { Database, Settings, Play, History, FileText, Moon, Sun } from 'lucide-react';

interface SidebarProps {
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
  conexaoStatus: { tested: boolean; success: boolean; message: string };
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  abaAtiva,
  setAbaAtiva,
  conexaoStatus,
  darkMode,
  setDarkMode
}) => {
  const itens = [
    { id: 'configuracao', label: 'Configuração', icon: Settings },
    { id: 'execucao', label: 'Execução', icon: Play },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'log', label: 'Log da execução', icon: FileText }
  ];

  return (
    <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-6 shrink-0 shadow-sm">
      <section>
        <header className="flex items-center gap-3 mb-8">
          <span className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-md shadow-teal-700/25">
            <Database className="w-5 h-5" />
          </span>
          <hgroup>
            <h1 className="font-bold text-slate-900 dark:text-white font-['Bricolage_Grotesque'] text-base leading-tight">
              Backup Fiscal
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">PostgreSQL</p>
          </hgroup>
        </header>

        <nav className="space-y-1" aria-label="Navegação Principal">
          {itens.map((item) => {
            const Icon = item.icon;
            const isActive = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAbaAtiva(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-100/70 text-teal-900 dark:bg-teal-950/50 dark:text-teal-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </section>

      <footer className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <section className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Modo escuro</span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            aria-label="Alternar modo escuro"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </section>

        <section>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Estado da conexão
          </span>
          <p className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                !conexaoStatus.tested
                  ? 'bg-slate-400'
                  : conexaoStatus.success
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {!conexaoStatus.tested
                ? 'Não testada'
                : conexaoStatus.success
                ? 'Conexão estabelecida'
                : 'Falha na conexão'}
            </span>
          </p>
        </section>
      </footer>
    </aside>
  );
};
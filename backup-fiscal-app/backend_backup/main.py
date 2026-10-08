import json
import os
import re
import shutil
import subprocess
import threading
import uuid
from datetime import datetime
from pathlib import Path

import pyzipper
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

# Caminho preferido do pg_dump. Se não existir, tenta achar no PATH.
PG_DUMP = r"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
AES_MAGIC = b"BKFAES01"  # cabeçalho dos arquivos .enc (usado por descriptografar.py)
NOME_BANCO_RE = re.compile(r"[A-Za-z0-9_]+")
HISTORICO_ARQ = Path(__file__).parent / "historico.json"  # histórico persistido (sobrevive a reinício)
HISTORICO_MAX = 200

app = FastAPI(title="API Backup Fiscal", description="Backend para gestão de backup e manutenção")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConfiguracaoModel(BaseModel):
    conexaoNome: str
    host: str
    porta: int
    database: str
    usuario: str
    senha: str | None = None
    caminhoDestino: str
    backupsManter: int
    modoManutencao: str
    ultimaManutencaoSimulada: str
    criptografarAES: bool
    compactarZIP: bool
    chaveAES: str | None = None
    senhaZIP: str | None = None
    copiaAdicional: str | None = None


class Cancelado(Exception):
    """Levantada quando o usuário pede para parar o backup."""


# ---------------------------------------------------------------------------
# Execuções em andamento (ficam só em memória: reiniciar o uvicorn apaga tudo)
# ---------------------------------------------------------------------------
JOBS: dict[str, dict] = {}
JOBS_LOCK = threading.Lock()
HISTORICO_LOCK = threading.Lock()


def formatar_duracao(seg: int) -> str:
    return f"{seg // 60}min {seg % 60:02d}s" if seg >= 60 else f"{seg}s"


def tamanho_legivel(caminho: Path) -> str:
    tam = float(caminho.stat().st_size)
    for unidade in ("B", "KB", "MB", "GB"):
        if tam < 1024 or unidade == "GB":
            return f"{tam:.0f} {unidade}" if unidade == "B" else f"{tam:.1f} {unidade}"
        tam /= 1024
    return ""


def registrar(job: dict, etapa: str, mensagem: str, saida: str, erro: bool = False):
    job["logs"].append({
        "horario": datetime.now().strftime("%H:%M:%S"),
        "etapa": etapa,
        "mensagem": mensagem,
        "saidaTecnica": saida,
        "isError": erro,
    })


def ler_historico() -> list:
    try:
        return json.loads(HISTORICO_ARQ.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


def salvar_historico(job: dict, status: str):
    """Grava a execução no historico.json. Falha ao gravar não derruba o backup."""
    try:
        snap = snapshot(job)
        entrada = {
            "id": snap["id"],
            "data": snap["data"],
            "duracao": snap["duracao"],
            "tipoDecisao": snap["tipoDecisao"],
            "manutencaoAplicada": snap["manutencaoAplicada"],
            "resultado": {"sucesso": "Sucesso", "falha": "Falha", "cancelada": "Cancelada"}[status],
            "logs": snap["logs"],
            "emailEnviado": status == "falha",
        }
        with HISTORICO_LOCK:
            itens = ler_historico()
            itens.insert(0, entrada)
            HISTORICO_ARQ.write_text(
                json.dumps(itens[:HISTORICO_MAX], ensure_ascii=False, indent=2), encoding="utf-8"
            )
    except Exception:
        pass


def finalizar(job: dict, status: str, mensagem: str):
    job["mensagem"] = mensagem
    job["proc"] = None
    job["raw_conn"] = None
    job["fim"] = datetime.now()
    salvar_historico(job, status)
    job["status"] = status  # por último: quem consulta só vê "terminou" com tudo pronto


def limpar_parciais(job: dict):
    for parte in job["partes"]:
        try:
            parte.unlink(missing_ok=True)
        except OSError:
            pass


def snapshot(job: dict) -> dict:
    fim = job["fim"] or datetime.now()
    return {
        "id": job["id"],
        "status": job["status"],
        "etapaAtual": job["etapaAtual"],
        "etapasConcluidas": list(job["etapasConcluidas"]),
        "logs": list(job["logs"]),
        "mensagem": job["mensagem"],
        "duracao": formatar_duracao(int((fim - job["inicio"]).total_seconds())),
        "data": job["inicio"].strftime("%d/%m/%Y %H:%M"),
        "tipoDecisao": job["tipoDecisao"],
        "manutencaoAplicada": job["manutencaoAplicada"],
        "arquivoFinal": job["arquivoFinal"],
    }


# ---------------------------------------------------------------------------
# Etapas do backup
# ---------------------------------------------------------------------------
def montar_engine(config: ConfiguracaoModel):
    url = URL.create(
        "postgresql+psycopg2",
        username=config.usuario,
        password=config.senha or "",
        host=config.host,
        port=config.porta,
        database=config.database,
    )
    return create_engine(url)


def executar_manutencao(job: dict, config: ConfiguracaoModel, comando: str):
    eng = montar_engine(config)
    try:
        # VACUUM não pode rodar dentro de transação
        with eng.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            job["raw_conn"] = conn.connection.driver_connection  # permite cancelar a consulta
            conn.execute(text(comando))
    finally:
        job["raw_conn"] = None
        eng.dispose()


def localizar_pg_dump() -> str:
    if Path(PG_DUMP).exists():
        return PG_DUMP
    achado = shutil.which("pg_dump")
    if achado:
        return achado
    raise RuntimeError(
        f"pg_dump não encontrado em {PG_DUMP} nem no PATH. Ajuste a constante PG_DUMP no main.py."
    )


def gerar_dump(job: dict, config: ConfiguracaoModel, destino: Path) -> Path:
    exe = localizar_pg_dump()
    destino.mkdir(parents=True, exist_ok=True)
    carimbo = datetime.now().strftime("%Y%m%d_%H%M%S")
    arquivo = destino / f"backup_{config.database}_{carimbo}.sql"
    job["partes"].append(arquivo)

    env = os.environ.copy()
    env["PGPASSWORD"] = config.senha or ""

    proc = subprocess.Popen(
        [
            exe,
            "-w",  # nunca pedir senha no terminal (travaria o processo)
            "-h", config.host,
            "-p", str(config.porta),
            "-U", config.usuario,
            "-d", config.database,
            "-f", str(arquivo),
        ],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        encoding="utf-8",
        errors="replace",
    )
    job["proc"] = proc

    while True:
        try:
            _, err = proc.communicate(timeout=0.5)
            break
        except subprocess.TimeoutExpired:
            if job["cancel"].is_set():
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()
                raise Cancelado()

    job["proc"] = None
    if proc.returncode != 0:
        raise RuntimeError(f"pg_dump falhou: {(err or '').strip()}")
    return arquivo


def criptografar_aes(job: dict, origem: Path, chave: str) -> Path:
    """AES-256-GCM em blocos. Formato: MAGIC(8) + salt(16) + nonce(12) + dados + tag(16)."""
    salt = os.urandom(16)
    nonce = os.urandom(12)
    key = Scrypt(salt=salt, length=32, n=2**15, r=8, p=1).derive(chave.encode("utf-8"))
    enc = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()

    destino = origem.with_name(origem.name + ".enc")
    job["partes"].append(destino)
    with open(origem, "rb") as fin, open(destino, "wb") as fout:
        fout.write(AES_MAGIC + salt + nonce)
        while True:
            bloco = fin.read(1024 * 1024)
            if not bloco:
                break
            if job["cancel"].is_set():
                raise Cancelado()
            fout.write(enc.update(bloco))
        fout.write(enc.finalize())
        fout.write(enc.tag)
    origem.unlink()
    return destino


def compactar(job: dict, arquivo: Path, senha: str) -> Path:
    base = arquivo.name.split(".")[0]
    zip_path = arquivo.parent / f"{base}.zip"
    job["partes"].append(zip_path)
    with pyzipper.AESZipFile(
        zip_path, "w", compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES
    ) as zf:
        zf.setpassword(senha.encode("utf-8"))
        zf.write(arquivo, arcname=arquivo.name)
    if job["cancel"].is_set():
        raise Cancelado()
    arquivo.unlink()
    return zip_path


def aplicar_retencao(destino: Path, manter: int, database: str) -> int:
    # só arquivos deste banco (evita apagar backups de "fiscal_teste" ao limpar "fiscal")
    padrao = re.compile(rf"backup_{re.escape(database)}_\d{{8}}_\d{{6}}\..+")
    arquivos = sorted(
        (p for p in destino.iterdir() if p.is_file() and padrao.fullmatch(p.name)),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    removidos = 0
    for antigo in arquivos[manter:]:
        antigo.unlink()
        removidos += 1
    return removidos


def rodar_backup(job: dict, config: ConfiguracaoModel):
    def iniciar(etapa: str, mensagem: str):
        # depois que o arquivo final está pronto, o cancelamento não faz mais sentido
        if job["cancel"].is_set() and not job["arquivoPronto"]:
            raise Cancelado()
        job["etapaAtual"] = etapa
        registrar(job, etapa, mensagem, "[..] em andamento")

    def concluir(etapa: str, mensagem: str, saida: str):
        registrar(job, etapa, mensagem, saida)
        job["etapasConcluidas"].append(etapa)

    try:
        destino = Path(config.caminhoDestino)

        # 1. Validação --------------------------------------------------------
        iniciar("Validação", "Validando credenciais, conexão e caminhos...")
        if not NOME_BANCO_RE.fullmatch(config.database):
            raise RuntimeError("Nome do banco inválido: use só letras, números e sublinhado.")
        if config.criptografarAES and not (config.chaveAES or "").strip():
            raise RuntimeError("Criptografia AES ligada, mas a chave AES não foi informada.")
        if config.compactarZIP and not (config.senhaZIP or "").strip():
            raise RuntimeError("Compactação ZIP ligada, mas a senha do ZIP não foi informada.")
        eng = montar_engine(config)
        try:
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
        finally:
            eng.dispose()
        destino.mkdir(parents=True, exist_ok=True)
        concluir("Validação", "Parâmetros e caminhos validados.",
                 f"[OK] Conectado a {config.database} em {config.host}")

        # 2. Manutenção -------------------------------------------------------
        if config.modoManutencao == "Automático":
            sim = config.ultimaManutencaoSimulada
            if sim == "Há 12 dias":
                aplicada, comando = "Nenhuma manutenção (Menos de 30 dias)", None
            elif sim == "Há 45 dias":
                aplicada, comando = "VACUUM (Entre 30 e 60 dias)", "VACUUM"
            else:
                aplicada, comando = "VACUUM FULL ANALYZE (Acima de 60 dias / Sem histórico)", "VACUUM FULL ANALYZE"
        else:
            aplicada = config.modoManutencao
            comando = config.modoManutencao if config.modoManutencao in ("VACUUM", "VACUUM FULL ANALYZE") else None
        job["manutencaoAplicada"] = aplicada

        if config.modoManutencao != "Não executar manutenção":
            iniciar("Manutenção", f"Decisão: {aplicada}. {'Executando ' + comando + '...' if comando else 'Nada a executar.'}")
            if comando:
                executar_manutencao(job, config, comando)
            concluir("Manutenção", f"Decisão aplicada: {aplicada}", f"[SQL] {comando or 'Nada executado'}")

        # 3. Backup -----------------------------------------------------------
        iniciar("Geração do backup", "Executando pg_dump...")
        arquivo = gerar_dump(job, config, destino)
        concluir("Geração do backup", "Backup gerado via pg_dump.",
                 f"[OK] {arquivo} ({tamanho_legivel(arquivo)})")

        # 4. Criptografia AES -------------------------------------------------
        if config.criptografarAES:
            iniciar("Criptografia AES", "Criptografando o arquivo (AES-256-GCM)...")
            arquivo = criptografar_aes(job, arquivo, config.chaveAES)
            concluir("Criptografia AES", "Arquivo criptografado com a chave informada.",
                     f"[OK] AES-256-GCM: {arquivo.name} ({tamanho_legivel(arquivo)})")

        # 5. ZIP com senha ----------------------------------------------------
        if config.compactarZIP:
            iniciar("Compactação ZIP", "Compactando com senha (AES-256)...")
            arquivo = compactar(job, arquivo, config.senhaZIP)
            concluir("Compactação ZIP", "Arquivo compactado e protegido por senha.",
                     f"[OK] {arquivo} ({tamanho_legivel(arquivo)})")

        job["arquivoPronto"] = True
        job["arquivoFinal"] = str(arquivo)

        # 6. Retenção ---------------------------------------------------------
        if config.backupsManter > 0:
            iniciar("Retenção", f"Aplicando política de retenção (manter {config.backupsManter})...")
            removidos = aplicar_retencao(destino, config.backupsManter, config.database)
            concluir("Retenção", f"Mantendo os últimos {config.backupsManter} backups.",
                     f"[OK] {removidos} arquivo(s) antigo(s) removido(s)")

        # 7. Cópia adicional --------------------------------------------------
        if (config.copiaAdicional or "").strip():
            iniciar("Cópia adicional", f"Copiando para {config.copiaAdicional}...")
            destino_extra = Path(config.copiaAdicional)
            destino_extra.mkdir(parents=True, exist_ok=True)
            copia = shutil.copy2(arquivo, destino_extra / arquivo.name)
            concluir("Cópia adicional", "Cópia adicional enviada.", f"[OK] {copia}")

        # 8. Resumo final -----------------------------------------------------
        iniciar("Resumo final", "Consolidando o resultado...")
        seg = int((datetime.now() - job["inicio"]).total_seconds())
        concluir("Resumo final", "Backup concluído com sucesso.",
                 f"[OK] {arquivo} | {tamanho_legivel(arquivo)} | {formatar_duracao(seg)}")
        finalizar(job, "sucesso", "Backup concluído com sucesso.")

    except Cancelado:
        limpar_parciais(job)
        registrar(job, job["etapaAtual"] or "Validação", "Backup cancelado pelo usuário.",
                  "[CANCELADO] Arquivos parciais removidos.", True)
        finalizar(job, "cancelada", "Backup cancelado pelo usuário. Arquivos parciais foram removidos.")

    except UnicodeDecodeError:
        msg = "Falha ao conectar: usuário/senha incorretos ou banco inexistente."
        limpar_parciais(job)
        registrar(job, job["etapaAtual"] or "Validação", msg, f"[ERROR] {msg}", True)
        finalizar(job, "falha", msg)

    except Exception as e:
        # cancelar uma consulta (VACUUM) no meio também gera exceção: trata como cancelamento
        if job["cancel"].is_set() and not job["arquivoPronto"]:
            limpar_parciais(job)
            registrar(job, job["etapaAtual"] or "Validação", "Backup cancelado pelo usuário.",
                      "[CANCELADO] Consulta interrompida no banco.", True)
            finalizar(job, "cancelada", "Backup cancelado pelo usuário. Arquivos parciais foram removidos.")
        else:
            if not job["arquivoPronto"]:
                limpar_parciais(job)
            registrar(job, job["etapaAtual"] or "Validação", str(e), f"[ERROR] {e}", True)
            finalizar(job, "falha", str(e))


# ---------------------------------------------------------------------------
# Rotas
# ---------------------------------------------------------------------------
@app.post("/api/testar-conexao")
def testar_conexao(config: ConfiguracaoModel):
    try:
        eng = montar_engine(config)
        try:
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
        finally:
            eng.dispose()
        return {"success": True, "message": "Conexão com o PostgreSQL estabelecida com sucesso!"}
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Falha ao conectar: usuário/senha incorretos ou banco inexistente.",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao conectar ao banco: {e}")


@app.post("/api/executar-backup")
def executar_backup(config: ConfiguracaoModel):
    """Inicia o backup em segundo plano e devolve o id para acompanhar o progresso."""
    with JOBS_LOCK:
        if any(j["status"] == "executando" for j in JOBS.values()):
            raise HTTPException(
                status_code=409,
                detail="Já existe um backup em execução. Aguarde ou pare o atual antes de iniciar outro.",
            )
        job_id = uuid.uuid4().hex[:12]
        job = {
            "id": job_id,
            "status": "executando",
            "etapaAtual": None,
            "etapasConcluidas": [],
            "logs": [],
            "mensagem": "",
            "inicio": datetime.now(),
            "fim": None,
            "tipoDecisao": "Automática" if config.modoManutencao == "Automático" else "Manual",
            "manutencaoAplicada": config.modoManutencao,
            "arquivoFinal": None,
            "arquivoPronto": False,
            "partes": [],
            "cancel": threading.Event(),
            "proc": None,
            "raw_conn": None,
        }
        JOBS[job_id] = job
        # guarda só as 20 execuções mais recentes
        for antigo in list(JOBS)[:-20]:
            if JOBS[antigo]["status"] != "executando":
                del JOBS[antigo]

    threading.Thread(target=rodar_backup, args=(job, config), daemon=True).start()
    return {"jobId": job_id}


@app.get("/api/execucao/{job_id}")
def consultar_execucao(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Execução não encontrada (o backend foi reiniciado?).")
    return snapshot(job)


@app.post("/api/execucao/{job_id}/cancelar")
def cancelar_execucao(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Execução não encontrada.")
    if job["status"] != "executando":
        return {"ok": False, "mensagem": "A execução já terminou."}
    if job["arquivoPronto"]:
        return {"ok": False, "mensagem": "O arquivo de backup já foi gerado; só faltam as etapas finais."}

    job["cancel"].set()
    raw = job.get("raw_conn")
    if raw is not None:
        try:
            raw.cancel()  # interrompe VACUUM em andamento
        except Exception:
            pass
    return {"ok": True, "mensagem": "Cancelamento solicitado."}


@app.get("/api/historico")
def listar_historico():
    with HISTORICO_LOCK:
        return ler_historico()
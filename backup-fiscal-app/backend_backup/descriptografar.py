"""Descriptografa um backup gerado pela etapa "Criptografia AES".

Uso:
    python descriptografar.py backup_Projeto_bk_20260930_180022.sql.enc

Se o backup também estava em ZIP, extraia o ZIP antes (com a senha do ZIP).
O arquivo .sql resultante fica na mesma pasta.
"""
import getpass
import sys
from pathlib import Path

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

AES_MAGIC = b"BKFAES01"  # tem que ser idêntico ao AES_MAGIC do main.py
CABECALHO = len(AES_MAGIC) + 16 + 12  # magic + salt + nonce
TAG = 16


def main():
    if len(sys.argv) != 2:
        print("Uso: python descriptografar.py arquivo.sql.enc")
        sys.exit(1)

    origem = Path(sys.argv[1])
    if not origem.exists():
        print(f"Arquivo não encontrado: {origem}")
        sys.exit(1)

    chave = getpass.getpass("Chave AES: ")
    tamanho = origem.stat().st_size

    with open(origem, "rb") as fin:
        cab = fin.read(CABECALHO)
        if cab[: len(AES_MAGIC)] != AES_MAGIC:
            print("Este arquivo não foi gerado pelo sistema de backup (cabeçalho inválido).")
            sys.exit(1)
        salt = cab[len(AES_MAGIC): len(AES_MAGIC) + 16]
        nonce = cab[len(AES_MAGIC) + 16:]

        fin.seek(tamanho - TAG)
        tag = fin.read(TAG)
        fin.seek(CABECALHO)

        key = Scrypt(salt=salt, length=32, n=2**15, r=8, p=1).derive(chave.encode("utf-8"))
        dec = Cipher(algorithms.AES(key), modes.GCM(nonce)).decryptor()

        destino = origem.with_suffix("")  # remove o ".enc"
        parcial = destino.with_name(destino.name + ".parcial")
        restante = tamanho - CABECALHO - TAG
        try:
            with open(parcial, "wb") as fout:
                while restante > 0:
                    bloco = fin.read(min(1024 * 1024, restante))
                    restante -= len(bloco)
                    fout.write(dec.update(bloco))
                dec.finalize_with_tag(tag)
            parcial.replace(destino)  # só vira .sql se a chave estava certa
        except InvalidTag:
            parcial.unlink(missing_ok=True)
            print("Chave incorreta ou arquivo corrompido.")
            sys.exit(1)

    print(f"Arquivo restaurado em: {destino}")


if __name__ == "__main__":
    main()
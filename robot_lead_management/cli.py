"""CLI central da aplicação Robot Lead Management."""

from __future__ import annotations

import argparse
import sys
from collections.abc import Callable


def _delegar(nome_comando: str, argumentos: list[str], funcao: Callable[[], int]) -> int:
    """Executa um comando legado preservando os argumentos esperados por ele."""

    sys.argv = [f"robot-leads {nome_comando}", *argumentos]
    return funcao()


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)

    parser = argparse.ArgumentParser(
        prog="robot-leads",
        description="Aplicação para buscar leads, manter base master e preparar abordagem manual via WhatsApp.",
    )
    subparsers = parser.add_subparsers(dest="comando")

    subparsers.add_parser(
        "buscar",
        help="Busca avulsa por cidade e segmento. Ex.: robot-leads buscar --cidade ... --segmento ...",
        add_help=False,
    )
    subparsers.add_parser(
        "buscar-planilha",
        help="Executa lotes a partir de uma planilha de cidades/segmentos.",
        add_help=False,
    )
    subparsers.add_parser(
        "preparar-whatsapp",
        help="Gera a planilha de abordagem manual para empresas sem site.",
        add_help=False,
    )

    if not argv or argv[0] in {"-h", "--help"}:
        parser.print_help()
        return 0

    comando = argv[0]
    resto = argv[1:]

    if comando == "buscar":
        from robot_lead_management.buscar_leads import main as buscar_main

        return _delegar(comando, resto, buscar_main)

    if comando == "buscar-planilha":
        from robot_lead_management.buscar_leads_planilha import main as buscar_planilha_main

        return _delegar(comando, resto, buscar_planilha_main)

    if comando == "preparar-whatsapp":
        from robot_lead_management.preparar_abordagem_whatsapp import executar

        return _delegar(comando, resto, executar)

    parser.print_help()
    print(f"\nComando desconhecido: {comando}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

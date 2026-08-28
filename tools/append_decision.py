#!/usr/bin/env python3
"""Append a structured decision directly to DECISIONI.md without temporary files."""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path


REQUIRED_FIELDS = (
    "ID",
    "Data",
    "Stato",
    "Area",
    "Titolo",
    "Decisione",
    "Motivazione",
    "Impatto",
    "Follow-up",
    "File coinvolti",
)
ALLOWED_STATUSES = {"accettata", "sostituita", "annullata"}
ID_PATTERN = re.compile(r"D-\d{4}$")


def fail(message: str) -> None:
    print(f"Errore: {message}", file=sys.stderr)
    raise SystemExit(1)


def get_next_id(log_text: str) -> str:
    matches = re.findall(r"^## D-(\d{4}) —", log_text, flags=re.MULTILINE)
    if not matches:
        return "D-0001"
    highest_num = max(int(m) for m in matches)
    return f"D-{highest_num + 1:04d}"


def render_entry(entry: dict[str, str]) -> str:
    return (
        f"\n## {entry['ID']} — {entry['Titolo']}\n\n"
        f"- **Data:** {entry['Data']}\n"
        f"- **Stato:** {entry['Stato']}\n"
        f"- **Area:** {entry['Area']}\n"
        f"- **Decisione:** {entry['Decisione']}\n"
        f"- **Motivazione:** {entry['Motivazione']}\n"
        f"- **Impatto:** {entry['Impatto']}\n"
        f"- **Follow-up:** {entry['Follow-up']}\n"
        f"- **File coinvolti:** {entry['File coinvolti']}\n"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Aggiunge una nuova decisione a DECISIONI.md direttamente da riga di comando."
    )
    parser.add_argument(
        "--id",
        type=str,
        help="ID della decisione (es. D-0006). Se omesso, viene calcolato automaticamente.",
    )
    parser.add_argument(
        "--data",
        type=str,
        help="Data in formato YYYY-MM-DD. Se omessa, usa la data odierna.",
    )
    parser.add_argument(
        "--stato",
        type=str,
        default="accettata",
        choices=sorted(ALLOWED_STATUSES),
        help="Stato della decisione (default: accettata).",
    )
    parser.add_argument(
        "--area",
        type=str,
        required=True,
        help="Area della decisione (es. governance, architettura, ecc.).",
    )
    parser.add_argument(
        "--titolo",
        type=str,
        required=True,
        help="Titolo breve della decisione.",
    )
    parser.add_argument(
        "--decisione",
        type=str,
        required=True,
        help="Descrizione di cosa viene adottato o modificato.",
    )
    parser.add_argument(
        "--motivazione",
        type=str,
        required=True,
        help="Motivazione della scelta.",
    )
    parser.add_argument(
        "--impatto",
        type=str,
        required=True,
        help="Effetti tecnici o sul flusso utente.",
    )
    parser.add_argument(
        "--follow-up",
        "--followup",
        dest="follow_up",
        type=str,
        required=True,
        help="Prossimo controllo, vincolo o 'nessuno'.",
    )
    parser.add_argument(
        "--file-coinvolti",
        "--files",
        dest="file_coinvolti",
        type=str,
        required=True,
        help="Elenco dei file coinvolti separati da virgola.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    repository_root = Path(__file__).resolve().parents[1]
    decision_log = repository_root / "DECISIONI.md"
    if not decision_log.is_file():
        fail(f"registro non trovato: {decision_log}")

    log_text = decision_log.read_text(encoding="utf-8")

    decision_id = args.id
    if decision_id:
        if not ID_PATTERN.fullmatch(decision_id):
            fail("l'ID deve avere il formato D-0001")
    else:
        decision_id = get_next_id(log_text)

    if re.search(rf"^## {re.escape(decision_id)} —", log_text, flags=re.MULTILINE):
        fail(f"l'ID {decision_id} e' gia' presente in DECISIONI.md")

    decision_data = args.data or date.today().isoformat()
    try:
        date.fromisoformat(decision_data)
    except ValueError:
        fail("la data deve avere il formato YYYY-MM-DD ed essere valida")

    entry = {
        "ID": decision_id,
        "Data": decision_data,
        "Stato": args.stato,
        "Area": args.area.strip(),
        "Titolo": args.titolo.strip(),
        "Decisione": args.decisione.strip(),
        "Motivazione": args.motivazione.strip(),
        "Impatto": args.impatto.strip(),
        "Follow-up": args.follow_up.strip(),
        "File coinvolti": args.file_coinvolti.strip(),
    }

    for key, val in entry.items():
        if not val:
            fail(f"il campo '{key}' non puo' essere vuoto")

    with decision_log.open("a", encoding="utf-8", newline="\n") as log_file:
        log_file.write(render_entry(entry))

    print(f"Decisione {entry['ID']} aggiunta a {decision_log.name}.")


if __name__ == "__main__":
    main()

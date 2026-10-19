"""Convert local FreeDict/WikDict TEI sources to the bundled offline lexicons.

No network requests. Usage: python tools/build_dictionary.py <source-directory>
The generated data retains CC BY-SA 3.0; this script is independent app tooling.
"""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {"t": "http://www.tei-c.org/ns/1.0"}
LICENSE = "https://creativecommons.org/licenses/by-sa/3.0/legalcode"


def text(element):
    return " ".join("".join(element.itertext()).split()) if element is not None else ""


def supplement_italian(destination: Path, english_file: Path):
    """Fill only reviewed gaps using an attested pair from the opposite lexicon.

    This is deliberately not a bulk reversal: translations can be ambiguous.
    It is safe to rerun after conversion or on the existing bundled JSON.
    """
    italian = json.loads(destination.read_text(encoding="utf-8"))
    english = json.loads(english_file.read_text(encoding="utf-8"))
    reviewed = {"trascrivere": "transcribe"}
    additions = []
    for lemma, source_word in reviewed.items():
        sources = [entry for entry in english["entries"]
                   if entry["word"] == source_word and entry["partOfSpeech"] == "v"
                   and any(lemma in sense["translations"] for sense in entry["senses"])]
        if not sources:
            raise ValueError("Reviewed reverse verb is no longer attested")
        if not any(entry["word"] == lemma for entry in italian["entries"]):
            italian["entries"].append({"word": lemma, "partOfSpeech": "v", "pronunciation": "",
                                       "senses": [{"translations": [source_word], "definitions": []}]})
        additions.append({"word": lemma, "sourceWord": source_word,
                          "sourceUrl": english["sourceUrl"], "sourceSha256": english["sourceSha256"]})
    italian["reviewedReverseVerbs"] = additions
    base_note = italian["modifications"].split(" Reviewed reverse verb supplement:")[0]
    italian["modifications"] = base_note + " Reviewed reverse verb supplement: trascrivere from eng-ita transcribe; no bulk reversal."
    destination.write_text(json.dumps(italian, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def convert(source: Path, destination: Path):
    tree = ET.parse(source)
    header = tree.find("t:teiHeader/t:fileDesc", NS)
    assert header is not None
    licenses = [ref.get("target") for ref in header.findall("t:publicationStmt/t:availability//t:ref", NS)]
    if LICENSE not in licenses:
        raise ValueError("Source must explicitly carry the expected CC BY-SA 3.0 license")
    entries = []
    for entry in tree.findall(".//t:entry", NS):
        word = text(entry.find("t:form/t:orth", NS))
        senses = []
        for sense in entry.findall("t:sense", NS):
            translations = list(dict.fromkeys(text(quote) for quote in sense.findall("t:cit[@type='trans']/t:quote", NS) if text(quote)))
            definitions = list(dict.fromkeys(text(definition) for definition in sense.findall(".//t:def", NS) if text(definition)))
            if translations:
                senses.append({"translations": translations, "definitions": definitions})
        if word and senses:
            entries.append({"word": word, "partOfSpeech": text(entry.find("t:gramGrp/t:pos", NS)), "pronunciation": text(entry.find("t:form/t:pron", NS)), "senses": senses})
    result = {"title": text(header.find("t:titleStmt/t:title", NS)), "version": text(header.find("t:editionStmt/t:edition", NS)), "license": LICENSE, "attribution": "FreeDict / WikDict, Karl Bartel; Wiktionary contributors via DBnary", "sourceUrl": f"https://download.freedict.org/generated/{source.stem}/{source.name}", "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "modifications": "TEI converted to JSON; retained headwords, grammar, first pronunciation, translations and definitions.", "entries": entries}
    destination.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{source.stem}: {len(entries)} entries, {destination.stat().st_size} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_directory", type=Path)
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "public" / "dictionaries"
    output.mkdir(parents=True, exist_ok=True)
    for pair in ("eng-ita", "ita-eng"):
        convert(args.source_directory / f"{pair}.tei", output / f"{pair}.json")
    supplement_italian(output / "ita-eng.json", output / "eng-ita.json")

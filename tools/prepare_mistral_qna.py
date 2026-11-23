"""Freeze five explicitly selected personal Q&A cases; never modify the library."""
import argparse
import hashlib
import json
import os
from pathlib import Path

from qna_prepare_private import leaf_path


def prepare(library, picks):
    if len(picks) != 5 or len(set(picks)) != 5:
        raise ValueError('exactly_five_distinct_picks_required')
    library_raw = (library / 'library.json').read_bytes()
    lectures = {x['id']: x for x in json.loads(library_raw.decode('utf-8-sig'))['lectures']}
    files = sorted((library / 'qna').glob('*.json'))
    cases = []
    for number, pick in enumerate(picks, 1):
        fi, ti = map(int, pick.split(':'))
        source = files[fi]
        raw = source.read_bytes()
        thread = json.loads(raw.decode('utf-8-sig'))[ti]
        messages = thread['messages']
        qi = next(i for i, m in enumerate(messages) if m['role'] == 'user' and m['text'].strip())
        following = messages[qi + 1:]
        ai = next((m for m in following if m['role'] == 'ai' and m['text'].strip()), None)
        if not ai or following[0] is not ai or thread.get('attachmentIds') or any(m.get('attachmentIds') for m in messages[:qi + 1]):
            raise ValueError('missing_answer_or_unsupported_images')
        lecture = lectures[source.stem]
        match = None
        for key in ('markdownFileName', 'markdownEnFileName'):
            if not lecture.get(key):
                continue
            path = leaf_path(library / 'markdown', lecture[key])
            doc_raw = path.read_bytes()
            document = doc_raw.decode('utf-8-sig')
            if thread['quote'] and thread['quote'] in document:
                match = (key, path, doc_raw, document)
                break
        if not match:
            raise ValueError('quote_not_found_in_current_sources')
        key, path, doc_raw, document = match
        if len(document.encode()) > 120000:
            raise ValueError('document_too_large')
        cases.append(dict(id=f'case-{number:02}', question=messages[qi]['text'], quote=thread['quote'],
                          contextHeading=thread.get('contextHeading'), context=document,
                          history=messages[:qi], historicalAnswer=ai['text'], historicalModel=ai.get('model'),
                          course=lecture.get('courseCode'), contextLanguage='en' if key == 'markdownEnFileName' else 'it',
                          sourceHashes={k: hashlib.sha256(v).hexdigest() for k, v in
                                        [('qna', raw), ('document', doc_raw), ('library', library_raw)]}))
        if source.read_bytes() != raw or path.read_bytes() != doc_raw:
            raise ValueError('source_changed_during_extraction')
    return dict(version=1, private=True, originalFullContextFlagKnown=False,
                historicalAnswerIsGold=False, contextMode='reconstructed-current-document', cases=cases)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pick', action='append', required=True)
    parser.add_argument('--library', type=Path, default=Path(os.environ['APPDATA']) / 'lezionify' / 'library')
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / 'local-artifacts/qna-benchmark/mistral-five-20261123/corpus.private.json'
    data = prepare(args.library.resolve(), args.pick)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(json.dumps(dict(prepared=5, languages=[c['contextLanguage'] for c in data['cases']],
                         contextBytes=[len(c['context'].encode()) for c in data['cases']])))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('{"error":"preparation_failed_no_sources_modified"}')
        raise SystemExit(1) from None

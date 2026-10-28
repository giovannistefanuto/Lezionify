"""Pinned, offline monolingual corpus conversion; Python standard library only."""
import gzip
import hashlib
import io
import json
from html.parser import HTMLParser
from pathlib import Path
import struct
import urllib.request
import zipfile

URL = 'https://github.com/DanielGregorini/koreader-dicts/releases/download/v1.2.0/it-it.zip'
SHA256 = '25ca5cf2347b225f10a9c013e550f8ab358f53011319ffcaed21381f49bee2b2'
DEST = Path(__file__).resolve().parents[1] / 'public' / 'dictionaries'


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('br', 'li', 'p', 'div', 'h2', 'h3'):
            self.parts.append('\n')

    def handle_data(self, data):
        self.parts.append(data)


def build():
    raw = urllib.request.urlopen(URL, timeout=90).read()
    if hashlib.sha256(raw).hexdigest() != SHA256:
        raise ValueError('Corpus checksum mismatch')
    archive = zipfile.ZipFile(io.BytesIO(raw))
    def read(suffix):
        return archive.read(next(n for n in archive.namelist() if n.endswith(suffix)))
    definitions = gzip.decompress(read('.dict.dz'))
    index = read('.idx')
    entries, position = [], 0
    while position < len(index):
        end = index.index(b'\0', position)
        word = index[position:end].decode('utf-8')
        offset, size = struct.unpack('>II', index[end+1:end+9])
        parser = Text()
        parser.feed(definitions[offset:offset+size].decode('utf-8'))
        lines = [' '.join(s.split()) for s in ''.join(parser.parts).splitlines()]
        entries.append(dict(word=word, partOfSpeech='', pronunciation='',
                            senses=[dict(translations=[], definitions=list(dict.fromkeys(s for s in lines if s)))]))
        position = end+9
    aliases, position = {}, 0
    synonyms = read('.syn')
    while position < len(synonyms):
        end = synonyms.index(b'\0', position)
        form = synonyms[position:end].decode('utf-8').lower()
        target = struct.unpack('>I', synonyms[end+1:end+5])[0]
        aliases.setdefault(form, []).append(entries[target]['word'])
        position = end+5
    data = dict(entries=entries, aliases=aliases, source=URL, sha256=SHA256, license='CC BY-SA 4.0')
    DEST.mkdir(parents=True, exist_ok=True)
    with open(DEST / 'ita-ita.json.gz', 'wb') as output:
        output.write(gzip.compress(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode(), mtime=0))
    for name in ('LICENSE', 'ATTRIBUTION', 'README.txt'):
        (DEST / ('italian-' + name)).write_bytes(read(name))
    print(f'{len(entries)} lemmas; {len(aliases)} inflected forms; source SHA256 verified')


if __name__ == '__main__':
    build()

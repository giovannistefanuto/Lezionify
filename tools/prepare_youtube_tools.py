#!/usr/bin/env python3
"""Prepare pinned Windows tools; never download or self-update from the app."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / 'resources' / 'youtube-tools'

def digest(blob):
    return hashlib.sha256(blob).hexdigest()

def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Lezionify-tools'}), timeout=120) as response:
        data = response.read(150_000_001)
    if len(data) > 150_000_000:
        raise ValueError('Artefatto troppo grande')
    return data

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    manifest = json.loads((TOOLS / 'manifest.json').read_text(encoding='utf-8'))
    if args.verify:
        for key, name in [('ytDlp', 'yt-dlp.exe'), ('deno', 'deno.exe')]:
            target = TOOLS / name
            if not target.is_file() or digest(target.read_bytes()) != manifest[key]['sha256']:
                raise ValueError('Strumenti mancanti o modificati: eseguire npm run prepare:youtube-tools')
        for name in ['GPL-3.0.txt', 'LICENSE.yt-dlp.txt', 'LICENSE.deno.txt', 'NOTICE.md']:
            if not (TOOLS / name).is_file():
                raise ValueError('Licenza mancante: ' + name)
        print('Strumenti YouTube e licenze verificati.')
        return
    for key, name in [('ytDlp', 'yt-dlp.exe'), ('deno', 'deno.exe')]:
        entry = manifest[key]
        target = TOOLS / name
        if target.exists() and entry['sha256'] and digest(target.read_bytes()) == entry['sha256']:
            print(name + ': hash verificato')
            continue
        blob = fetch(entry['url'])
        expected = entry.get('archiveSha256', entry['sha256'])
        if digest(blob) != expected:
            raise ValueError('Hash ufficiale non corrispondente: ' + name)
        if key == 'deno':
            with zipfile.ZipFile(io.BytesIO(blob)) as archive:
                info = archive.getinfo('deno.exe')
                if info.file_size > 150_000_000:
                    raise ValueError('Eseguibile troppo grande')
                blob = archive.read(info)
        if entry['sha256'] and digest(blob) != entry['sha256']:
            raise ValueError('Hash eseguibile non corrispondente: ' + name)
        temporary = target.with_suffix('.tmp')
        temporary.write_bytes(blob)
        temporary.replace(target)
        print(name + ': SHA256 ' + digest(blob))
    licenses = {
        'GPL-3.0.txt': 'https://www.gnu.org/licenses/gpl-3.0.txt',
        'LICENSE.yt-dlp.txt': 'https://raw.githubusercontent.com/yt-dlp/yt-dlp/2026.11.23/LICENSE',
        'LICENSE.deno.txt': 'https://raw.githubusercontent.com/denoland/deno/v2.9.8/LICENSE.md',
    }
    for name, url in licenses.items():
        target = TOOLS / name
        if not target.exists():
            target.write_bytes(fetch(url))
    print('Strumenti pronti; nessun audio scaricato.')

if __name__ == '__main__':
    main()

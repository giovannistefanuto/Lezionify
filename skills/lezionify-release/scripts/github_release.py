"""Lezionify release transport. No automatic retries or replacement of assets."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


class ReleaseError(Exception):
    pass


def require(ok, message):
    if not ok:
        raise ReleaseError(message)


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return 'sha256:' + value.hexdigest()


class Release:
    def __init__(self, root, repo):
        self.root = Path(root).resolve()
        require(re.fullmatch(r'[\w.-]+/[\w.-]+', repo), 'Repository non valido.')
        self.repo = repo
        self.version = json.loads((self.root / 'package.json').read_text(encoding='utf-8'))['version']
        require(re.fullmatch(r'\d+\.\d+\.\d+', self.version), 'Versione stabile richiesta.')
        self.tag = 'v' + self.version
        self.names = [f'Lezionify-Setup-{self.version}.exe', f'Lezionify-Setup-{self.version}.exe.blockmap', 'latest.yml']
        self.base = 'https://api.github.com/repos/' + repo
        self.token = None

    def command(self, *args):
        result = subprocess.run(args, cwd=self.root, text=True, capture_output=True)
        require(result.returncode == 0, 'Comando locale fallito: ' + args[0] + '. Controllare il comando separatamente.')
        return result.stdout.strip()

    def authenticate(self):
        self.token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
        if not self.token:
            result = subprocess.run(['git', 'credential', 'fill'], cwd=self.root,
                                    input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True,
                                    env={**os.environ, 'GIT_TERMINAL_PROMPT':'0', 'GCM_INTERACTIVE':'Never'})
            require(result.returncode == 0, 'Credenziale GitHub non disponibile.')
            fields = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
            self.token = fields.get('password')
        require(self.token, 'Credenziale GitHub non disponibile.')

    def request(self, url, method='GET', payload=None, file=None, public=False, raw=False):
        parsed = urllib.parse.urlparse(url)
        allowed = {'api.github.com', 'uploads.github.com'} if not public else {'api.github.com', 'github.com'}
        require(parsed.scheme == 'https' and parsed.hostname in allowed, 'Destinazione HTTPS non consentita.')
        headers = {'User-Agent': 'Lezionify-release', 'Accept': 'application/vnd.github+json',
                   'X-GitHub-Api-Version': '2022-11-28'}
        if not public:
            require(self.token, 'Autenticazione richiesta.')
            headers['Authorization'] = 'Bearer ' + self.token
        data = json.dumps(payload).encode() if payload is not None else None
        if payload is not None:
            headers['Content-Type'] = 'application/json'
        if file:
            headers['Content-Type'] = 'application/octet-stream'
            headers['Content-Length'] = str(file.stat().st_size)

            def chunks():
                sent, last = 0, time.monotonic()
                with file.open('rb') as stream:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                        yield chunk
                        sent += len(chunk)
                        if time.monotonic() - last >= 15:
                            print(f'Upload {file.name}: {sent // (1024 * 1024)} MiB inviati', flush=True)
                            last = time.monotonic()
            data = chunks()
        request = urllib.request.Request(url, data=data, method=method, headers=headers)
        # No auth is attached to public download requests or their redirects.
        with urllib.request.urlopen(request, timeout=240 if file else 60) as response:
            body = response.read()
        return body if raw else json.loads(body)

    def local_assets(self):
        self.command('node', 'tools/validate_release.cjs', '--artifacts')
        self.notes = (self.root / f'docs/releases/{self.version}.md').read_text(encoding='utf-8').strip()
        return {name: {'size': (self.root / 'dist' / name).stat().st_size,
                       'digest': digest(self.root / 'dist' / name)} for name in self.names}

    def pushed_head(self):
        require(not self.command('git', 'status', '--porcelain'), 'Checkout non pulito: completare commit e revisione.')
        remote = self.command('git', 'remote', 'get-url', 'origin')
        match = re.fullmatch(r'(?:https://github\.com/|git@github\.com:)([\w.-]+/[\w.-]+?)(?:\.git)?/?', remote)
        require(match and match[1].lower() == self.repo.lower(), 'Remoto origin diverso dalla repository scelta.')
        branch = self.command('git', 'symbolic-ref', '--short', 'HEAD')
        upstream = self.command('git', 'rev-parse', '--abbrev-ref', '@{upstream}')
        require(upstream == 'origin/' + branch, 'Upstream diverso: verificare la destinazione prima di pubblicare.')
        head = self.command('git', 'rev-parse', 'HEAD')
        rows = self.command('git', 'ls-remote', 'origin', 'refs/heads/' + branch).split()
        require(rows and rows[0] == head, 'HEAD non presente sul ramo remoto.')
        tags = self.command('git', 'ls-remote', 'origin', 'refs/tags/' + self.tag, 'refs/tags/' + self.tag + '^{}')
        if tags:
            references = dict((row.split()[1], row.split()[0]) for row in tags.splitlines())
            commit = references.get('refs/tags/' + self.tag + '^{}', references.get('refs/tags/' + self.tag))
            require(commit == head, 'Tag esistente riferito a un commit differente.')
        return head

    def find(self):
        try:
            return self.request(self.base + '/releases/tags/' + self.tag)
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            raise

    def validate(self, release, assets, complete=True, head=None):
        require(release['tag_name'] == self.tag and not release['prerelease'], 'Tag o canale differente.')
        require(release.get('body', '').strip() == self.notes, 'Note remote differenti da quelle locali.')
        if head:
            require(release['target_commitish'] == head, 'Bozza riferita a un commit differente.')
        names = [asset['name'] for asset in release['assets']]
        require(len(names) == len(set(names)), 'Nomi asset duplicati.')
        require(set(names).issubset(assets), 'Asset inattesi: verificare la bozza.')
        if complete:
            require(set(names) == set(assets), 'Asset mancanti.')
        for asset in release['assets']:
            expected = assets[asset['name']]
            require(asset['state'] == 'uploaded' and asset['size'] == expected['size']
                    and asset.get('digest') == expected['digest'], 'Asset remoto incompleto o differente: ' + asset['name'])

    def run(self, action):
        if action == 'status':
            self.authenticate()
            releases = self.request(self.base + '/releases?per_page=100')
            return [{'tag': r['tag_name'], 'draft': r['draft'], 'assets': [a['name'] for a in r['assets']]} for r in releases]
        assets = self.local_assets()
        if action == 'verify':
            release = self.request(self.base + '/releases/latest', public=True)
            require(not release['draft'], 'Release ancora in bozza.')
            self.validate(release, assets)
            expected = release['target_commitish']
            require(re.fullmatch('[0-9a-f]{40}', expected), 'Provenienza release non fissata a uno SHA: verificare manualmente.')
            reference = self.request(self.base + '/git/ref/tags/' + self.tag, public=True)['object']
            for _ in range(5):
                if reference['type'] != 'tag':
                    break
                reference = self.request(self.base + '/git/tags/' + reference['sha'], public=True)['object']
            require(reference['type'] == 'commit' and reference['sha'] == expected, 'Tag pubblico e commit release differenti.')
            manifest = next(a for a in release['assets'] if a['name'] == 'latest.yml')
            content = self.request(manifest['browser_download_url'], public=True, raw=True)
            require(content == (self.root / 'dist/latest.yml').read_bytes(), 'Manifesto pubblico differente.')
            return {'url': release['html_url'], 'public': True, 'assetsVerified': self.names, 'publicManifestIdentical': True}
        head = self.pushed_head()
        self.authenticate()
        release = self.find()
        if action == 'prepare':
            require(release is None, 'Release già esistente: usare resume per la stessa bozza, verify se pubblicata.')
            # Verify monotonicity before creating a new release, including older public versions.
            releases = self.request(self.base + '/releases?per_page=100')
            stable = [tuple(map(int, r['tag_name'][1:].split('.'))) for r in releases
                      if not r['draft'] and not r['prerelease'] and re.fullmatch(r'v\d+\.\d+\.\d+', r['tag_name'])]
            require(not stable or tuple(map(int, self.version.split('.'))) > max(stable), 'Versione non crescente.')
            release = self.request(self.base + '/releases', 'POST',
                                   {'tag_name': self.tag, 'target_commitish': head, 'name': 'Lezionify ' + self.version,
                                    'body': self.notes, 'draft': True, 'prerelease': False})
        require(release is not None, 'Release mancante: usare prepare.')
        require(release['draft'], 'Release già pubblicata: solo verify, nessuna sostituzione.')
        self.validate(release, assets, complete=action == 'publish', head=head)
        if action in ('prepare', 'resume'):
            present = {asset['name'] for asset in release['assets']}
            upload = release['upload_url'].split('{')[0]
            for name in self.names:
                if name not in present:
                    self.request(upload + '?name=' + urllib.parse.quote(name), 'POST', file=self.root / 'dist' / name)
                    print('Caricato ' + name, flush=True)
            release = self.request(self.base + '/releases/' + str(release['id']))
            self.validate(release, self.local_assets(), head=head)
        elif action == 'publish':
            release = self.request(self.base + '/releases/' + str(release['id']), 'PATCH', {'draft': False, 'make_latest': 'true'})
            require(not release['draft'], 'Pubblicazione non confermata.')
            self.validate(release, assets, head=head)
        return {'url': release['html_url'], 'draft': release['draft'], 'assetsVerified': self.names}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['status', 'prepare', 'resume', 'publish', 'verify'])
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--repo', required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(Release(args.root, args.repo).run(args.action), ensure_ascii=False))
        return 0
    except ReleaseError as error:
        print(str(error), file=sys.stderr)
    except urllib.error.HTTPError as error:
        print(f'GitHub HTTP {error.code}; verificare lo stato prima di riprendere.', file=sys.stderr)
    except (OSError, ValueError, KeyError):
        print('Operazione fallita: controllare rete, strumenti e file locali. Nessuna ripresa automatica.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())

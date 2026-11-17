"""Local release pipeline. Publication remains in github_release.py after review/push."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time


UI_FILES = {'src/styles.css', 'src/qna.css', 'src/components/QnaImagePreview.tsx'}


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root).decode('utf-8').strip()


def version_only(old, new):
    old, new = copy.deepcopy(old), copy.deepcopy(new)
    for value in (old, new):
        value.pop('version', None)
        value.get('packages', {}).get('', {}).pop('version', None)
    return old == new


def ui_scope(root, base):
    # Compare the entire release delta, including uncommitted/untracked files.
    subprocess.run(['git', 'merge-base', '--is-ancestor', base, 'HEAD'], cwd=root, check=True)
    changed = set(git(root, 'diff', '--name-only', base).splitlines())
    changed.update(git(root, 'ls-files', '--others', '--exclude-standard').splitlines())
    for name in sorted(changed):
        if name in UI_FILES or name in {'AGENTS.md', 'DECISIONI.md', 'STRUTTURA_PROGETTO.md'} or name.startswith(('docs/', 'tests/')):
            continue
        if name in {'package.json', 'package-lock.json'}:
            previous = json.loads(git(root, 'show', f'{base}:{name}'))
            if version_only(previous, json.loads((root / name).read_text(encoding='utf-8'))):
                continue
        if name == 'electron-builder.yml':
            previous = git(root, 'show', f'{base}:{name}')
            current = (root / name).read_text(encoding='utf-8')
            strip_notes = lambda text: '\n'.join(line for line in text.splitlines() if not line.strip().startswith('releaseNotesFile:'))
            if strip_notes(previous) == strip_notes(current):
                continue
        raise ValueError(f'Profilo UI non ammesso: {name}. Usa --profile full.')
    return sorted(changed)


def fingerprint(root):
    digest = hashlib.sha256()
    names = git(root, 'ls-files', '-co', '--exclude-standard').splitlines()
    for name in sorted(set(names)):
        path = root / name
        digest.update(name.encode())
        digest.update(path.read_bytes() if path.is_file() else b'<missing>')
    return digest.hexdigest()


def commands(profile, backup):
    if profile == 'full':
        checks = [['npm', 'run', 'check']]
    else:
        checks = [['npm', 'run', name] for name in ('test:inventory', 'typecheck', 'lint', 'test', 'release:validate')]
        checks += [['node', 'tools/run_hook_regressions.cjs', '--focus-pdf-only'], ['npm', 'run', 'build']]
    return checks + [
        ['npm', 'exec', '--', 'electron-builder', '--win', '--publish', 'never'],
        ['npm', 'run', 'release:validate', '--', '--artifacts'],
        ['node', 'tools/verify_nsis_payload.cjs'],
        ['node', 'tools/verify_installer.cjs', str(backup), '--app-update'],
    ]


def backup_previous(root, destination):
    # Read previous version from the existing feed, before packaging replaces it.
    lines = (root / 'dist/latest.yml').read_text(encoding='utf-8').splitlines()
    version = next(line.split(':', 1)[1].strip().strip('\"\'') for line in lines if line.startswith('version:'))
    if version == json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']:
        raise ValueError('Il feed locale ha gia la versione da costruire: conserva gli asset e verifica lo stato prima di ricostruire.')
    names = [f'Lezionify-Setup-{version}.exe', f'Lezionify-Setup-{version}.exe.blockmap', 'latest.yml']
    for name in names:
        if not (root / 'dist' / name).is_file():
            raise ValueError(f'Backup sorgente mancante: {name}')
    destination.mkdir(parents=True, exist_ok=False)
    entries = []
    for name in names:
        source, target = root / 'dist' / name, destination / name
        shutil.copy2(source, target)
        sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
        if sha(source) != sha(target):
            raise ValueError(f'Backup non corrispondente: {name}')
        entries.append({'name': name, 'sha256': sha(target)})
    (destination / 'backup.json').write_text(json.dumps({'files': entries}, indent=2), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=['full', 'ui'], default='full')
    parser.add_argument('--base', help='Tag della precedente release pubblica, obbligatorio per UI')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    if args.profile == 'ui' and not args.base:
        parser.error('--profile ui richiede --base <tag-release-precedente>')
    scope = ui_scope(root, args.base) if args.profile == 'ui' else None
    stamp = time.strftime('%Y%m%d-%H%M%S')
    directory = root / 'local-artifacts' / f'release-{stamp}'
    backup = root / 'local-artifacts/installer-backups' / stamp
    plan = commands(args.profile, backup)
    print(json.dumps({'profile': args.profile, 'base': args.base, 'changed': scope, 'commands': plan}, indent=2), flush=True)
    if args.dry_run:
        return
    directory.mkdir(parents=True, exist_ok=False)
    before = fingerprint(root)
    backup_previous(root, backup)
    report = {'profile': args.profile, 'base': args.base, 'changed': scope,
              'checksNotRun': ['Python', 'Node benchmarks', 'updater', 'other Electron scenarios', 'collections', 'PDF export', 'RAG retrieval'] if args.profile == 'ui' else [],
              'sourceFingerprint': before, 'backup': str(backup), 'steps': [], 'complete': False}
    try:
        for index, command in enumerate(plan):
            if fingerprint(root) != before:
                raise ValueError('Sorgenti cambiati durante la preparazione: interrompere e ricollaudare.')
            executable = shutil.which(command[0] + '.cmd' if os.name == 'nt' and command[0] == 'npm' else command[0])
            if not executable:
                raise ValueError(f'Eseguibile mancante: {command[0]}')
            log = directory / f'{index:02d}.log'
            print(f'Avvio {command}; log: {log}', flush=True)
            started = time.monotonic()
            with log.open('w', encoding='utf-8') as output:
                result = subprocess.run([executable, *command[1:]], cwd=root, stdout=output, stderr=subprocess.STDOUT)
            report['steps'].append({'command': command, 'seconds': round(time.monotonic() - started, 2), 'exitCode': result.returncode})
            if result.returncode:
                raise ValueError(f'Passaggio fallito, vedere {log}. Nessuna pubblicazione eseguita.')
        if fingerprint(root) != before:
            raise ValueError('Sorgenti cambiati durante la verifica finale.')
        report['complete'] = True
    finally:
        (directory / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f'Preparazione completata: {directory / "report.json"}. Verificare firma e diff, poi commit/push e pubblicazione con la skill.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, subprocess.CalledProcessError, OSError) as error:
        sys.exit(f'Preparazione interrotta: {error}')

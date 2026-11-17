import importlib.util
import json
from pathlib import Path
import tempfile
import subprocess
import sys
from unittest.mock import patch
import unittest

spec = importlib.util.spec_from_file_location('prepare_release', Path(__file__).resolve().parents[2] / 'tools/prepare_release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class PrepareReleaseTests(unittest.TestCase):
    def test_failed_gate_stops_before_packaging_and_saves_report(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sentinel = root / 'should-not-exist'
            plan = [[sys.executable, '-c', 'raise SystemExit(2)'],
                    [sys.executable, '-c', f'from pathlib import Path; Path({str(sentinel)!r}).touch()']]
            with patch.object(release, '__file__', str(root / 'tools/prepare_release.py')), \
                    patch.object(sys, 'argv', ['prepare_release.py']), \
                    patch.object(release, 'fingerprint', return_value='same'), \
                    patch.object(release, 'backup_previous'), \
                    patch.object(release, 'commands', return_value=plan):
                with self.assertRaises(ValueError):
                    release.main()
            self.assertFalse(sentinel.exists())
            report = json.loads(next(root.glob('local-artifacts/release-*/report.json')).read_text())
            self.assertFalse(report['complete'])
            self.assertEqual(len(report['steps']), 1)
            self.assertEqual(report['steps'][0]['exitCode'], 2)

    def test_scope_checks_committed_and_untracked_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-c', 'user.name=Release Test', '-c', 'user.email=release@example.invalid', *args], cwd=root, stderr=subprocess.STDOUT)
            git('init')
            (root / 'package.json').write_text('{"version":"1"}')
            git('add', '.')
            git('commit', '-m', 'baseline')
            base = git('rev-parse', 'HEAD').decode().strip()
            (root / 'package.json').write_text('{"version":"2"}')
            self.assertEqual(release.ui_scope(root, base), ['package.json'])
            (root / 'backend.ts').write_text('changed')
            with self.assertRaises(ValueError):
                release.ui_scope(root, base)
            git('add', '.')
            git('commit', '-m', 'backend')
            with self.assertRaises(ValueError):
                release.ui_scope(root, base)

    def test_version_change_cannot_hide_dependency_change(self):
        old = {'version': '1', 'dependencies': {'a': '1'}, 'packages': {'': {'version': '1'}}}
        new = {'version': '2', 'dependencies': {'a': '1'}, 'packages': {'': {'version': '2'}}}
        self.assertTrue(release.version_only(old, new))
        new['dependencies']['a'] = '2'
        self.assertFalse(release.version_only(old, new))
        self.assertEqual(old['version'], '1')

    def test_both_profiles_build_once_and_preserve_compression(self):
        for profile in ('full', 'ui'):
            plan = release.commands(profile, Path('backup'))
            self.assertEqual(sum(command in (['npm', 'run', 'build'], ['npm', 'run', 'check']) for command in plan), 1)
            package = next(command for command in plan if 'electron-builder' in command)
            self.assertEqual(package, ['npm', 'exec', '--', 'electron-builder', '--win', '--publish', 'never'])

    def test_backup_preserves_assets_and_refuses_same_version(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'dist').mkdir()
            (root / 'package.json').write_text('{"version":"2"}')
            (root / 'dist/latest.yml').write_text('version: 1\n')
            for name in ('Lezionify-Setup-1.exe', 'Lezionify-Setup-1.exe.blockmap'):
                (root / 'dist' / name).write_bytes(b'synthetic')
            target = root / 'backup'
            release.backup_previous(root, target)
            self.assertEqual(len(json.loads((target / 'backup.json').read_text())['files']), 3)
            self.assertEqual((target / 'Lezionify-Setup-1.exe').read_bytes(), b'synthetic')
            (root / 'package.json').write_text('{"version":"1"}')
            with self.assertRaises(ValueError):
                release.backup_previous(root, root / 'another')
            self.assertFalse((root / 'another').exists())


if __name__ == '__main__':
    unittest.main()

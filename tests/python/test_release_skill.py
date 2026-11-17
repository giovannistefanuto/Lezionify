import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('release_skill', ROOT/'skills/lezionify-release/scripts/github_release.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ReleaseSkillTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        root = Path(self.directory.name)
        (root/'package.json').write_text(json.dumps({'version':'0.2.3'}))
        (root/'dist').mkdir()
        (root/'dist/latest.yml').write_bytes(b'version: 0.2.3\n')
        self.tool = MODULE.Release(root, 'example/app')
        self.tool.notes = 'Release notes'
        self.assets = {name:{'size':12,'digest':'sha256:abc'} for name in self.tool.names}
        self.remote = {'id':1,'tag_name':'v0.2.3','draft':True,'prerelease':False,
                       'body':'Release notes','target_commitish':'a'*40,'html_url':'https://github.com/example/app/releases/tag/v0.2.3',
                       'upload_url':'https://uploads.github.com/repos/example/app/releases/1/assets{?name,label}',
                       'assets':[self.asset(name) for name in self.tool.names]}
        self.calls = []
        self.tool.local_assets = lambda: self.assets
        self.tool.pushed_head = lambda: 'a'*40
        self.tool.authenticate = lambda: None
        self.tool.find = lambda: copy.deepcopy(self.remote)
        self.tool.request = self.request

    def asset(self, name):
        return {'name':name,'size':12,'digest':'sha256:abc','state':'uploaded',
                'browser_download_url':'https://github.com/example/app/releases/download/v0.2.3/'+name}

    def request(self, url, method='GET', payload=None, file=None, public=False, raw=False):
        self.calls.append((url,method,payload,file,public))
        if raw:
            return (self.tool.root/'dist/latest.yml').read_bytes()
        if '/git/ref/tags/' in url:
            return {'object':{'type':'commit','sha':'a'*40}}
        if '/releases?' in url:
            return []
        if method == 'POST' and file:
            self.remote['assets'].append(self.asset(file.name))
            return self.remote['assets'][-1]
        if method == 'PATCH':
            self.remote['draft'] = False
        return copy.deepcopy(self.remote)

    def test_resume_uploads_only_missing_assets(self):
        self.remote['assets'] = self.remote['assets'][:1]
        result = self.tool.run('resume')
        uploads = [call[3].name for call in self.calls if call[3]]
        self.assertEqual(uploads,self.tool.names[1:])
        self.assertTrue(result['draft'])
        self.assertFalse(any(call[1]=='PATCH' for call in self.calls))

    def test_resume_rejects_different_existing_asset_before_upload(self):
        self.remote['assets'][0]['digest'] = 'sha256:wrong'
        with self.assertRaises(MODULE.ReleaseError): self.tool.run('resume')
        self.assertEqual(self.calls,[])

    def test_resume_rejects_incomplete_starter_asset(self):
        self.remote['assets'][0]['state'] = 'starter'
        with self.assertRaises(MODULE.ReleaseError): self.tool.run('resume')
        self.assertEqual(self.calls,[])

    def test_published_release_cannot_be_prepared_resumed_or_republished(self):
        self.remote['draft'] = False
        for action in ['prepare','resume','publish']:
            with self.subTest(action=action):
                with self.assertRaises(MODULE.ReleaseError): self.tool.run(action)
        self.assertEqual(self.calls,[])

    def test_missing_asset_blocks_publication(self):
        self.remote['assets'].pop()
        with self.assertRaises(MODULE.ReleaseError): self.tool.run('publish')
        self.assertEqual(self.calls,[])

    def test_wrong_commit_or_notes_blocks_publication(self):
        for field in ['target_commitish','body']:
            with self.subTest(field=field):
                original = self.remote[field]
                self.remote[field] = 'different'
                with self.assertRaises(MODULE.ReleaseError): self.tool.run('publish')
                self.remote[field] = original
        self.assertEqual(self.calls,[])

    def test_extra_or_duplicate_asset_is_rejected(self):
        self.remote['assets'].append(self.asset('private.mp3'))
        with self.assertRaises(MODULE.ReleaseError): self.tool.run('publish')
        self.remote['assets'][-1] = self.remote['assets'][0]
        with self.assertRaises(MODULE.ReleaseError): self.tool.run('publish')
        self.assertEqual(self.calls,[])

    def test_publish_changes_only_complete_draft(self):
        result = self.tool.run('publish')
        self.assertFalse(result['draft'])
        self.assertEqual([call[1] for call in self.calls],['PATCH'])
        self.assertEqual(self.calls[0][2],{'draft':False,'make_latest':'true'})

    def test_public_verification_never_authenticates(self):
        self.remote['draft'] = False
        self.tool.authenticate = lambda: self.fail('Credentials used for public verification')
        result = self.tool.run('verify')
        self.assertTrue(result['publicManifestIdentical'])
        self.assertTrue(all(call[4] for call in self.calls))

    def test_different_public_manifest_is_rejected(self):
        self.remote['draft'] = False
        request = self.request
        self.tool.request = lambda *a,**kw: b'different' if kw.get('raw') else request(*a,**kw)
        with self.assertRaises(MODULE.ReleaseError): self.tool.run('verify')

    def test_public_tag_must_match_the_source_commit(self):
        self.remote['draft'] = False
        request = self.request
        self.tool.request = lambda url,**kw: {'object':{'type':'commit','sha':'b'*40}} if '/git/ref/tags/' in url else request(url,**kw)
        with self.assertRaises(MODULE.ReleaseError): self.tool.run('verify')

    def test_annotated_public_tag_is_resolved(self):
        self.remote['draft'] = False
        request = self.request
        def annotated(url,**kw):
            if '/git/ref/tags/' in url: return {'object':{'type':'tag','sha':'c'*40}}
            if '/git/tags/' in url: return {'object':{'type':'commit','sha':'a'*40}}
            return request(url,**kw)
        self.tool.request = annotated
        self.assertTrue(self.tool.run('verify')['public'])

    def test_new_release_must_have_increasing_version(self):
        self.tool.find = lambda: None
        self.tool.request = lambda *a,**kw: [{'tag_name':'v0.2.4','draft':False,'prerelease':False}]
        with self.assertRaises(MODULE.ReleaseError): self.tool.run('prepare')

    def test_draft_is_found_in_authenticated_list_when_tag_endpoint_returns_404(self):
        urls = []
        def request(url):
            urls.append(url)
            if '/releases/tags/' in url:
                raise urllib.error.HTTPError(url,404,'not found',{},None)
            return [self.remote]
        self.tool.request = request
        self.assertEqual(MODULE.Release.find(self.tool)['id'],1)
        self.assertEqual(len(urls),2)
        self.assertIn('page=1',urls[1])

    def test_missing_draft_after_tag_404_returns_none_without_creating_a_release(self):
        def request(url):
            if '/releases/tags/' in url:
                raise urllib.error.HTTPError(url,404,'not found',{},None)
            return []
        self.tool.request = request
        self.assertIsNone(MODULE.Release.find(self.tool))

    def test_source_override_allows_only_ancestor_with_unchanged_application_and_release_notes(self):
        source, head = 'a'*40, 'b'*40
        answers = {('git','status','--porcelain'):'', ('git','remote','get-url','origin'):'https://github.com/example/app.git',
                   ('git','symbolic-ref','--short','HEAD'):'main',('git','rev-parse','--abbrev-ref','@{upstream}'):'origin/main',
                   ('git','rev-parse','HEAD'):head, ('git','ls-remote','origin','refs/heads/main'):head+'\trefs/heads/main',
                   ('git','merge-base','--is-ancestor',source,head):'',
                   ('git','diff','--name-only',source,head):'skills/lezionify-release/scripts/github_release.py\ntests/python/test_release_skill.py',
                   ('git','ls-remote','origin','refs/tags/v0.2.3','refs/tags/v0.2.3^{}'):''}
        self.tool.command = lambda *args: answers[args]
        self.assertEqual(MODULE.Release.pushed_head(self.tool,source),source)
        for path in ['src/App.tsx','package.json','electron/main/index.ts','docs/releases/0.2.3.md']:
            answers[('git','diff','--name-only',source,head)] = path
            with self.subTest(path=path), self.assertRaises(MODULE.ReleaseError):
                MODULE.Release.pushed_head(self.tool,source)

    def test_source_override_is_not_a_way_to_create_a_new_release_from_old_sources(self):
        with self.assertRaises(MODULE.ReleaseError): self.tool.run('prepare','a'*40)
        self.assertEqual(self.calls,[])

    def test_authenticated_transport_rejects_unknown_hosts_without_network(self):
        for url in ['http://api.github.com/path','https://attacker.invalid/path']:
            with self.subTest(url=url), patch.object(MODULE.urllib.request,'urlopen') as network:
                with self.assertRaises(MODULE.ReleaseError): MODULE.Release.request(self.tool,url)
                network.assert_not_called()

    def test_dirty_or_unpushed_checkout_blocks_mutations(self):
        self.tool.command = lambda *a: ' M source.ts' if a[1:]==('status','--porcelain') else ''
        with self.assertRaises(MODULE.ReleaseError): MODULE.Release.pushed_head(self.tool)
        answers = {('git','status','--porcelain'):'', ('git','remote','get-url','origin'):'https://github.com/example/app.git',
                   ('git','symbolic-ref','--short','HEAD'):'main',('git','rev-parse','--abbrev-ref','@{upstream}'):'origin/main',
                   ('git','rev-parse','HEAD'):'a'*40, ('git','ls-remote','origin','refs/heads/main'):'b'*40+'\trefs/heads/main'}
        self.tool.command = lambda *a: answers[a]
        with self.assertRaises(MODULE.ReleaseError): MODULE.Release.pushed_head(self.tool)

    def test_existing_tag_cannot_redirect_a_new_release_to_other_source(self):
        answers = {('git','status','--porcelain'):'', ('git','remote','get-url','origin'):'git@github.com:example/app.git',
                   ('git','symbolic-ref','--short','HEAD'):'main',('git','rev-parse','--abbrev-ref','@{upstream}'):'origin/main',
                   ('git','rev-parse','HEAD'):'a'*40, ('git','ls-remote','origin','refs/heads/main'):'a'*40+'\trefs/heads/main',
                   ('git','ls-remote','origin','refs/tags/v0.2.3','refs/tags/v0.2.3^{}'):'b'*40+'\trefs/tags/v0.2.3'}
        self.tool.command = lambda *a: answers[a]
        with self.assertRaises(MODULE.ReleaseError): MODULE.Release.pushed_head(self.tool)
        key = ('git','ls-remote','origin','refs/tags/v0.2.3','refs/tags/v0.2.3^{}')
        answers[key] = 'b'*40+'\trefs/tags/v0.2.3\n'+'a'*40+'\trefs/tags/v0.2.3^{}'
        self.assertEqual(MODULE.Release.pushed_head(self.tool),'a'*40)


if __name__ == '__main__':
    unittest.main()

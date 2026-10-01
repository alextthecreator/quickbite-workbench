import hashlib, io, json, shutil, subprocess, sys, tempfile, unittest, zipfile
from pathlib import Path
from unittest.mock import patch
from course_app.storage import initialize_workspace
from course_app.validation import validate_course
from course_app.tools.apply_update import apply_update_bytes
ROOT=Path(__file__).resolve().parents[1]

def digest(folder):return {p.relative_to(folder).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.rglob('*') if p.is_file() and '__pycache__' not in p.parts}

def package(files):
    files={'course_version.json':json.dumps({'app_id':'quickbite-workbench','version':'4.4.1','label':'Test'}).encode(),**files}
    manifest={'app_id':'quickbite-workbench','format_version':2,'version':'4.4.1','min_version':'4.4.0','files':{k:hashlib.sha256(v).hexdigest() for k,v in files.items()}}
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w') as z:
        z.writestr('update_manifest.json',json.dumps(manifest))
        for k,v in files.items():z.writestr('payload/'+k,v)
    return out.getvalue()

class BaselineTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.repo=Path(self.temp.name)/'repo';self.repo.mkdir()
        shutil.copytree(ROOT/'course_app',self.repo/'course_app',ignore=shutil.ignore_patterns('__pycache__'))
        shutil.copy2(ROOT/'app.py',self.repo/'app.py');self.app=self.repo/'course_app';self.work=self.repo/'workspace'
        initialize_workspace(self.app,self.work)
        (self.work/'reports/M01.md').write_text('Student analysis — preserved')
        (self.work/'project.json').write_text('{"team_id":"QA","current_session":7}')
    def tearDown(self):self.temp.cleanup()
    def test_course_guidance_and_javascript(self):self.assertEqual(validate_course(self.app)['modules'],10)
    def test_seed_never_replaces_student_code(self):
        p=self.work/'student_code/policies.py';p.write_text('# My implementation')
        before=digest(self.work);initialize_workspace(self.app,self.work);self.assertEqual(before,digest(self.work))
    def test_update_preserves_all_student_files(self):
        before=digest(self.work);result=apply_update_bytes(self.app,package({'assets/style.css':(self.app/'assets/style.css').read_bytes()+b'\n/* update */'}))
        self.assertTrue(result['restart_required']);self.assertEqual(before,digest(self.work))
    def test_broken_js_rejected_before_mutation(self):
        before=digest(self.repo)
        with self.assertRaises(Exception):apply_update_bytes(self.app,package({'assets/app.js':b"const broken='\n';"}))
        self.assertEqual(before,digest(self.repo))
    def test_python_failure_rejected_before_mutation(self):
        before=digest(self.repo)
        with self.assertRaises(Exception):apply_update_bytes(self.app,package({'engines.py':b'raise RuntimeError("broken candidate")'}))
        self.assertEqual(before,digest(self.repo))
    def test_protected_and_traversal_paths(self):
        before=digest(self.repo)
        for path in ['../workspace/project.json','workspace/project.json','student_code/policies.py','tests/test_student.py','assets/../../workspace/test','assets\\evil.js']:
            with self.subTest(path=path),self.assertRaises(ValueError):apply_update_bytes(self.app,package({path:b'bad'}))
        self.assertEqual(before,digest(self.repo))
    def test_symlink_target_rejected(self):
        target=self.work/'secret';target.write_text('preserved');(self.app/'assets/link.js').symlink_to(target)
        with self.assertRaises(ValueError):apply_update_bytes(self.app,package({'assets/link.js':b'bad'}))
        self.assertEqual(target.read_text(),'preserved')
    def test_legacy_update_rejected(self):
        raw=io.BytesIO()
        with zipfile.ZipFile(raw,'w') as z:z.writestr('update_manifest.json',json.dumps({'app_id':'quickbite-workbench','format_version':1}))
        with self.assertRaises(ValueError):apply_update_bytes(self.app,raw.getvalue())
    def test_rollback_after_installed_check_fails(self):
        before=digest(self.app);work=digest(self.work)
        # Candidate checks succeed; installed verification fails.
        actual=subprocess.run;calls=0
        def run(*args,**kwargs):
            nonlocal calls
            if args[0][0]==sys.executable:
                calls+=1
                if calls==2:return subprocess.CompletedProcess(args[0],1,'','forced installed failure')
            return actual(*args,**kwargs)
        with patch('course_app.tools.apply_update.subprocess.run',side_effect=run),self.assertRaises(RuntimeError):apply_update_bytes(self.app,package({'assets/style.css':b'/* test */'}))
        self.assertEqual(before,digest(self.app));self.assertEqual(work,digest(self.work))
    def test_checksum_rejected(self):
        raw=io.BytesIO(package({}));out=io.BytesIO()
        with zipfile.ZipFile(raw) as source,zipfile.ZipFile(out,'w') as dest:
            for name in source.namelist():dest.writestr(name,b'{}' if name=='payload/course_version.json' else source.read(name))
        with self.assertRaises(ValueError):apply_update_bytes(self.app,out.getvalue())
    def test_migration_preserves_legacy_paths(self):
        from tools.migrate_workspace import migrate
        legacy=self.repo/'legacy';(legacy/'workspace/reports').mkdir(parents=True);(legacy/'workspace/reports/M01.md').write_text('legacy')
        (legacy/'student_code').mkdir();(legacy/'student_code/policies.py').write_text('code')
        dest=self.repo/'migrated';migrate(legacy,dest)
        self.assertEqual((dest/'reports/M01.md').read_text(),'legacy');self.assertEqual((dest/'student_code/policies.py').read_text(),'code')
        with self.assertRaises(ValueError):migrate(legacy,dest)
if __name__=='__main__':unittest.main()

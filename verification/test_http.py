import io, json, shutil, subprocess, sys, tempfile, threading, unittest, urllib.request, urllib.error, zipfile
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from course_app import app
from course_app.storage import initialize_workspace
ROOT=Path(__file__).resolve().parents[1]

class HTTPTests(unittest.TestCase):
    def test_save_test_export_and_resume(self):
        with tempfile.TemporaryDirectory() as temp:
            repo=Path(temp)/'project';repo.mkdir();course=repo/'course_app';work=repo/'workspace'
            shutil.copytree(ROOT/'course_app',course,ignore=shutil.ignore_patterns('__pycache__'))
            for name in ['app.py','START_MAC_LINUX.sh','START_WINDOWS.bat','README.md']:shutil.copy2(ROOT/name,repo/name)
            initialize_workspace(course,work)
            with patch.multiple(app,ROOT=course,REPO=repo,WORK=work,META_FILE=work/'project.json'):
                server=ThreadingHTTPServer(('127.0.0.1',0),app.H);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
                base=f'http://127.0.0.1:{server.server_port}'
                def get(path):
                    with urllib.request.urlopen(base+path) as r:return r.read()
                def post(path,data,token=app.TOKEN):
                    req=urllib.request.Request(base+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json','X-Course-Token':token})
                    with urllib.request.urlopen(req) as r:return json.loads(r.read())
                try:
                    data=json.loads(get('/api/course'));self.assertEqual(len(data['course']['modules']),10)
                    self.assertIn(b'id="moduleNav"',get('/'));self.assertIn(b'function templateReport',get('/assets/app.js'))
                    with self.assertRaises(urllib.error.HTTPError) as e:post('/api/report',{'module':'M05','text':'unauthorized'},token='wrong')
                    self.assertEqual(e.exception.code,403);e.exception.close()
                    post('/api/project',{'team_id':'TESTTEAM','current_session':9})
                    post('/api/report',{'module':'M05','text':'# M05\nStudent analysis preserved'})
                    model=next(iter(app.models.STARTERS.values()));post('/api/model-save',{'name':'m05_test','model':model})
                    engine=next(iter(app.engines.DEFAULTS));post('/api/save-run',{'module':'M05','engine':engine,'inputs':app.engines.DEFAULTS[engine]})
                    code='# independent implementation\ndef calculate_order_total(items,fee): return round(sum(items)+fee,2)\n'
                    post('/api/code',{'key':'policies','text':code})
                    post('/api/code',{'key':'student_tests','text':'import unittest\nfrom student_code.policies import calculate_order_total\nclass MyTests(unittest.TestCase):\n def test_total(self): self.assertEqual(calculate_order_total([10],5),15)\n'})
                    result=post('/api/tests',{'suite':'student'});self.assertEqual(result['exit_code'],0,result['log'])
                    self.assertEqual((work/'student_code/policies.py').read_text(),code)
                    state=json.loads(get('/api/state'));self.assertEqual(state['project']['team_id'],'TESTTEAM');self.assertEqual(len(state['module_progress']['M05']['runs']),1)
                    exported=get('/api/export');resume=Path(temp)/'resumed';resume.mkdir()
                    with zipfile.ZipFile(io.BytesIO(exported)) as z:
                        self.assertIn('workspace/student_code/policies.py',z.namelist());self.assertIn('course_app/app.py',z.namelist());self.assertNotIn('workspace_template',str(z.namelist()));z.extractall(resume)
                    cp=subprocess.run([sys.executable,'app.py','--self-check'],cwd=resume,capture_output=True,text=True);self.assertEqual(cp.returncode,0,cp.stderr)
                    cp=subprocess.run([sys.executable,'-c','from course_app.app import state; import json; print(json.dumps(state()))'],cwd=resume,capture_output=True,text=True);restored=json.loads(cp.stdout)
                    self.assertEqual(restored['project']['team_id'],'TESTTEAM');self.assertEqual(restored['project']['current_session'],9);self.assertEqual(restored['reports']['M05'],'# M05\nStudent analysis preserved');self.assertEqual((resume/'workspace/student_code/policies.py').read_text(),code)
                finally:server.shutdown();server.server_close();thread.join()

from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import argparse, base64, json, os, re, secrets, subprocess, sys, threading, time, webbrowser, zipfile, io
from . import engines, models
from .tools.apply_update import apply_update_bytes, current_version

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parent
WORK=REPO/'workspace'
from .storage import initialize_workspace
if '--self-check' not in sys.argv: initialize_workspace(ROOT, WORK)
LOCK=threading.Lock()
TOKEN=secrets.token_urlsafe(18)
CURRIC=json.loads((ROOT/'curriculum.json').read_text(encoding='utf-8'))
VERSION_INFO=json.loads((ROOT/'course_version.json').read_text(encoding='utf-8'))

NAME=re.compile(r'^[A-Za-z0-9_-]{1,60}$')
TEAM_RE=re.compile(r'^[A-Za-z0-9_-]{2,24}$')
META_FILE=WORK/'project.json'

def atomic(path,text):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True); tmp=path.with_suffix(path.suffix+'.tmp')
    with LOCK:
        tmp.write_text(text,encoding='utf-8'); os.replace(tmp,path)

def default_meta():
    return {'team_id':'TEAM','current_session':1,'last_export_session':0,'last_export_utc':None,'project_note':'One continuous project. Resume from your latest exported folder.'}

def project_meta():
    if not META_FILE.exists():
        atomic(META_FILE,json.dumps(default_meta(),indent=2))
    try:
        m=json.loads(META_FILE.read_text(encoding='utf-8'))
    except Exception:
        m=default_meta()
    base=default_meta(); base.update(m); return base

def module_for_session(session):
    for m in CURRIC['modules']:
        if session in m.get('sessions',[]): return m['code']
    return None

def save_meta(d):
    old=project_meta()
    team=d.get('team_id',old['team_id'])
    session=d.get('current_session',old['current_session'])
    if not isinstance(team,str) or not TEAM_RE.fullmatch(team): raise ValueError('Team ID: 2–24 letters, numbers, _ or -')
    if not isinstance(session,int) or session<1 or session>20: raise ValueError('current_session must be 1–20')
    old['team_id']=team; old['current_session']=session
    atomic(META_FILE,json.dumps(old,indent=2))
    return old

def report_progress(text):
    if not text: return {'saved':False,'unfinished':0,'word_count':0}
    return {'saved':True,'unfinished':text.count('[Write your answer here.]'),'word_count':len(text.split())}

def state():
    reports={p.stem:p.read_text(encoding='utf-8') for p in sorted((WORK/'reports').glob('M*.md'))}
    model_names=sorted(p.stem for p in (WORK/'models').glob('*.json'))
    run_names=sorted(p.name for p in (WORK/'runs').glob('*.json'))
    logs=sorted(p.name for p in (WORK/'logs').glob('*.txt'))
    mods={}
    for m in CURRIC['modules']:
        code=m['code']; prefix=code.lower()
        mods[code]={
            'report':report_progress(reports.get(code,'')),
            'models':[x for x in model_names if x.lower().startswith(prefix)],
            'runs':[x for x in run_names if x.startswith(code+'_')],
            'logs':logs if code=='M10' else []
        }
    return {'project':project_meta(),'reports':reports,'models':model_names,'runs':run_names,'logs':logs,'module_progress':mods}

def export_zip():
    meta=project_meta()
    meta['last_export_session']=meta['current_session']
    meta['last_export_utc']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
    atomic(META_FILE,json.dumps(meta,indent=2))
    manifest={
        'team_id':meta['team_id'],
        'current_session':meta['current_session'],
        'current_module':module_for_session(meta['current_session']),
        'exported_at_utc':meta['last_export_utc'],
        'resume_instruction':'Extract this ZIP into a writable folder and run app.py / START script from this exported copy. Do not restart from a clean starter.'
    }
    atomic(WORK/'EXPORT_MANIFEST.json',json.dumps(manifest,indent=2))
    bio=io.BytesIO(); skip={'instructor_private','.git','__pycache__','course_backups','workspace_template'}
    with zipfile.ZipFile(bio,'w',zipfile.ZIP_DEFLATED) as z:
        for p in REPO.rglob('*'):
            rel=p.relative_to(REPO)
            if rel.parts[0] not in {'course_app','workspace','app.py','START_MAC_LINUX.sh','START_WINDOWS.bat','README.md'}: continue
            if any(part in skip for part in rel.parts) or p.suffix=='.zip' or p.name.endswith('.tmp') or p.is_symlink(): continue
            if p.is_file(): z.write(p,rel.as_posix())
    return bio.getvalue(), meta

def checks():
    out={}
    for name,fn in engines.ENGINES.items(): out['engine_'+name]=fn(engines.DEFAULTS[name])
    for name,m in models.STARTERS.items(): out['model_'+name]=len(models.render(m))
    return out

class H(BaseHTTPRequestHandler):
    server_version='QuickBiteWorkbench/4.0'
    def log_message(self,fmt,*args): print('[web]',fmt%args)
    def _json(self,obj,status=200):
        b=json.dumps(obj,ensure_ascii=False).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def _text(self,text,ctype='text/plain; charset=utf-8',status=200):
        b=text.encode(); self.send_response(status); self.send_header('Content-Type',ctype); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def _body(self):
        n=int(self.headers.get('Content-Length','0'))
        if n<1 or n>15_000_000: raise ValueError('Invalid body size')
        return json.loads(self.rfile.read(n))
    def _guard(self):
        host=self.headers.get('Host','').split(':')[0]
        return host in ('127.0.0.1','localhost') and self.headers.get('X-Course-Token')==TOKEN
    def do_GET(self):
        u=urlparse(self.path); path=u.path
        if path=='/': return self._text((ROOT/'assets/index.html').read_text(encoding='utf-8'),'text/html; charset=utf-8')
        if path.startswith('/assets/'):
            p=(ROOT/path.lstrip('/')).resolve()
            if not p.is_relative_to((ROOT/'assets').resolve()) or not p.is_file(): return self._text('not found',status=404)
            c={'css':'text/css','js':'application/javascript'}.get(p.suffix[1:],'application/octet-stream')
            return self._text(p.read_text(encoding='utf-8'),c+'; charset=utf-8')
        if path=='/api/course': return self._json({'course':CURRIC,'simulator_defaults':engines.DEFAULTS,'model_starters':models.STARTERS,'token':TOKEN,'saved_state':state(),'version':VERSION_INFO})
        if path=='/api/state': return self._json(state())
        if path=='/api/project': return self._json(project_meta())
        if path=='/api/export':
            b,meta=export_zip(); team=re.sub(r'[^A-Za-z0-9_-]','_',meta['team_id']); sess=int(meta['current_session']); stamp=time.strftime('%Y%m%d',time.localtime())
            fn=f'QuickBite_{team}_after_S{sess:02d}_{stamp}.zip'
            self.send_response(200); self.send_header('Content-Type','application/zip'); self.send_header('Content-Disposition',f'attachment; filename="{fn}"'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(b))); self.end_headers(); return self.wfile.write(b)
        if path.startswith('/api/code/'):
            key=path.rsplit('/',1)[1]; mp={'policies':WORK/'student_code/policies.py','student_tests':WORK/'tests/test_student.py','supplied_tests':ROOT/'tests/test_m10.py'}
            if key not in mp: return self._json({'error':'unknown code key'},400)
            return self._json({'key':key,'text':mp[key].read_text(encoding='utf-8'),'read_only':key=='supplied_tests'})
        return self._text('not found',status=404)
    def do_POST(self):
        if not self._guard(): return self._json({'error':'forbidden; reload page if server restarted'},403)
        try:
            d=self._body(); path=urlparse(self.path).path
            if path=='/api/project': return self._json({'saved':True,'project':save_meta(d)})
            if path=='/api/update':
                fn=d.get('filename',''); raw=d.get('data_base64','')
                if not isinstance(fn,str) or not fn.lower().endswith('.zip'): raise ValueError('Choose the course update ZIP from Moodle.')
                if not isinstance(raw,str) or len(raw)>14_000_000: raise ValueError('Update package is missing or too large.')
                try: payload=base64.b64decode(raw,validate=True)
                except Exception: raise ValueError('Could not read update package.')
                result=apply_update_bytes(ROOT,payload,run_self_check=True)
                return self._json(result)
            if path=='/api/report':
                mod=d.get('module'); txt=d.get('text','')
                if mod not in {m['code'] for m in CURRIC['modules']} or not isinstance(txt,str): raise ValueError('invalid report')
                p=WORK/'reports'/f'{mod}.md'; atomic(p,txt); return self._json({'saved':True,'file':str(p.relative_to(REPO))})
            if path=='/api/check':
                txt=d.get('text',''); mod=d.get('module'); module=next((m for m in CURRIC['modules'] if m['code']==mod),None)
                sections=(module or {}).get('report_sections',CURRIC.get('report_headings',[])); req=[f'## {x}' for x in sections]; missing=[x for x in req if x not in txt]; placeholders=txt.count('[Write your answer here.]'); words=len(txt.split())
                return self._json({'required_sections':sections,'missing_headings':missing,'unfinished_placeholders':placeholders,'word_count':words,'note':'Structural completion only. Academic correctness is checked against the task requirements and evidence.'})
            if path in ('/api/simulate','/api/save-run'):
                name=d.get('engine'); inp=d.get('inputs')
                if name not in engines.ENGINES or not isinstance(inp,dict): raise ValueError('invalid simulator')
                res=engines.ENGINES[name](inp); payload={'engine':name,'inputs':inp,'result':res}
                if path.endswith('save-run'):
                    mod=d.get('module');
                    if mod not in {m['code'] for m in CURRIC['modules']}: raise ValueError('invalid module')
                    stamp=time.strftime('%Y%m%dT%H%M%SZ',time.gmtime()); fn=f'{mod}_{name}_{stamp}_{secrets.token_hex(2)}.json'; (WORK/'runs'/fn).write_text(json.dumps(payload,indent=2),encoding='utf-8'); payload['saved_file']=fn
                return self._json(payload)
            if path=='/api/model-preview':
                svg=models.render(d.get('model')); return self._json({'svg':svg,'check':'Structure valid. Semantic UML/DFD correctness still requires review.'})
            if path=='/api/model-save':
                name=d.get('name'); m=d.get('model')
                if not isinstance(name,str) or not NAME.fullmatch(name): raise ValueError('invalid model name')
                svg=models.render(m); js=json.dumps(m,indent=2); atomic(WORK/'models'/f'{name}.json',js); atomic(WORK/'models'/f'{name}.svg',svg); return self._json({'saved':True,'json':f'workspace/models/{name}.json','svg_file':f'workspace/models/{name}.svg','svg':svg})
            if path=='/api/code':
                key=d.get('key'); txt=d.get('text'); mp={'policies':WORK/'student_code/policies.py','student_tests':WORK/'tests/test_student.py'}
                if key not in mp or not isinstance(txt,str) or len(txt)>200000: raise ValueError('invalid code save')
                atomic(mp[key],txt); return self._json({'saved':True,'file':str(mp[key].relative_to(REPO))})
            if path=='/api/tests':
                suite=d.get('suite'); cmd=[sys.executable,'-m','course_app.run_student_tests',suite]
                if suite not in ('student','m10','all'): raise ValueError('unknown suite')
                try: cp=subprocess.run(cmd,cwd=REPO,text=True,capture_output=True,timeout=20); log=(cp.stdout+cp.stderr)
                except subprocess.TimeoutExpired as e: cp=None; log='TIMEOUT after 20 seconds\n'+str(e)
                fn={'student':'tests_student.txt','m10':'tests_m10.txt','all':'tests_all.txt'}[suite]; atomic(WORK/'logs'/fn,log); return self._json({'exit_code':124 if cp is None else cp.returncode,'log':log,'file':f'workspace/logs/{fn}'})
            return self._json({'error':'not found'},404)
        except Exception as e: return self._json({'error':str(e)},400)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--port',type=int,default=8765); ap.add_argument('--no-browser',action='store_true'); ap.add_argument('--self-check',action='store_true'); a=ap.parse_args()
    if a.self_check:
        from .validation import validate_course
        validate_course(ROOT)
        print(json.dumps(checks(),indent=2)); return
    srv=ThreadingHTTPServer(('127.0.0.1',a.port),H); url=f'http://127.0.0.1:{a.port}'; print('QuickBite workbench:',url); print('Stop with Ctrl+C')
    if not a.no_browser: threading.Timer(.5,lambda:webbrowser.open(url)).start()
    try: srv.serve_forever()
    except KeyboardInterrupt: pass

if __name__=='__main__': main()

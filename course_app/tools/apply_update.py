"""Format 2 updates target only course_app; legacy updates cannot undo separation."""
from pathlib import Path, PurePosixPath
import hashlib, io, json, os, shutil, subprocess, sys, tempfile, threading, time, zipfile
APP_ID='quickbite-workbench'
FORMAT_VERSION=2
UPDATE_LOCK=threading.Lock()
ALLOWED_EXACT={'__init__.py','app.py','curriculum.json','engines.py','models.py','course_version.json','CHANGELOG.md','storage.py','validation.py','run_student_tests.py','tools/__init__.py','tools/apply_update.py','tools/check_app.py','tests/__init__.py','tests/test_m10.py'}
ALLOWED_PREFIXES=('assets/','workspace_template/')

def _safe_rel(name):
    p=PurePosixPath(name)
    if not isinstance(name,str) or '\\' in name or p.is_absolute() or '..' in p.parts or not p.parts or p.as_posix()!=name:
        raise ValueError(f'Unsafe path in update: {name}')
    return name

def _version_tuple(v):
    if not isinstance(v,str) or len(v.split('.'))!=3 or not all(x.isdigit() for x in v.split('.')): raise ValueError('Expected semantic version X.Y.Z')
    return tuple(map(int,v.split('.')))

def current_version(root):
    return json.loads((Path(root)/'course_version.json').read_text())['version']

def _atomic_bytes(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent,delete=False) as f:
        tmp=Path(f.name);f.write(data)
    try: os.replace(tmp,path)
    finally: tmp.unlink(missing_ok=True)

def validate_update_bytes(root,raw):
    root=Path(root).resolve()
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        if len(z.namelist())!=len(set(z.namelist())): raise ValueError('Duplicate ZIP members')
        if sum(x.file_size for x in z.infolist())>30_000_000: raise ValueError('Update exceeds unpacked size limit')
        manifest=json.loads(z.read('update_manifest.json'))
        if manifest.get('app_id')!=APP_ID or manifest.get('format_version')!=FORMAT_VERSION: raise ValueError('Use a format 2 update for the Git baseline; legacy updates are incompatible.')
        old=current_version(root);new=manifest.get('version')
        if _version_tuple(new)<=_version_tuple(old): raise ValueError('Update must be newer than installed course')
        if _version_tuple(old)<_version_tuple(manifest.get('min_version','4.4.0')): raise ValueError('Installed version is below minimum')
        files=manifest.get('files');payload={}
        if not isinstance(files,dict) or 'course_version.json' not in files: raise ValueError('Missing version payload')
        for rel,expected in files.items():
            rel=_safe_rel(rel)
            if rel not in ALLOWED_EXACT and not any(rel.startswith(p) for p in ALLOWED_PREFIXES): raise ValueError(f'Protected or non-course file: {rel}')
            dest=root/rel
            if not dest.resolve().is_relative_to(root) or any(p.is_symlink() for p in [dest,*dest.parents]): raise ValueError('Symlink in update destination')
            data=z.read('payload/'+rel)
            if hashlib.sha256(data).hexdigest()!=expected: raise ValueError(f'Checksum failed: {rel}')
            payload[rel]=data
        version=json.loads(payload['course_version.json'])
        if version.get('version')!=new or version.get('app_id')!=APP_ID: raise ValueError('Version metadata mismatch')
    # Validate the complete candidate before touching installed files or student data.
    from course_app.validation import validate_course
    with tempfile.TemporaryDirectory() as folder:
        stage=Path(folder)/'course_app'
        shutil.copytree(root,stage,ignore=shutil.ignore_patterns('__pycache__','course_backups'))
        for rel,data in payload.items(): _atomic_bytes(stage/rel,data)
        validate_course(stage)
        cp=subprocess.run([sys.executable,'-m','course_app.app','--self-check'],cwd=folder,capture_output=True,text=True,timeout=30)
        if cp.returncode: raise ValueError('Candidate self-check failed: '+(cp.stdout+cp.stderr)[-3000:])
    return manifest,payload

def apply_update_bytes(root,raw,run_self_check=True):
    root=Path(root).resolve()
    if not UPDATE_LOCK.acquire(blocking=False): raise ValueError('Another update is in progress')
    try:
        manifest,payload=validate_update_bytes(root,raw);old=current_version(root)
        backup=root.parent/'course_backups'/(time.strftime('%Y%m%dT%H%M%S')+'_'+next(tempfile._get_candidate_names()))
        backup.mkdir(parents=True);original={}
        try:
            for rel,data in payload.items():
                dest=root/rel;original[rel]=dest.read_bytes() if dest.exists() else None
                if original[rel] is not None: _atomic_bytes(backup/rel,original[rel])
                _atomic_bytes(dest,data)
            if run_self_check:
                cp=subprocess.run([sys.executable,'app.py','--self-check'],cwd=root.parent,capture_output=True,text=True,timeout=30)
                if cp.returncode: raise RuntimeError('Installed self-check failed: '+(cp.stdout+cp.stderr)[-3000:])
            record={'from_version':old,'to_version':manifest['version'],'updated_files':sorted(payload),'backup':str(backup.relative_to(root.parent)),'restart_required':True,'ok':True,'title':manifest.get('title','Course update'),'notes':manifest.get('notes',[])}
            _atomic_bytes(backup/'UPDATE_RECORD.json',json.dumps(record,indent=2).encode())
            return record
        except Exception:
            for rel,data in original.items():
                if data is None: (root/rel).unlink(missing_ok=True)
                else: _atomic_bytes(root/rel,data)
            raise
    finally: UPDATE_LOCK.release()

def apply_update_file(root,path): return apply_update_bytes(Path(root),Path(path).read_bytes())

def main():
    if len(sys.argv)!=2: raise SystemExit('Usage: python -m course_app.tools.apply_update UPDATE.zip')
    print(json.dumps(apply_update_file(Path(__file__).resolve().parents[1],sys.argv[1]),indent=2))
    print('Restart this same project folder.')
if __name__=='__main__': main()

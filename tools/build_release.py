"""Build a clean starter and format 2 update from an exact clean Git tag."""
import argparse, hashlib, io, json, subprocess, tempfile, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def build(tag,output):
    if not tag.startswith('v'): raise ValueError('Use a version tag such as v4.4.0')
    subprocess.run(['git','show-ref','--verify','refs/tags/'+tag],cwd=ROOT,check=True,capture_output=True)
    status=subprocess.check_output(['git','status','--porcelain','--untracked-files=normal'],cwd=ROOT,text=True)
    if status: raise ValueError('Commit source changes before building a release')
    archive=subprocess.check_output(['git','archive','--format=zip','refs/tags/'+tag],cwd=ROOT)
    with tempfile.TemporaryDirectory() as temp:
        with zipfile.ZipFile(io.BytesIO(archive)) as z:z.extractall(temp)
        stage=Path(temp);version=json.loads((stage/'course_app/course_version.json').read_text())
        if tag!='v'+version['version']: raise ValueError('Tag and course version disagree')
        subprocess.run(['python3','app.py','--self-check'],cwd=stage,check=True,capture_output=True)
        subprocess.run(['python3','-m','unittest','discover','-s','verification','-v'],cwd=stage,check=True,capture_output=True)
        output.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(output/f'QuickBite_STUDENT_{tag}.zip','w',zipfile.ZIP_DEFLATED) as z:
            for p in sorted(stage.rglob('*')):
                rel=p.relative_to(stage)
                if p.is_file() and '__pycache__' not in rel.parts and (rel.parts[0]=='course_app' or rel.as_posix() in ['app.py','START_MAC_LINUX.sh','START_WINDOWS.bat','README.md']):z.write(p,'QuickBite/'+rel.as_posix())
        files={p.relative_to(stage/'course_app').as_posix():p.read_bytes() for p in (stage/'course_app').rglob('*') if p.is_file() and '__pycache__' not in p.parts}
        # Include only updater-approved course files.
        import sys
        sys.path.insert(0,str(stage))
        from course_app.tools.apply_update import ALLOWED_EXACT,ALLOWED_PREFIXES
        files={rel:data for rel,data in files.items() if rel in ALLOWED_EXACT or any(rel.startswith(x) for x in ALLOWED_PREFIXES)}
        manifest={'app_id':version['app_id'],'format_version':2,'version':version['version'],'min_version':'4.4.0','title':version['label'],'files':{rel:hashlib.sha256(data).hexdigest() for rel,data in files.items()}}
        with zipfile.ZipFile(output/f'QuickBite_Course_Update_{tag}.zip','w',zipfile.ZIP_DEFLATED) as z:
            z.writestr('update_manifest.json',json.dumps(manifest,indent=2))
            for rel,data in files.items():z.writestr('payload/'+rel,data)
    print('Built release from',tag,'in',output)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('tag');parser.add_argument('--output',type=Path,default=ROOT/'dist');args=parser.parse_args();build(args.tag,args.output)

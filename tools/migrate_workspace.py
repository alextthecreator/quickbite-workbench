"""Copy legacy student files; refuse to replace any existing destination."""
from pathlib import Path
import argparse, shutil

def migrate(source, destination):
    source=Path(source).resolve();destination=Path(destination).resolve()
    if destination.exists(): raise ValueError('Destination already exists; choose a new workspace folder to avoid overwriting work.')
    if not (source/'workspace').is_dir(): raise ValueError('Legacy folder must contain workspace/')
    destination.parent.mkdir(parents=True,exist_ok=True)
    import tempfile
    with tempfile.TemporaryDirectory(dir=destination.parent) as temp:
        stage=Path(temp)/'workspace';shutil.copytree(source/'workspace',stage,ignore=shutil.ignore_patterns('__pycache__'))
        for name in ['student_code','tests']:
            if (source/name).is_dir(): shutil.copytree(source/name,stage/name,ignore=shutil.ignore_patterns('__pycache__','test_m10.py'),dirs_exist_ok=True)
        for name in ['student_code','tests']:
            (stage/name).mkdir(exist_ok=True);(stage/name/'__init__.py').touch(exist_ok=True)
        if destination.exists(): raise ValueError('Destination was created during migration; refusing to overwrite it.')
        stage.rename(destination)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('legacy_folder');parser.add_argument('--destination',type=Path,default=Path(__file__).resolve().parents[1]/'workspace');args=parser.parse_args()
    migrate(args.legacy_folder,args.destination);print('Student work copied to',args.destination)

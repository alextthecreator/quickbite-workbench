"""Seed only absent files. Course updates never write existing student files."""
from pathlib import Path
import json

def initialize_workspace(course_root, workspace):
    workspace=Path(workspace)
    for source in sorted((Path(course_root)/'workspace_template').rglob('*')):
        if not source.is_file(): continue
        target=workspace/source.relative_to(Path(course_root)/'workspace_template')
        target.parent.mkdir(parents=True,exist_ok=True)
        try:
            with target.open('xb') as out: out.write(source.read_bytes())
        except FileExistsError: pass
    for folder in ['reports','models','runs','logs','attachments']:
        (workspace/folder).mkdir(parents=True,exist_ok=True)

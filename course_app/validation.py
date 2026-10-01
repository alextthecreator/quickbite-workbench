"""Release/update checks include the JavaScript that builds Project Modules."""
import json, shutil, subprocess
from pathlib import Path

def validate_course(root):
    root=Path(root)
    course=json.loads((root/'curriculum.json').read_text())
    modules=course.get('modules',[])
    if [m['code'] for m in modules] != [f'M{i:02}' for i in range(1,11)]:
        raise ValueError('Expected M01–M10 in course order')
    sessions=[]
    for module in modules:
        sessions.extend(module['sessions'])
        tasks=module.get('task_specs',[])
        if len(tasks)!=len(module['steps']) or [t['task'] for t in tasks]!=list(range(1,len(tasks)+1)):
            raise ValueError(f"Incomplete task guidance for {module['code']}")
        for task in tasks:
            for key in ['instruction','save_to','minimum_requirements','complete_when']:
                if not task.get(key): raise ValueError(f"Missing {key} in {module['code']} task {task['task']}")
        assigned=[n for sp in module['session_plan'] for n in sp['task_numbers']]
        if sorted(assigned)!=list(range(1,len(tasks)+1)): raise ValueError('Session/task mapping incomplete')
    if sorted(sessions)!=list(range(1,21)): raise ValueError('Expected sessions 1–20 exactly once')
    node=shutil.which('node')
    if not node: raise RuntimeError('Node.js is required for release/update validation. Install Node.js, then retry; no course files were accepted.')
    subprocess.run([node,'--check',str(root/'assets/app.js')],check=True,capture_output=True,text=True)
    html=(root/'assets/index.html').read_text()
    if 'id="moduleNav"' not in html: raise ValueError('Missing Project Modules container')
    return {'modules':len(modules),'tasks':sum(len(m['task_specs']) for m in modules),'javascript':'passed'}

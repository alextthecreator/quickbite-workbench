"""Refresh browser metadata when simulator defaults/model starters change."""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from course_app import engines,models
(ROOT/'web_src/tool-data.json').write_text(json.dumps({'simulator_defaults':engines.DEFAULTS,'model_starters':models.STARTERS},indent=2)+'\n')

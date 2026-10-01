import json,unittest
from pathlib import Path
from course_app import engines,models
class MetadataTests(unittest.TestCase):
    def test_browser_metadata_matches_original_python_tools(self):
        path=Path(__file__).resolve().parents[1]/'web_src/tool-data.json'
        if not path.exists():self.skipTest('Local-only release; browser metadata not included')
        self.assertEqual(json.loads(path.read_text()),{'simulator_defaults':engines.DEFAULTS,'model_starters':models.STARTERS})

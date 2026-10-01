"""Run student work separately from app regression tests."""
import importlib.util, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent
WORK=ROOT.parent/'workspace'

def suite(kind):
    sys.path.insert(0,str(WORK))
    loader=unittest.TestLoader(); result=unittest.TestSuite()
    if kind in ('student','m10','all'):
        result.addTests(loader.discover(str(WORK/'tests'),pattern='test_*.py',top_level_dir=str(WORK)))
    if kind in ('m10','all'):
        spec=importlib.util.spec_from_file_location('quickbite_supplied_tests',ROOT/'tests/test_m10.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        result.addTests(loader.loadTestsFromModule(module))
    return result

if __name__=='__main__':
    if len(sys.argv)!=2 or sys.argv[1] not in ('student','m10','all'): raise SystemExit('Expected student, m10 or all')
    result=unittest.TextTestRunner(verbosity=2).run(suite(sys.argv[1]))
    raise SystemExit(not result.wasSuccessful())

/* Python runs inside a disposable worker; no student code reaches a server. */
const PYODIDE_URL='https://cdn.jsdelivr.net/pyodide/v0.29.2/full/';
let python;
async function initialize(){
 importScripts(PYODIDE_URL+'pyodide.js');
 python=await loadPyodide({indexURL:PYODIDE_URL});
 const sources=await Promise.all(['engines.py','models.py'].map(async name=>{const r=await fetch('/python/'+name);if(!r.ok)throw Error('Cannot load '+name);return [name,await r.text()];}));
 for(const [name,text] of sources)python.FS.writeFile('/home/pyodide/'+name,text);
 await python.runPythonAsync('import sys, json\nsys.path.insert(0,"/home/pyodide")\nimport engines, models');
}
const ready=initialize();
ready.then(()=>postMessage({ready:true})).catch(e=>postMessage({startup_error:String(e)}));
onmessage=async event=>{
 const {id,operation,payload}=event.data;
 try{
  await ready;python.globals.set('_request_json',JSON.stringify(payload));
  let result;
  if(operation==='simulate') result=await python.runPythonAsync('json.dumps(engines.ENGINES[json.loads(_request_json)["engine"]](json.loads(_request_json)["inputs"]))');
  else if(operation==='render') result=await python.runPythonAsync('json.dumps({"svg":models.render(json.loads(_request_json)["model"]),"check":"Structure valid. Semantic correctness still requires review."})');
  else if(operation==='tests'){
   python.FS.mkdirTree('/home/pyodide/workspace/student_code');python.FS.mkdirTree('/home/pyodide/workspace/tests');
   for(const [path,text] of Object.entries(payload.files))python.FS.writeFile('/home/pyodide/'+path,text);
   result=await python.runPythonAsync(`
import io, contextlib, unittest, types, traceback, importlib
_request=json.loads(_request_json)
sys.path.insert(0,"/home/pyodide/workspace")
_output=io.StringIO()
_test_result=None
try:
    with contextlib.redirect_stdout(_output), contextlib.redirect_stderr(_output):
        _suite=unittest.defaultTestLoader.discover("/home/pyodide/workspace/tests",pattern="test_*.py",top_level_dir="/home/pyodide/workspace")
        if _request["suite"] in ("m10","all"):
            _mod=types.ModuleType("quickbite_supplied_tests")
            exec(compile(_request["supplied_tests"],"supplied_tests.py","exec"),_mod.__dict__)
            _suite.addTests(unittest.defaultTestLoader.loadTestsFromModule(_mod))
        _test_result=unittest.TextTestRunner(stream=_output,verbosity=2).run(_suite)
except BaseException:
    traceback.print_exc(file=_output)
json.dumps({"exit_code":0 if _test_result is not None and _test_result.wasSuccessful() else 1,"log":_output.getvalue()})
`);
  }else throw Error('Unknown Python operation');
  postMessage({id,result:JSON.parse(result)});
 }catch(e){postMessage({id,error:String(e)});}
};

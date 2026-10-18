"""Run the gateway's existing API regressions against the staged implementation."""
import importlib.util,os,sys,unittest
from pathlib import Path
P=Path(__file__).resolve().parent;ROOT=Path('/home/cridergpt2026/cridergpt-chat-api');sys.path[:0]=[str(P),str(ROOT)];os.environ['CRIDERGPT_API_ROOT']=str(ROOT)
spec=importlib.util.spec_from_file_location('server',P/'stage/gateway_server.py');server=importlib.util.module_from_spec(spec);sys.modules['server']=server;spec.loader.exec_module(server)
spec=importlib.util.spec_from_file_location('existing_gateway_tests',ROOT/'tests/test_api.py');tests=importlib.util.module_from_spec(spec);spec.loader.exec_module(tests)
if __name__=='__main__':
 result=unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromModule(tests));sys.exit(not result.wasSuccessful())

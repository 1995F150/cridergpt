"""Execute the staged real send handler with isolated transports/stores."""
import ast, json, threading, unittest
from pathlib import Path
from types import SimpleNamespace
from conversation_context import text_context

class ContextTests(unittest.TestCase):
    def test_switch_preserves_cross_model_exchange(self):
        history=[{'role':'user','content':'Remember 3.55','model':'smart'}, {'role':'assistant','content':'Recorded','model':'smart'}]
        self.assertEqual(text_context(history,'What ratio?'),[{'role':'user','content':'Remember 3.55'},{'role':'assistant','content':'Recorded'},{'role':'user','content':'What ratio?'}])

    def test_failed_and_image_pairs_are_not_replayed_or_repaired(self):
        history=[]
        for metadata in [{'incomplete':True},{'images':['fixture']},{'answer_origin':'pipeline_error'}]:
            history += [{'role':'user','content':'old'}, {'role':'assistant','content':'bad','metadata_json':json.dumps(metadata)}]
        history += [{'role':'user','content':'orphan'}, {'role':'user','content':'new'}, {'role':'assistant','content':'valid'}]
        self.assertEqual([m['content'] for m in text_context(history,'next')],['new','valid','next'])
        self.assertEqual(len(history),9)

    def test_bounded_context_keeps_latest_question(self):
        history=[{'role':role,'content':str(i)} for i in range(6) for role in ['user','assistant']]
        self.assertEqual(len(text_context(history,'latest')),9)
        self.assertEqual(text_context(history,'latest')[-1]['content'],'latest')

    def test_staged_send_switches_a_b_a_without_resetting_conversation(self):
        tree=ast.parse(Path(__file__).with_name('stage').joinpath('engine_routes.py').read_text())
        fn=next(node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name=='send')
        fn.decorator_list=[];fn.args.defaults=[ast.Constant(value=None)]
        fn.args.args[0].annotation=None
        # Resolve only this installed helper; no production auth or DB imports.
        import sys, types, conversation_context
        package=types.ModuleType('native_chat_integration.history_sync');package.__path__=[]
        previous={k:sys.modules.get(k) for k in ['native_chat_integration.history_sync','native_chat_integration.history_sync.conversation_context']}
        sys.modules['native_chat_integration.history_sync']=package
        sys.modules['native_chat_integration.history_sync.conversation_context']=conversation_context
        class Store:
            def __init__(self):self.rows=[]
            def messages(self,user,conversation):
                assert (user,conversation)==('fixture','same-chat');return list(self.rows)
            def append(self,user,conversation,role,content,model):
                assert conversation=='same-chat';self.rows.append(dict(role=role,content=content,model=model));return len(self.rows)
            def memories(self,user):return []
        store=Store();calls=[]
        def native(model,messages,account):
            calls.append((model,messages));return {'model':model,'response':'answer-'+model}
        env={'send_lock':threading.Lock(),'Send':object,'Depends':lambda x:None,'auth':None,'models':lambda user:{'models':[{'id':'A'},{'id':'B'}]},'db':lambda:store,'decide':lambda *a:{'action':'text'},'native':native,'public_plan':lambda x:x,'json':json}
        try:
            exec(compile(ast.fix_missing_locations(ast.Module(body=[fn],type_ignores=[])),'<staged-send>','exec'),env)
            for model in ['A','B','A']:
                body=SimpleNamespace(conversation_id='same-chat',model=model,message='question-'+model,web_fallback='none',routing='text',web_search=False,client_request_id=None)
                self.assertEqual(env['send'](body,'fixture')['model'],model)
            self.assertEqual([call[0] for call in calls],['A','B','A'])
            self.assertEqual([len(call[1]) for call in calls],[1,3,5])
            self.assertEqual([row['model'] for row in store.rows if row['role']=='assistant'],['A','B','A'])
        finally:
            for key,value in previous.items():
                if value is None:sys.modules.pop(key,None)
                else:sys.modules[key]=value

if __name__=='__main__':unittest.main()

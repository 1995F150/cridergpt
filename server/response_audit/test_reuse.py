"""Real staged handler tests with isolated storage and inference; no production data."""
import ast
import hashlib
import json
import logging
import sys
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
P=Path(__file__).resolve().parent
sys.path[:0]=[str(P/'stage'),'/home/cridergpt2026/cridergpt-engine-verified/validation-tools','/home/cridergpt2026/cridergpt-engine-verified']
from candidate_serving import CandidateServing

class HTTPException(Exception):
    def __init__(self,status_code,detail):self.status_code=status_code;super().__init__(detail)
class Body(SimpleNamespace):
    def model_dump(self,exclude):return {k:v for k,v in vars(self).items() if k not in exclude}
class Store:
    def __init__(self):self.rows={}
    def messages(self,user,conversation):return list(self.rows.get((user,conversation),[]))
    def append(self,user,conversation,role,content,model):
        rows=self.rows.setdefault((user,conversation),[])
        rows.append(dict(id=len(rows)+1,role=role,content=content,model=model));return len(rows)
    def annotate_message(self,user,conversation,id,metadata):self.rows[(user,conversation)][id-1]['metadata_json']=json.dumps(metadata)
    def memories(self,user):return []

def handler_fixture():
    tree=ast.parse((P/'stage/engine_routes.py').read_text());nodes=[]
    for node in tree.body:
        if isinstance(node,ast.FunctionDef) and node.name in {'send','request_fingerprint'}:
            node.decorator_list=[]
            if node.name=='send':node.args.defaults=[ast.Constant(None)];node.args.args[0].annotation=None
            nodes.append(node)
    store=Store();calls=[]
    def native(model,messages,account):
        calls.append((model,messages));return {'model':model,'response':'reply:'+messages[-1]['content']}
    env=dict(hashlib=hashlib,json=json,HTTPException=HTTPException,send_lock=threading.Lock(),models=lambda u:{'models':[{'id':'A'},{'id':'B'}]},db=lambda:store,decide=lambda *a:{'action':'text'},public_plan=lambda p:p,native=native)
    exec(compile(ast.fix_missing_locations(ast.Module(body=nodes,type_ignores=[])),'<real-handler>','exec'),env)
    return env['send'],store,calls

def body(**changes):
    return Body(**(dict(model='A',message='Hey there',conversation_id='chat',client_request_id='fixture-id',web_fallback='none',routing='text',web_search=False,search_query=None,external_consent=False)|changes))

class RetryTests(unittest.TestCase):
    def setUp(self):self.send,self.store,self.calls=handler_fixture()
    def test_exact_retry_returns_same_message_without_second_inference(self):
        first=self.send(body(),'user');second=self.send(body(),'user')
        self.assertTrue(second['deduplicated']);self.assertEqual(first['message_id'],second['message_id']);self.assertEqual(len(self.calls),1)
    def test_changed_prompt_model_or_routing_rejects_retry(self):
        self.send(body(),'user')
        for changes in [dict(message='Sky color?'),dict(model='B'),dict(routing='auto')]:
            with self.assertRaises(HTTPException) as caught:self.send(body(**changes),'user')
            self.assertEqual(caught.exception.status_code,409)
        self.assertEqual(len(self.calls),1);self.assertEqual(len(self.store.messages('user','chat')),2)
    def test_retry_is_scoped_to_owner_and_conversation(self):
        for owner,conversation in [('one','chat'),('two','chat'),('one','other')]:self.send(body(conversation_id=conversation),owner)
        self.assertEqual(len(self.calls),3)
    def test_new_request_gets_new_prompt_and_model_history(self):
        self.send(body(),'user');result=self.send(body(model='B',message='Sky color?',client_request_id='new'),'user')
        self.assertEqual(result['model'],'B');self.assertEqual(result['response'],'reply:Sky color?')
        self.assertEqual([m['content'] for m in self.calls[-1][1]],['Hey there','reply:Hey there','Sky color?'])
    def test_legacy_id_without_fingerprint_fails_closed(self):
        self.send(body(),'user');self.store.annotate_message('user','chat',2,{'client_request_id':'fixture-id'})
        with self.assertRaises(HTTPException) as caught:self.send(body(),'user')
        self.assertEqual(caught.exception.status_code,409)

class DiagnosticsTests(unittest.TestCase):
    def test_distinct_requests_have_ids_hashes_without_content(self):
        runtime=CandidateServing([])
        def generate(name,messages,*a,**kw):return dict(response=messages[-1]['content']+' answer',checkpoint='fixture-100',weights_sha256='fixture-sha',finish_reason='eos')
        with patch.object(runtime,'_generate',side_effect=generate), self.assertLogs('cridergpt.request_audit',level='INFO') as logs:
            first=runtime.generate('fixture',[dict(role='user',content='private unique one')]);second=runtime.generate('fixture',[dict(role='user',content='private unique two')])
        self.assertNotEqual(first['adapter_request_id'],second['adapter_request_id'])
        self.assertNotEqual(first['prompt_sha256'],second['prompt_sha256']);self.assertNotEqual(first['response_sha256'],second['response_sha256'])
        self.assertNotIn('private unique',str(logs.output))
        for row in logs.records:
            event=json.loads(row.getMessage());self.assertEqual(event['checkpoint'],'fixture-100');self.assertEqual(event['weights_sha256'],'fixture-sha')
    def test_info_events_emit_without_root_logging_configuration(self):
        import subprocess
        code = "import sys;sys.path[:0]=" + repr(sys.path[:3]) + ";from candidate_serving import CandidateServing;CandidateServing._generate=lambda *a,**k:dict(response='private answer',checkpoint='fixture',weights_sha256='fixture');CandidateServing([]).generate('fixture',[dict(role='user',content='private input')])"
        result = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True, check=True)
        event = json.loads(result.stderr.strip())
        self.assertEqual(event['event'], 'candidate_generation')
        self.assertTrue(event['prompt_sha256'] and event['response_sha256'])
        self.assertNotIn('private', result.stderr)

    def test_failure_is_content_free_and_raised(self):
        with patch.object(CandidateServing,'_generate',side_effect=RuntimeError('private secret')),self.assertLogs('cridergpt.request_audit') as logs:
            with self.assertRaises(RuntimeError):CandidateServing([]).generate('fixture',[dict(role='user',content='private question')])
        self.assertNotIn('private',str(logs.output));self.assertIn('failure',str(logs.output))
    def test_tokenizer_returns_explicit_input_ids(self):
        # Execute the real nested prompt formatter, with a BatchEncoding-like result.
        tree=ast.parse((P/'stage/candidate_serving.py').read_text())
        fn=next(n for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) and n.name=='encode')
        calls=[];sentinel=object()
        class Tokenizer:
            def apply_chat_template(self,items,**kw):calls.append((items,kw));return {'input_ids':sentinel,'attention_mask':'other'}
        env={'self':SimpleNamespace(tokenizer=Tokenizer()),'native':False,'persona':False,'personalization_context':'','serialize_messages':lambda *a:None}
        exec(compile(ast.fix_missing_locations(ast.Module(body=[fn],type_ignores=[])),'<formatter>','exec'),env)
        self.assertIs(env['encode']([dict(role='user',content='one')]),sentinel)
        self.assertTrue(calls[0][1]['return_dict'])


class MeasuredRetryTests(unittest.TestCase):
    def test_metrics_annotation_preserves_retry_binding(self):
        from collections import defaultdict,deque
        from datetime import datetime,timezone
        import time,uuid
        send,store,calls=handler_fixture();events=[];store.record_request=events.append
        tree=ast.parse((P/'stage/engine_routes.py').read_text())
        fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='measured_send')
        fn.decorator_list=[];fn.args.defaults=[ast.Constant(None)];fn.args.args[0].annotation=None
        metric=next(n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='SAFE_METRICS' for t in n.targets))
        env=send.__globals__ | dict(send=send,datetime=datetime,timezone=timezone,time=time,uuid=uuid,lock=threading.Lock(),send_limits=defaultdict(deque))
        exec(compile(ast.fix_missing_locations(ast.Module(body=[metric,fn],type_ignores=[])),'<real-metrics>','exec'),env)
        env['measured_send'](body(),'user');result=env['measured_send'](body(),'user')
        self.assertTrue(result['deduplicated']);self.assertEqual(len(calls),1)
        saved=json.loads(store.messages('user','chat')[-1]['metadata_json'])
        self.assertEqual(saved['request_fingerprint'],env['request_fingerprint'](body()))
        self.assertEqual(len(events),2);self.assertIn('request_id',events[-1]['metadata'])

if __name__=='__main__':unittest.main()

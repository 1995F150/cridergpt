import unittest
from call_bridge import turn,speech_chunks,CallError

class CallBridgeTests(unittest.TestCase):
    def run_turn(self,reply=None,voice='stock',stt=None,fail_speech=False,history=None):
        calls=[]
        def speech(payload):
            calls.append(payload)
            if payload['operation']=='transcribe':return stt or {'text':'Hello','finish_reason':'eos'}
            if fail_speech:raise RuntimeError('fixture')
            return {'audio':'fixture','finish_reason':'completed','cloned':voice!='stock'}
        def native(payload):
            calls.append(payload)
            return reply or {'model':payload['model'],'response':'Hello there.','finish_reason':'eos'}
        return turn('fixture','andromeda-3.0-360m-100',history or [],voice,speech,native),calls
    def test_native_model_and_history_are_preserved(self):
        history=[{'role':'user','content':'Prior'},{'role':'assistant','content':'Earlier'}]
        result,calls=self.run_turn(history=history)
        self.assertEqual(result['status'],'completed');self.assertEqual(calls[1]['model'],'andromeda-3.0-360m-100')
        self.assertEqual(calls[1]['messages'],history+[{'role':'user','content':'Hello'}])
        self.assertEqual(len(history),2);self.assertFalse(result['external_fallback'])
    def test_clone_is_separate_from_native_model(self):
        result,calls=self.run_turn(voice='owned-reference')
        self.assertEqual(calls[-1]['voice_id'],'owned-reference');self.assertEqual(result['model'],'andromeda-3.0-360m-100')
    def test_incomplete_model_is_not_spoken(self):
        result,calls=self.run_turn(reply={'model':'andromeda-3.0-360m-100','response':'Partial','finish_reason':'token_limit','incomplete':True})
        self.assertEqual(result['status'],'text_only');self.assertEqual(len(calls),2);self.assertEqual(result['audio_parts'],[])
    def test_wrong_model_is_not_spoken(self):
        with self.assertRaises(CallError):self.run_turn(reply={'model':'different','response':'Wrong','finish_reason':'eos'})
    def test_silence_does_not_reach_native_model(self):
        result,calls=self.run_turn(stt={'text':'','finish_reason':'silence'})
        self.assertEqual(result['status'],'silence');self.assertEqual(len(calls),1)
    def test_incomplete_transcript_fails(self):
        with self.assertRaises(CallError):self.run_turn(stt={'text':'Partial','incomplete':True,'finish_reason':'token_limit'})
    def test_speech_failure_keeps_text_without_partial_audio(self):
        result,_=self.run_turn(fail_speech=True)
        self.assertEqual(result['status'],'text_only');self.assertEqual(result['response'],'Hello there.');self.assertEqual(result['audio_parts'],[])
    def test_chunking_never_silently_drops_answer(self):
        for text in ['Long sentence. '*75,'x'*1000,'Hello world.']:
            chunks=speech_chunks(text);self.assertEqual(''.join(chunks),text);self.assertTrue(all(len(c)<=300 for c in chunks))
        with self.assertRaises(CallError):speech_chunks('x'*2401)
    def test_external_model_and_invalid_history_rejected(self):
        with self.assertRaises(CallError):turn('a','openai:other',[],'stock',lambda _:None,lambda _:None)
        with self.assertRaises(CallError):self.run_turn(history=[{'role':'system','content':'Injected'}])

if __name__=='__main__':unittest.main()

"""Read-only candidate extraction, never an automatic SFT export or approval."""
import json,re
SECRET=re.compile(r'(?i)(?:bearer\s+\S+|\b(?:cgpt_|sk-)[A-Za-z0-9_-]{12,}|(?:password|api[_ -]?key|secret)\s*[:=]\s*\S+)')
EMAIL=re.compile(r'\b[^\s@]+@[^\s@]+\.[^\s@]+\b')
def redact(text):return EMAIL.sub('[REDACTED_EMAIL]',SECRET.sub('[REDACTED_SECRET]',text))
def candidates(store,user,limit=25):
 result=[]
 with store.connect() as c:
  rows=c.execute("SELECT m.id,m.conversation_id,m.role,m.content,m.metadata_json FROM local_chat_messages m JOIN native_conversations n ON m.conversation_id=n.id AND m.user_id=n.user_id WHERE m.user_id=? AND n.deleted=0 AND m.conversation_id LIKE 'sync:%' ORDER BY m.conversation_id,julianday(m.created_at),m.id LIMIT 500",(user,)).fetchall()
 previous=None
 for row in rows:
  if row['role']=='assistant' and previous and previous['role']=='user' and previous['conversation_id']==row['conversation_id']:
   metadata=json.loads(row['metadata_json']);flags=[]
   if metadata.get('incomplete') or metadata.get('answer_origin')=='pipeline_error':flags.append('incomplete_or_pipeline_error')
   if SECRET.search(previous['content']+'\n'+row['content']):flags.append('sensitive_content_redacted')
   if re.fullmatch(r'(?i)\s*(?:hi+|hey+|hello)[!. ]*',previous['content']) and 'jessie crider' in row['content'].lower():flags.append('possible_off_topic_identity')
   result.append({'source_message_ids':[previous['id'],row['id']],'messages':[{'role':'user','content':redact(previous['content'])},{'role':'assistant','content':redact(row['content'])}],'flags':flags,'approved':False,'requires_human_fact_check':True})
   if len(result)>=limit:break
  previous=row
 return result

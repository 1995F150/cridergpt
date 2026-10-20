"""Owner/scoped private voice credentials. Plain keys are never stored in SQLite."""
import hashlib
import json
import re
import secrets
import sqlite3
import time
from pathlib import Path

SCOPES={'status','stt','tts','voices:read','voices:enroll','voices:revoke'}
class AuthStore:
 def __init__(self,root):
  self.root=Path(root);self.root.mkdir(parents=True,exist_ok=True,mode=0o700)
  path=self.root/'auth.sqlite3'
  if path.is_symlink():raise ValueError('Unsafe auth path')
  self.db=sqlite3.connect(path);path.chmod(0o600)
  self.db.execute('CREATE TABLE IF NOT EXISTS keys (digest TEXT PRIMARY KEY,owner TEXT NOT NULL,label TEXT NOT NULL,scopes TEXT NOT NULL,expires REAL NOT NULL,revoked INTEGER NOT NULL DEFAULT 0)');self.db.commit()
 def issue(self,owner,label,scopes,days=90):
  if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}',owner) or not scopes or not set(scopes)<=SCOPES or not 1<=days<=365:raise ValueError('Invalid key settings')
  token='cv_'+secrets.token_urlsafe(32)
  self.db.execute('INSERT INTO keys(digest,owner,label,scopes,expires) VALUES(?,?,?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),owner,label,json.dumps(sorted(scopes)),time.time()+days*86400));self.db.commit()
  return token
 def verify(self,token,scope):
  if not isinstance(token,str) or not token.startswith('cv_') or len(token)>100:return None
  row=self.db.execute('SELECT owner,scopes FROM keys WHERE digest=? AND revoked=0 AND expires>?',(hashlib.sha256(token.encode()).hexdigest(),time.time())).fetchone()
  if not row or scope not in json.loads(row[1]):return None
  return row[0]
 def revoke(self,token):
  self.db.execute('UPDATE keys SET revoked=1 WHERE digest=?',(hashlib.sha256(token.encode()).hexdigest(),));self.db.commit()
 def close(self):self.db.close()

"""One private Unix socket; model subprocesses stay outside the tiny public gateway cgroup."""
import json,os,socketserver
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from vision_bridge import SOCKET,analyze_local
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def setup(self):
  self.request.settimeout(5);super().setup()
 def reply(self,status,body):
  data=json.dumps(body).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers()
  try:self.wfile.write(data)
  except (BrokenPipeError,ConnectionResetError):pass
 def do_GET(self):
  return self.reply(200,{'status':'ok'}) if self.path=='/health' else self.reply(404,{'error':'not_found'})
 def do_POST(self):
  if self.path!='/analyze':return self.reply(404,{'error':'not_found'})
  try:
   size=int(self.headers.get('Content-Length','0'))
   if self.headers.get('Transfer-Encoding') or not 0<size<=4_230_000:raise ValueError()
   raw=self.rfile.read(size)
   if len(raw)!=size:raise ValueError()
   data=json.loads(raw)
   if not isinstance(data,dict) or set(data)!={'image_base64','question'}:raise ValueError()
   if not isinstance(data['image_base64'],str) or not 0<len(data['image_base64'])<=4_194_404:raise ValueError()
   if not isinstance(data['question'],str) or not 1<=len(data['question'])<=500:raise ValueError()
  except Exception:return self.reply(400,{'error':'invalid_image_request'})
  try:return self.reply(200,analyze_local(data['image_base64'],data['question']))
  except TimeoutError:return self.reply(504,{'error':'vision_timeout'})
  except Exception:return self.reply(503,{'error':'vision_failed'})
class Server(socketserver.UnixStreamServer):
 request_queue_size=1
if __name__=='__main__':
 if not SOCKET.parent.is_dir():raise SystemExit('Use the managed service runtime directory')
 if SOCKET.exists():SOCKET.unlink()
 try:
  with Server(str(SOCKET),Handler) as server:
   os.chmod(SOCKET,0o600);server.serve_forever()
 finally:
  if SOCKET.exists():SOCKET.unlink()

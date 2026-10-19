"""Read-only comparison of ordinary, TCP and encrypted DNS for public CriderGPT hosts."""
import concurrent.futures,datetime,ipaddress,json,subprocess,urllib.request
HOSTS=['cridergpt.com','www.cridergpt.com','api.cridergpt.com']
def dig(host,kind,tcp):
    command=['dig','@1.1.1.1',host,kind,'+short','+time=3','+tries=1']+(['+tcp'] if tcp else [])
    try:
        r=subprocess.run(command,capture_output=True,text=True,timeout=5)
        addresses=[]
        for line in r.stdout.splitlines():
            try:addresses.append(str(ipaddress.ip_address(line)))
            except ValueError:pass
        return {'transport':'tcp' if tcp else 'udp','host':host,'type':kind,'addresses':sorted(set(addresses)),'exit_code':r.returncode}
    except (OSError,subprocess.TimeoutExpired) as e:return {'transport':'tcp' if tcp else 'udp','host':host,'type':kind,'error':type(e).__name__}
def doh(host,kind):
    try:
        with urllib.request.urlopen('https://dns.google/resolve?name='+host+'&type='+kind,timeout=8) as r:d=json.load(r)
        addresses=sorted({v['data'] for v in d.get('Answer',[]) if v['type'] in (1,28)})
        return {'transport':'https','host':host,'type':kind,'addresses':addresses,'dns_status':d.get('Status')}
    except Exception as e:return {'transport':'https','host':host,'type':kind,'error':type(e).__name__}
def assess(rows):
    issues=[]
    for host in HOSTS:
        for kind in ['A','AAAA']:
            matches={r['transport']:r for r in rows if r['host']==host and r['type']==kind}
            udp=set(matches.get('udp',{}).get('addresses',[]));reference=set(matches.get('https',{}).get('addresses',[]));tcp=set(matches.get('tcp',{}).get('addresses',[]))
            if reference and udp and not (reference & udp):
                issues.append({'host':host,'type':kind,'finding':'UDP DNS differs from encrypted DNS','tcp_agrees_with_https':bool(reference & tcp)})
            if '::' in udp:issues.append({'host':host,'type':kind,'finding':'Unusable unspecified IPv6 address returned'})
    return issues
if __name__=='__main__':
    tasks=[(host,kind,transport) for host in HOSTS for kind in ['A','AAAA'] for transport in ['udp','tcp','https']]
    def run(t):
        host,kind,transport=t
        return doh(host,kind) if transport=='https' else dig(host,kind,transport=='tcp')
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:rows=list(executor.map(run,tasks))
    print(json.dumps({'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'queries':rows,'findings':assess(rows),'read_only':True},indent=2))

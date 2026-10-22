"""mitmproxy addon: retain only authorized application API responses privately."""
from pathlib import Path
import hashlib
import json
import os
import time
from mitmproxy import http

ROOT = Path('/Users/chenliu/.local/share/zen-rea/private-runtime/proxy')
ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
HOSTS = {'global-ptdhapi.alayaguide.com', 'ptdhapi.alayaguide.com'}
def write_private(path, data):
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'wb') as f:
        f.write(data)

def response(flow: http.HTTPFlow):
    if flow.request.host not in HOSTS:
        return
    body = flow.response.content or b''
    name = str(time.time_ns())
    write_private(ROOT / (name+'.body'), body)
    meta = {'host':flow.request.host, 'path':flow.request.path.split('?')[0],
            'status':flow.response.status_code, 'response_bytes':len(body),
            'sha256':hashlib.sha256(body).hexdigest()}
    write_private(ROOT / (name+'.json'), json.dumps(meta,ensure_ascii=False,indent=2).encode())

def error(flow: http.HTTPFlow):
    if flow.request.host in HOSTS:
        data = {'host':flow.request.host, 'error':str(flow.error)}
        write_private(ROOT / (str(time.time_ns())+'.error.json'),json.dumps(data).encode())

def tls_failed_client(data):
    host = data.conn.sni
    if host in HOSTS:
        value = {'host':host, 'event':'tls_failed_client', 'error':str(data.conn.error)}
        write_private(ROOT / (str(time.time_ns())+'.tls.json'),json.dumps(value).encode())

def tls_established_client(data):
    host = data.conn.sni
    if host in HOSTS:
        value = {'host':host, 'event':'tls_established_client'}
        write_private(ROOT / (str(time.time_ns())+'.tls.json'),json.dumps(value).encode())

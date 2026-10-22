"""Persistent local REA MCP session; requests arrive as JSON lines on stdin."""
from pathlib import Path
import json
import os
import subprocess
import sys

root = Path('/Users/chenliu/.local/share/zen-rea')
out = Path(__file__).resolve().parent / 'evidence'
out.mkdir(exist_ok=True)
env = os.environ.copy()
env['JAVA_HOME'] = str(next(root.glob('jdk-*/Contents/Home')))
env['REA_JADX_MCP_JAR'] = str(root / 'jadx-headless-mcp-0.7.1-all.jar')
env['REA_JADX_HEAP_MIB'] = '3072'
env['REA_JADX_OPERATION_TIMEOUT_MS'] = '300000'
log = (out / 'rea-session.stderr.log').open('a')
proc = subprocess.Popen([str(root / 'npm/node_modules/.bin/rea'), '--mcp'],
                        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                        stderr=log, env=env, text=True, bufsize=1)
counter = 0
def rpc(method, params):
    global counter
    counter += 1
    proc.stdin.write(json.dumps(dict(jsonrpc='2.0', id=counter, method=method, params=params))+'\n')
    proc.stdin.flush()
    while True:
        line = proc.stdout.readline()
        if not line:
            raise RuntimeError('REA exited: '+str(proc.poll()))
        value = json.loads(line)
        if value.get('id') == counter:
            return value

try:
    initialized = rpc('initialize', {'protocolVersion':'2025-03-26',
                      'capabilities':{}, 'clientInfo':{'name':'zen-app-research','version':'1.0'}})
    (out / 'initialize.json').write_text(json.dumps(initialized,ensure_ascii=False,indent=2))
    proc.stdin.write(json.dumps({'jsonrpc':'2.0','method':'notifications/initialized'})+'\n')
    proc.stdin.flush()
    catalog = rpc('tools/list', {})
    (out / 'tool-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
    print(json.dumps({'ready':True,'tools':len(catalog.get('result',{}).get('tools',[]))}),flush=True)
    for line in sys.stdin:
        if line.strip() == 'quit':
            break
        try:
            req = json.loads(line)
            result = rpc('tools/call', {'name':req['tool'], 'arguments':req.get('args',{})})
            dest = out / (req['save']+'.json')
            dest.write_text(json.dumps(result,ensure_ascii=False,indent=2))
            print(json.dumps({'saved':str(dest),'bytes':dest.stat().st_size,
                              'isError':result.get('result',{}).get('isError'),
                              'rpcError':result.get('error')}),flush=True)
        except Exception as exc:
            print(json.dumps({'error':str(exc)}),flush=True)
finally:
    proc.stdin.close()
    try: proc.wait(timeout=15)
    except subprocess.TimeoutExpired:
        proc.terminate()
        proc.wait(timeout=15)
    log.close()

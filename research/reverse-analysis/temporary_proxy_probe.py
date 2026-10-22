"""Bounded probe with guaranteed restoration of the phone proxy settings."""
from pathlib import Path
import json
import os
import subprocess
import time

adb=['/opt/homebrew/bin/adb','-s','3B1648006QZ00000']
root=Path('/Users/chenliu/.local/share/zen-rea/private-runtime')
keys=['http_proxy','global_http_proxy_host','global_http_proxy_port','global_http_proxy_exclusion_list']
before={k:subprocess.check_output(adb+['shell','settings','get','global',k],text=True).strip() for k in keys}
state=root/'proxy-settings-before.json'
state.write_text(json.dumps(before));state.chmod(0o600)
log=(root/'proxy-probe.log').open('w');os.chmod(log.name,0o600)
cmd=['/Users/chenliu/.local/share/zen-rea/mitmproxy-venv/bin/mitmdump','-q',
     '--listen-host','127.0.0.1','--listen-port','18888',
     '--set','confdir='+str(root/'mitmproxy-conf'),
     '--set',r'allow_hosts=^(global-)?ptdhapi\.alayaguide\.com(:443)?$',
     '-s',str(Path(__file__).with_name('capture_target_responses.py').resolve())]
proxy=subprocess.Popen(cmd,stdout=log,stderr=log)
try:
    time.sleep(2)
    if proxy.poll() is not None:raise RuntimeError('Proxy launch failed; inspect private diagnostic log')
    subprocess.run(adb+['reverse','tcp:18888','tcp:18888'],check=True,capture_output=True)
    subprocess.run(adb+['shell','settings','put','global','http_proxy','127.0.0.1:18888'],check=True,capture_output=True)
    print('Temporary target-domain proxy ready; automatic restore in 75 seconds',flush=True)
    time.sleep(75)
finally:
    for key,value in before.items():
        action=['delete','global',key] if value=='null' else ['put','global',key,value]
        subprocess.run(adb+['shell','settings']+action,capture_output=True)
    subprocess.run(adb+['reverse','--remove','tcp:18888'],capture_output=True)
    proxy.terminate()
    try:proxy.wait(timeout=10)
    except subprocess.TimeoutExpired:proxy.kill();proxy.wait()
    log.close()
    print('Original phone proxy settings restored',flush=True)

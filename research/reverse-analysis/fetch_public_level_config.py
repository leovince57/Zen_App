"""One normal anonymous lookup of the app's global level-name configuration.

Uses the shipped protocol and client constants; never supplies another user's ID,
login token, or an authentication bypass. Protected responses remain failures.
"""
from pathlib import Path
import base64
import hashlib
import json
import urllib.parse
import urllib.request
from cryptography.hazmat.primitives import padding as sympadding, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

private=Path('/Users/chenliu/.local/share/zen-rea/private-runtime')
c=json.loads((private/'dex-constants.json').read_text())['Lcom/sanjixiuxue/app/Constant;']
aes=json.loads((private/'aes-constants.json').read_text())['Lcom/sanjixiuxue/app/u/AESUtils;']
assert aes['CIPHER_PADDING']=='AES/ECB/PKCS5Padding'
bootstrap=json.loads((private/'public-bootstrap-response.json').read_text())['data'][0]
decryptor=Cipher(algorithms.AES(aes['KEY'].encode()),modes.ECB()).decryptor()
plain=decryptor.update(bytes.fromhex(bootstrap['url']))+decryptor.finalize()
unpad=sympadding.PKCS7(128).unpadder()
base=(unpad.update(plain)+unpad.finalize()).decode()
parsed=urllib.parse.urlsplit(base)
assert parsed.scheme in ('http','https') and parsed.hostname
public=serialization.load_der_public_key(base64.b64decode(c['PUBLIC_KEY']))
endpoint=base+'getMindLevelName'
params={'appKey':hashlib.md5(c['API_KEY'].encode()).hexdigest(),
        'user_id':'','user_token':'','url':endpoint,'fromAPP':'PT','requestType':'1',
        'device_tag':'1','environment':'2','version_name':'1.0.260930.aw',
        'device_type':'1','device_id':'','version_date':'20260813'}
text='&'.join(k+'='+str(v) for k,v in params.items()).encode()
chunk=public.key_size//8-11
ciphertext=b''.join(public.encrypt(text[i:i+chunk],padding.PKCS1v15()) for i in range(0,len(text),chunk))
body=urllib.parse.urlencode({'params':base64.b64encode(ciphertext).decode()}).encode()
req=urllib.request.Request(endpoint,data=body,method='POST')
with urllib.request.urlopen(req,timeout=20) as response:
    content=response.read();http_status=response.status
dest=private/'public-level-response.json';dest.write_bytes(content);dest.chmod(0o600)
result=json.loads(content)
print(json.dumps({'http_status':http_status,'api_host':parsed.hostname,
                  'code':result.get('code',result.get('stateCode')),'message':result.get('msg'),
                  'data_count':len(result.get('data',[])) if isinstance(result.get('data'),list) else None,
                  'data_keys':[list(x) for x in result.get('data',[]) if isinstance(x,dict)]},ensure_ascii=False))

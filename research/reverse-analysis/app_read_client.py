"""Read-only client for configuration after the owner logs in to the research copy."""
from pathlib import Path
import base64
import hashlib
import json
import urllib.parse
import urllib.request
from cryptography.hazmat.primitives import padding as sympadding, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

PRIVATE = Path('/Users/chenliu/.local/share/zen-rea/private-runtime')
READ_ACTIONS = {'getMindLevelName','getMindPracticeList','getMindPracticeListNew',
                'getMpTestListNew','getMindPracticeAllNew','getMindAccumulateCurveNew',
                'getUserInfo','getLifeOceanVideo','getUserBoatList','getUserMedalList',
                'getDictionaryList','getHelpList','getCategoryKnowledge',
                'getZizhuKnowledgeAnswer','getShuruKnowledgeAnswer',
                'UserDetectionList','getUserMpDetectionChannel','getMindSixDetection'}

class ReadClient:
    def __init__(self, auth):
        self.auth = auth
        self.constants = json.loads((PRIVATE/'dex-constants.json').read_text())['Lcom/sanjixiuxue/app/Constant;']
        aes = json.loads((PRIVATE/'aes-constants.json').read_text())['Lcom/sanjixiuxue/app/u/AESUtils;']
        gate = json.loads((PRIVATE/'public-bootstrap-response.json').read_text())['data'][0]
        decr = Cipher(algorithms.AES(aes['KEY'].encode()),modes.ECB()).decryptor()
        padded = decr.update(bytes.fromhex(gate['url']))+decr.finalize()
        unpad = sympadding.PKCS7(128).unpadder()
        self.base = (unpad.update(padded)+unpad.finalize()).decode()
        self.key = serialization.load_der_public_key(base64.b64decode(self.constants['PUBLIC_KEY']))

    def read(self, action, values=None, method='GET'):
        if action not in READ_ACTIONS:raise ValueError('Not an approved read action')
        if not self.auth.get('uid') or not self.auth.get('token'):
            raise ValueError('Owner login is required; anonymous or guessed identities are not used')
        url = self.base+action
        params=dict(values or {})
        params.update({'appKey':hashlib.md5(self.constants['API_KEY'].encode()).hexdigest(),
                       'user_id':self.auth['uid'],'user_token':self.auth['token'],
                       'url':url,'fromAPP':'PT','requestType':'0' if method=='GET' else '1',
                       'device_tag':'1','environment':'2','version_name':'1.0.260930.aw',
                       'device_type':'1','device_id':self.auth.get('device_id',''),
                       'version_date':'20260813'})
        plain='&'.join(k+'='+str(v) for k,v in params.items()).encode()
        step=self.key.key_size//8-11
        enc=b''.join(self.key.encrypt(plain[i:i+step],padding.PKCS1v15()) for i in range(0,len(plain),step))
        query=urllib.parse.urlencode({'params':base64.b64encode(enc).decode()})
        req=urllib.request.Request(url+'?'+query if method=='GET' else url,
                                   data=None if method=='GET' else query.encode(),method=method)
        with urllib.request.urlopen(req,timeout=25) as response:raw=response.read()
        data=json.loads(raw)
        if data.get('code',data.get('stateCode')) != 0:
            raise RuntimeError('Read refused: '+str(data.get('code',data.get('stateCode')))+' '+str(data.get('msg','')))
        return data

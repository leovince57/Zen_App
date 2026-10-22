"""Supplemental DEX ConstantValue extraction; secrets remain in a private local file."""
import json
from pathlib import Path
import struct
import zipfile

def constants(data, wanted):
    def ui(off):return struct.unpack_from('<I',data,off)[0]
    def leb(pos):
        value=shift=0
        while True:
            byte=data[pos];pos+=1;value|=(byte&127)<<shift
            if not byte&128:return value,pos
            shift+=7
    str_off=ui(60);type_off=ui(68);field_off=ui(84)
    def string(index):
        pos=ui(str_off+index*4);_,pos=leb(pos)
        return data[pos:data.index(b'\0',pos)].decode('utf8','replace')
    def type_name(index):return string(ui(type_off+index*4))
    def value(pos):
        h=data[pos];pos+=1;t=h&31;n=(h>>5)+1
        if t==30:return None,pos
        if t==31:return bool(h>>5),pos
        if t==28:
            cnt,pos=leb(pos);out=[]
            for _ in range(cnt):v,pos=value(pos);out.append(v)
            return out,pos
        v=int.from_bytes(data[pos:pos+n],'little');pos+=n
        return (string(v) if t==23 else v),pos
    out={}
    for i in range(ui(96)):
        off=ui(100)+i*32;name=type_name(ui(off))
        if name not in wanted:continue
        cpos=ui(off+24);vpos=ui(off+28)
        if not cpos or not vpos:continue
        n,cpos=leb(cpos)
        for _ in range(3):_,cpos=leb(cpos)
        fields=[];idx=0
        for _ in range(n):
            delta,cpos=leb(cpos);_,cpos=leb(cpos);idx+=delta
            fields.append(string(ui(field_off+idx*8+4)))
        count,vpos=leb(vpos);vals={}
        for key in fields[:count]:
            v,vpos=value(vpos);vals[key]=v
        out[name]=vals
    return out

if __name__=='__main__':
    wanted={'Lcom/sanjixiuxue/app/Constant;','Lcom/taobao/accs/common/Constants;'}
    values={}
    with zipfile.ZipFile(Path(__file__).with_name('bodhi-base.apk')) as z:
        for name in z.namelist():
            if name.endswith('.dex'):values.update(constants(z.read(name),wanted))
    p=Path('/Users/chenliu/.local/share/zen-rea/private-runtime/dex-constants.json')
    p.write_text(json.dumps(values,ensure_ascii=False,indent=2));p.chmod(0o600)
    c=values.get('Lcom/sanjixiuxue/app/Constant;',{})
    print(json.dumps({'api_key_present':bool(c.get('API_KEY')),
                      'public_key_present':bool(c.get('PUBLIC_KEY')),
                      'student_base_url':c.get('STUDENT_BASE_URL'),
                      'app_key_parameter':values.get('Lcom/taobao/accs/common/Constants;',{}).get('KEY_APP_KEY')},ensure_ascii=False))

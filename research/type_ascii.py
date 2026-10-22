import subprocess,sys,time
from device_guard import guard
for c in sys.argv[1]:
    guard()
    subprocess.run(['adb','shell','input','text',c if c!=' ' else '%s'],check=True)
    time.sleep(.25)

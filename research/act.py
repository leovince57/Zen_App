"""Guarded navigation along already observed UI paths; capture separately."""
import sys, subprocess, time
from device_guard import guard
for action in sys.argv[1:]:
    guard()
    parts=action.split(':')
    if parts[0]=='tap': args=['tap',*parts[1:]]
    elif parts[0]=='back': args=['keyevent','4']
    elif parts[0]=='swipe': args=['swipe',*parts[1:],'400']
    else: raise SystemExit('Unsupported action')
    subprocess.run(['adb','shell','input',*args],check=True)
    time.sleep(.6)
    guard()

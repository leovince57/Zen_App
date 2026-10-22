import subprocess,re
ALLOWED={'com.sanjixiuxue.app','com.metanoteglobal.app','com.aryareadprod.app','com.oplus.securitypermission','com.android.permissioncontroller','com.google.android.permissioncontroller','com.heytap.browser','com.android.chrome','android'}
ALLOWED.add('com.sanjixiuxue.research.zen20261020')
def foreground():
    text=subprocess.check_output(['adb','shell','dumpsys','activity','activities']).decode()
    m=re.search(r'topResumedActivity=.*? u\d+ ([^/\s]+)/',text)
    return m.group(1) if m else None
def guard():
    package=foreground()
    if package not in ALLOWED:
        raise SystemExit('Paused: foreground application is outside the research scope. No input or screenshot captured.')
    windows=subprocess.check_output(['adb','shell','dumpsys','window']).decode()
    focus=re.search(r'mCurrentFocus=Window\{[^\n]+',windows)
    if focus and not any(p+'/' in focus.group(0) for p in ALLOWED):
        raise SystemExit('Paused: a system overlay or unrelated window has focus. No input or screenshot captured.')

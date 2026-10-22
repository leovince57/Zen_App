"""Fetch pinned analysis tools with checked HTTP ranges and SHA-256."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

root = Path('/Users/chenliu/.local/share/zen-rea')
meta = json.loads(Path('/tmp/zen-rea-jdk-metadata.json').read_text())[0]['binary']['package']
tools = [
    (meta['link'], meta['name'], meta['size'], meta['checksum']),
    ('https://github.com/1013503897/jadx-headless-mcp/releases/download/v0.7.1/jadx-headless-mcp-0.7.1-all.jar',
     'jadx-headless-mcp-0.7.1-all.jar', 42619858,
     '6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75'),
]

for url, name, size, sha in tools:
    parts = root / (name + '.parts')
    parts.mkdir(exist_ok=True)
    chunk = 2 * 1024 * 1024
    def fetch(start):
        end = min(size, start + chunk) - 1
        part = parts / str(start)
        if part.exists() and part.stat().st_size == end - start + 1:
            return part
        res = subprocess.run(['curl', '-fsSL', '--retry', '2', '--max-time', '90',
                              '-r', f'{start}-{end}', url, '-o', str(part),
                              '-w', '%{http_code}'], capture_output=True, text=True)
        if res.returncode or res.stdout != '206' or part.stat().st_size != end - start + 1:
            raise RuntimeError((name, start, res.stdout, res.stderr[-200:]))
        return part
    starts = list(range(0, size, chunk))
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(fetch, starts))
    dest = root / name
    with dest.open('wb') as out:
        for part in results:
            out.write(part.read_bytes())
    assert hashlib.sha256(dest.read_bytes()).hexdigest() == sha, name
    print(name, 'SHA-256 verified', flush=True)
    for part in results:
        part.unlink()
    parts.rmdir()
    if name.endswith('.tar.gz'):
        with tarfile.open(dest) as archive:
            archive.extractall(root)
        print('JDK extracted', flush=True)

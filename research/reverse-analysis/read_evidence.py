"""Print only normalized REA results; retain full raw evidence on disk."""
import json
from pathlib import Path
import sys

base = Path(__file__).resolve().parent / 'evidence'
for pattern in sys.argv[1:]:
    for path in sorted(base.glob(pattern)):
        root = json.loads(path.read_text())
        response = root.get('result', root)
        evidence = response.get('structuredContent')
        print('\nFILE', path.name)
        if evidence:
            print('EVIDENCE', evidence.get('evidence_id'))
            norm = evidence.get('normalized_result', {})
            if isinstance(norm, dict) and 'source' in norm:
                print('METHOD', norm.get('class_name'), norm.get('method'))
                print('SOURCE', norm['source'].get('status'), norm.get('representation'), norm.get('markers'))
                print(norm['source'].get('text'))
            elif isinstance(norm, dict) and 'methods' in norm:
                print('FIELDS', json.dumps(norm.get('fields'), ensure_ascii=False))
                print('INNER', json.dumps(norm.get('inner_classes'), ensure_ascii=False))
                for method in norm['methods']:
                    print(method['name'], method.get('overload_index'), method.get('reported_signature'))
            else:
                print(json.dumps(norm, ensure_ascii=False, indent=2))
        else:
            print(json.dumps(response, ensure_ascii=False, indent=2))

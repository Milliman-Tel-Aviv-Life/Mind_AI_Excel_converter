#!/usr/bin/env python3
from pathlib import Path
import json, sys

def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    required = ['SKILL.md','manifest.json','rules/rule-schema.json','schemas/processing-result.schema.json']
    missing = [p for p in required if not (root/p).exists()]
    print(json.dumps({'valid': not missing, 'missing': missing}, indent=2))
    return 1 if missing else 0
if __name__ == '__main__': raise SystemExit(main())

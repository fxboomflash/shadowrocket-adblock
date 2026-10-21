#!/usr/bin/env python3
"""Verify the distribution without third-party Python dependencies."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--online', action='store_true', help='Also check public download bytes')
    args = parser.parse_args()
    checksums = json.loads((ROOT / 'checksums.json').read_text())
    migration = json.loads((ROOT / 'verification/migration.json').read_text())
    expected = set(checksums) | {'checksums.json'}
    actual = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*')
              if p.is_file() and '.git' not in p.relative_to(ROOT).parts
              and '__pycache__' not in p.relative_to(ROOT).parts}
    assert actual == expected, f'Unexpected or missing files: {actual ^ expected}'
    secret_names = re.compile(r'(?:private-receipt|\.env(?:\.|$)|\.(?:p12|pfx|key|pem|har)$)', re.I)
    for path, expected_sha in checksums.items():
        assert not secret_names.search(path), f'Forbidden publication file: {path}'
        data = (ROOT / path).read_bytes()
        assert digest(data) == expected_sha, f'Hash mismatch: {path}'
    module = (ROOT / migration['module_path']).read_text()
    assert digest(module.encode()) == migration['module_sha256']
    sections = re.findall(r'^\[([^\]]+)\]$', module, re.M)
    assert sections == ['General', 'Rule', 'URL Rewrite', 'Map Local', 'Script', 'Body Rewrite', 'MITM']
    active = [line.strip() for line in module.splitlines()
              if line.strip() and not line.lstrip().startswith(('#', ';'))]
    forbidden = re.compile(r'-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----|(?:vmess|vless|trojan|hysteria2|ss)://|^\s*(?:ca-p12|ca-passphrase)\s*=', re.I | re.M)
    assert not forbidden.search(module), 'Unexpected node or certificate-secret syntax'
    assert not any('paste.c-net.org/' in line for line in active), 'Runtime dependency still points to old host'
    resource_urls = set()
    for line in active:
        resource_urls.update(re.findall(r'script-path=(https?://[^,\s]+)', line))
        found = re.match(r'(?:DOMAIN-SET|RULE-SET),(https?://[^,\s]+),', line)
        if found:
            resource_urls.add(found.group(1))
    assets = migration['assets']
    assert len(assets) == 12
    assert resource_urls == {a['url'] for a in assets}, 'Dependency URL coverage mismatch'
    for asset in assets:
        data = (ROOT / asset['path']).read_bytes()
        assert len(data) == asset['bytes'] and digest(data) == asset['sha256']
        assert '.' + asset['sha256'][:12] + '.' in asset['path'], 'Asset filename must contain content hash'
        assert asset['url'] == f"https://raw.githubusercontent.com/{migration['repository']}/{migration['branch']}/{asset['path']}"
    counts = Counter()
    section = ''
    for line in active:
        if line.startswith('[') and line.endswith(']'):
            section = line[1:-1]
        else:
            counts[section] += 1
    assert dict(counts) == {'General': 2, 'Rule': 16742, 'URL Rewrite': 408,
                            'Map Local': 202, 'Script': 10, 'Body Rewrite': 18, 'MITM': 3}
    assert migration['active_configuration_unchanged_after_url_normalization'] is True
    assert migration['all_12_asset_bytes_unchanged'] is True
    downloaded = 0
    if args.online:
        downloads = [{'url': migration['module_url'], 'sha256': migration['module_sha256']}] + assets
        for item in downloads:
            request = urllib.request.Request(item['url'], headers={'User-Agent': 'Shadowrocket/2.2.92'})
            with urllib.request.urlopen(request, timeout=45) as response:
                assert response.status == 200, item['url']
                data = response.read()
            assert digest(data) == item['sha256'], f"Public resource mismatch: {item['url']}"
            downloaded += 1
    print(json.dumps({'passed': True, 'files_checked': len(checksums),
                      'dependencies_checked': len(assets), 'public_downloads_checked': downloaded,
                      'sections': dict(counts), 'phone_tested': False}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

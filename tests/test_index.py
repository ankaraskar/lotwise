import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from sync_sources import safe_official, snippets, extract_pages

class OfficialDataTests(unittest.TestCase):
    def test_allowlist(self):
        self.assertTrue(safe_official('https://www.buildbrantford.ca/media/l0clnl4m/zoning-bylaw-text.pdf'))
        self.assertTrue(safe_official('https://www.toronto.ca/city-government/'))
        self.assertFalse(safe_official('https://evil.example/go'))
        self.assertFalse(safe_official('http://www.toronto.ca/'))
        self.assertFalse(safe_official('https://www.toronto.ca.evil.example/'))
        self.assertFalse(safe_official('https://www.toronto.ca@evil.example/path'))
    def test_snippet(self):
        out = snippets('The maximum building height is 15 m. Parking standards apply.')
        self.assertTrue(out)
        self.assertLessEqual(len(out[0]), 230)
    def test_reference(self):
        source = json.loads((Path(__file__).resolve().parents[1]/'site/data/standards.json').read_text())
        self.assertEqual(source['brantford']['MCC']['columns']['non_residential']['Maximum building height'],'15 m')
    def test_html_parser(self):
        p = extract_pages(b'<html><body><h1>Height limits</h1><script>secret</script></body></html>','html')
        self.assertIn('Height limits',p[0][1])
        self.assertNotIn('secret',p[0][1])
if __name__=='__main__': unittest.main()

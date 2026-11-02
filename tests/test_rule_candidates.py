import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from rule_candidates import extract_rule_candidates, applies_as_research_lead

SOURCE = {'id':'fixture','jurisdiction':'brantford','title':'Official zoning','type':'pdf','url':'https://www.buildbrantford.ca/official.pdf'}

class TestRuleCandidates(unittest.TestCase):
    def test_finds_nearby_number(self):
        rows = extract_rule_candidates('Maximum building height       15 m\nMinimum front yard       3 m\n', SOURCE, 32)
        self.assertEqual([r['topic'] for r in rows], ['height', 'front_yard'])
        self.assertEqual(rows[0]['values_as_written'], ['15 m'])
        self.assertIn('#page=32', rows[0]['source_url'])
        self.assertEqual(rows[0]['review_status'],'needs_manual_review')
    def test_only_official_text_number(self):
        self.assertEqual(extract_rule_candidates('Maximum building height applies as defined elsewhere.',SOURCE,1), [])
    def test_conditional_flag(self):
        rows = extract_rule_candidates('Minimum rear yard 7.5 metres except where abutting a lane',SOURCE,4)
        self.assertTrue(rows[0]['conditional_text_present'])
    def test_no_zone_inference(self):
        rows = extract_rule_candidates('Maximum building height 15 m',SOURCE,4)
        self.assertFalse(applies_as_research_lead(rows[0],'MCC','brantford'))
        source = {**SOURCE,'zone_scope':'MCC'}
        rows = extract_rule_candidates('Maximum building height 15 m',source,4)
        self.assertTrue(applies_as_research_lead(rows[0],'MCC','brantford'))
        self.assertFalse(applies_as_research_lead(rows[0],'CR','brantford'))
    def test_same_line_only_other_topic(self):
        rows = extract_rule_candidates('Maximum building height\nMinimum front yard 3 m',SOURCE,4)
        self.assertEqual([r['topic'] for r in rows], ['front_yard'])
if __name__=='__main__': unittest.main()

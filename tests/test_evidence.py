import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from evidence import candidate_entries, match_zone_record

class EvidenceTests(unittest.TestCase):
    toronto={'id':'toronto-cr','jurisdiction':'toronto','type':'html','title':'Toronto CR','url':'https://www.toronto.ca/zoning/bylaw_amendments/ZBL_NewProvision_Chapter40_10.htm','zone_scope':'CR'}
    brantford={'id':'brantford-zoning','jurisdiction':'brantford','type':'pdf','title':'Brantford Zoning','url':'https://www.buildbrantford.ca/media/l0clnl4m/zoning-bylaw-text.pdf'}

    def test_zone_evidence_and_source_url(self):
        passage='40.10.40.10 Height The maximum building height in the CR SS2 zone is subject to the height overlay.'
        rows=candidate_entries(passage,self.toronto,2)
        self.assertTrue(rows)
        self.assertEqual(rows[0]['review_status'],'unverified_candidate')
        self.assertEqual(rows[0]['section_hint'],'40.10.40.10')
        self.assertEqual(rows[0]['chapter_zone_scope'],'CR')
        self.assertTrue(match_zone_record(rows[0],'CR SS2 (x531)'))
        self.assertFalse(match_zone_record(rows[0],'MCC'))
    def test_bounded_zone_matching(self):
        text='MCC. Maximum building height is 15 m. Section 6.6.'
        rows=candidate_entries(text,self.brantford,141)
        self.assertTrue(rows)
        self.assertIn('MCC',rows[0]['zones_mentioned'])
        self.assertTrue(match_zone_record(rows[0],'MCC'))
        self.assertFalse(match_zone_record(rows[0],'CR'))
        self.assertTrue(rows[0]['source_url'].endswith('#page=141'))
    def test_no_number_invention(self):
        rows=candidate_entries('Permitted uses may be limited by additional sections.',self.brantford,1)
        self.assertEqual(rows[0]['topic'],'uses')
        self.assertNotIn('maximum_height', rows[0])
        self.assertNotIn('permitted',rows[0])
    def test_empty(self):
        self.assertFalse(candidate_entries('No relevant text.',self.brantford,1))
if __name__=='__main__':unittest.main()

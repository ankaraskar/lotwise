import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class UserFlowTests(unittest.TestCase):
    def setUp(self):
        self.html=(ROOT/'site/index.html').read_text(encoding='utf-8')
        self.js=(ROOT/'site/app.js').read_text(encoding='utf-8')
    def test_results_hidden_initially(self):
        self.assertIn('id="resultsWorkspace" class="hidden',self.html)
    def test_address_first_and_manual_verify(self):
        self.assertIn('id="address"',self.html)
        self.assertIn('id="submitBtn"',self.html)
        self.assertNotIn('id="snapshotGrid"',self.html)
        self.assertIn('id="ruleCandidatesPanel"',self.html)
        self.assertIn('id="verificationDetails"',self.html)
        self.assertIn('id="gisDiagnostics"',self.html)
        self.assertIn('id="obcDetails"',self.html)
    def test_single_candidate_auto_selection(self):
        self.assertIn('if(state.candidates.length===1&&!state.candidates[0].error){await chooseCandidate(0);}',self.js)
    def test_preserves_government_only_rule(self):
        self.assertIn('Blocked non-municipal GIS URL',self.js)

if __name__=='__main__': unittest.main()

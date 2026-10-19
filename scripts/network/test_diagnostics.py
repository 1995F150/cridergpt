import unittest
from diagnose_tailscale import assess
class Tests(unittest.TestCase):
 def test_dns_discrepancy_and_unspecified_ipv6_are_reported(self):
  rows=[dict(host='cridergpt.com',type='AAAA',transport=t,addresses=a) for t,a in [('udp',['::']),('tcp',['2606:4700::1']),('https',['2606:4700::1'])]]
  result=assess(rows);self.assertEqual(len(result),2);self.assertTrue(result[0]['tcp_agrees_with_https'])
 def test_rotating_dns_with_shared_address_is_not_marked_blocked(self):
  rows=[dict(host='cridergpt.com',type='A',transport=t,addresses=a) for t,a in [('udp',['1.1.1.1']),('https',['1.1.1.1','1.0.0.1'])]]
  self.assertEqual(assess(rows),[])
 def test_missing_reference_is_not_proof_of_blocking(self):
  self.assertEqual(assess([dict(host='cridergpt.com',type='A',transport='udp',addresses=['18.204.152.241'])]),[])
if __name__=='__main__':unittest.main()

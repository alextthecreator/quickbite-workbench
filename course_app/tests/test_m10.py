import unittest
from student_code.policies import *

class ContractTests(unittest.TestCase):
    def test_cancel_boundary(self):
        self.assertTrue(can_cancel_order('PLACED')); self.assertTrue(can_cancel_order('CONFIRMED')); self.assertFalse(can_cancel_order('PREPARING'))
    def test_cancel_delivered_false(self): self.assertFalse(can_cancel_order('DELIVERED'))
    def test_cancel_invalid(self):
        with self.assertRaises(ValueError): can_cancel_order('UNKNOWN')
    def test_fee_free_boundary(self): self.assertEqual(delivery_fee(4,80),0.0)
    def test_fee_paid(self): self.assertEqual(delivery_fee(4,79.99),11.0)
    def test_fee_validation(self):
        with self.assertRaises(ValueError): delivery_fee(True,50)
    def test_pickup_transition(self): self.assertEqual(next_order_state('READY','pickup'),'OUT_FOR_DELIVERY')
    def test_delivery_transition(self): self.assertEqual(next_order_state('OUT_FOR_DELIVERY','deliver'),'DELIVERED')
    def test_illegal_transition(self):
        with self.assertRaises(ValueError): next_order_state('PLACED','deliver')
    def test_total(self): self.assertEqual(calculate_order_total([20,30.5],7.5),58.0)
    def test_adapter(self): self.assertEqual(normalize_payment_status(' paid '),'approved')
    def test_notification(self): self.assertEqual(notification('push','QB-17')['order_id'],'QB-17')
if __name__=='__main__': unittest.main()

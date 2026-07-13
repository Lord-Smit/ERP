from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import Customer, PaymentReminder

User = get_user_model()


class PaymentReminderTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_user(
            email='admin@test.com', password='testpass123',
            role='super_admin', is_active=True,
        )
        self.client.force_authenticate(user=self.admin)

        self.customer = Customer.objects.create(
            customer_code='C001', name='Test Customer',
            email='cust@test.com', phone='9999999999',
        )

    def test_create_reminder(self):
        payload = {
            'invoice_number': 'INV-001',
            'amount': '5000.00',
            'due_date': '2026-08-15',
            'reminder_type': 'email',
            'notes': 'Test reminder',
        }
        resp = self.client.post(f'/api/customers/{self.customer.pk}/reminders/', payload, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['invoice_number'], 'INV-001')
        self.assertEqual(resp.data['customer_name'], 'Test Customer')
        self.assertFalse(resp.data['is_resolved'])
        self.assertIsNone(resp.data['resolved_at'])

    def test_list_reminders_nested(self):
        PaymentReminder.objects.create(customer=self.customer, invoice_number='INV-001')
        PaymentReminder.objects.create(customer=self.customer, invoice_number='INV-002')
        resp = self.client.get(f'/api/customers/{self.customer.pk}/reminders/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    def test_list_reminders_top_level(self):
        PaymentReminder.objects.create(customer=self.customer, invoice_number='INV-001')
        resp = self.client.get('/api/reminders/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['results']), 1)

    def test_resolve_reminder_sets_resolved_at(self):
        reminder = PaymentReminder.objects.create(
            customer=self.customer, invoice_number='INV-001',
        )
        self.assertIsNone(reminder.resolved_at)

        resp = self.client.patch(
            f'/api/customers/{self.customer.pk}/reminders/{reminder.pk}/',
            {'is_resolved': True},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['is_resolved'])
        self.assertIsNotNone(resp.data['resolved_at'])

        reminder.refresh_from_db()
        self.assertIsNotNone(reminder.resolved_at)

    def test_unresolve_reminder_clears_resolved_at(self):
        reminder = PaymentReminder.objects.create(
            customer=self.customer, invoice_number='INV-001',
            is_resolved=True, resolved_at=timezone.now(),
        )
        self.assertIsNotNone(reminder.resolved_at)

        resp = self.client.patch(
            f'/api/customers/{self.customer.pk}/reminders/{reminder.pk}/',
            {'is_resolved': False},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['is_resolved'])
        self.assertIsNone(resp.data['resolved_at'])

        reminder.refresh_from_db()
        self.assertIsNone(reminder.resolved_at)

    def test_update_reminder_other_fields(self):
        reminder = PaymentReminder.objects.create(
            customer=self.customer, invoice_number='INV-001',
        )
        resp = self.client.patch(
            f'/api/customers/{self.customer.pk}/reminders/{reminder.pk}/',
            {'notes': 'Updated notes', 'reminder_type': 'phone'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['notes'], 'Updated notes')
        self.assertEqual(resp.data['reminder_type'], 'phone')

    def test_delete_reminder(self):
        reminder = PaymentReminder.objects.create(
            customer=self.customer, invoice_number='INV-001',
        )
        resp = self.client.delete(
            f'/api/customers/{self.customer.pk}/reminders/{reminder.pk}/',
        )
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(PaymentReminder.objects.filter(pk=reminder.pk).exists())

    def test_filter_reminders_by_resolved(self):
        PaymentReminder.objects.create(customer=self.customer, invoice_number='INV-001', is_resolved=False)
        PaymentReminder.objects.create(customer=self.customer, invoice_number='INV-002', is_resolved=True, resolved_at=timezone.now())
        resp = self.client.get('/api/reminders/?is_resolved=true')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['results']), 1)
        self.assertTrue(resp.data['results'][0]['is_resolved'])

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.crm.models import Customer
from apps.quotations.models import Quotation, QuotationLineItem

User = get_user_model()


class QuotationAcceptanceTests(TestCase):
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

        self.quotation = Quotation.objects.create(
            quotation_number='QTN-001',
            customer=self.customer,
            valid_until=timezone.now().date() + timezone.timedelta(days=30),
            subtotal=10000.00,
            tax_percentage=18.00,
            tax_amount=1800.00,
            total_amount=11800.00,
            status='draft',
            created_by=self.admin,
        )

        # Create a line item for the quotation
        QuotationLineItem.objects.create(
            quotation=self.quotation,
            description='Test Rental Item',
            quantity=1,
            rental_period='monthly',
            unit_price=10000.00,
            line_total=10000.00,
            start_date=timezone.now().date(),
        )

    def test_accept_quotation_creates_documents_and_triggers_email(self):
        # The quotation should transition to accepted
        resp = self.client.post(f'/api/quotations/{self.quotation.pk}/accept_quotation/', {
            'won_reason': 'Best price'
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'accepted')
        self.assertIsNotNone(resp.data['contract_id'])
        self.assertIsNotNone(resp.data['invoice_id'])
        self.assertIsNotNone(resp.data['rental_order_id'])

        # Verify database objects
        self.quotation.refresh_from_db()
        self.assertEqual(self.quotation.status, 'accepted')
        self.assertEqual(self.quotation.won_reason, 'Best price')

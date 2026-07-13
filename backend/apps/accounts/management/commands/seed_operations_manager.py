from django.core.management.base import BaseCommand
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Seed the Operations Manager user'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='ops@erp.com')
        parser.add_argument('--password', type=str, default='ops123')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User {email} already exists'))
            return

        User.objects.create_user(
            email=email,
            password=password,
            role='operations_manager',
            first_name='Operations',
            last_name='Manager',
        )
        self.stdout.write(self.style.SUCCESS(f'Operations Manager created: {email} / {password}'))

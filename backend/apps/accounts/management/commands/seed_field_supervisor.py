from django.core.management.base import BaseCommand
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Seed the Field Supervisor user'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='field@erp.com')
        parser.add_argument('--password', type=str, default='field123')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User {email} already exists'))
            return

        User.objects.create_user(
            email=email,
            password=password,
            role='field_supervisor',
            first_name='Field',
            last_name='Supervisor',
        )
        self.stdout.write(self.style.SUCCESS(f'Field Supervisor created: {email} / {password}'))

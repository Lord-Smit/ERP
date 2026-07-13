from django.core.management.base import BaseCommand
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Seed the Finance staff user'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='finance@erp.com')
        parser.add_argument('--password', type=str, default='finance123')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User {email} already exists'))
            return

        User.objects.create_user(
            email=email,
            password=password,
            role='finance',
            first_name='Finance',
            last_name='Staff',
        )
        self.stdout.write(self.style.SUCCESS(f'Finance user created: {email} / {password}'))

from django.core.management.base import BaseCommand
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Seed the Super Admin user'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='smitcodingdata@gmail.com')
        parser.add_argument('--password', type=str, default='admin123')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User {email} already exists'))
            return

        User.objects.create_superuser(
            email=email,
            password=password,
            role='super_admin',
            first_name='Super',
            last_name='Admin',
        )
        self.stdout.write(self.style.SUCCESS(f'Super Admin created: {email} / {password}'))

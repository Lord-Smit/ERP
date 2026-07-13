import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from .managers import UserManager


class User(AbstractUser):
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('operations_manager', 'Operations Manager'),
        ('finance', 'Finance'),
        ('field_supervisor', 'Field Supervisor'),
        ('operator', 'Operator'),
    ]

    REGISTRATION_STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='operator')
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    registration_status = models.CharField(
        max_length=20, choices=REGISTRATION_STATUS_CHOICES, default='approved'
    )
    rejection_reason = models.TextField(blank=True, default='')

    username = None
    email = models.EmailField(unique=True, max_length=255)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'users'

    def save(self, *args, **kwargs):
        if self._state.adding:
            if self.registration_status == 'approved':
                self.is_active = True
            elif self.registration_status in ('pending', 'rejected'):
                self.is_active = False
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

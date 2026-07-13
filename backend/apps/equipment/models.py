import uuid
from django.db import models
from django.conf import settings


class EquipmentCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='children'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'equipment_categories'
        verbose_name_plural = 'Equipment Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Warehouse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)
    contact_person = models.CharField(max_length=100, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'warehouses'
        verbose_name_plural = 'Warehouses'
        ordering = ['name']

    def __str__(self):
        return self.name


class Equipment(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('reserved', 'Reserved'),
        ('rented', 'Rented'),
        ('maintenance', 'Under Maintenance'),
        ('in_transit', 'In Transit'),
        ('retired', 'Retired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        EquipmentCategory, on_delete=models.SET_NULL, null=True,
        related_name='equipment'
    )
    warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True,
        related_name='equipment'
    )
    operator = models.ForeignKey(
        'logsheet.Operator', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_equipment'
    )
    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    serial_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rental_price_hourly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rental_price_daily = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rental_price_weekly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rental_price_monthly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    location_details = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'equipment'
        verbose_name_plural = 'Equipment'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.serial_number or 'No S/N'})"


class EquipmentImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name='images'
    )
    image = models.ImageField(upload_to='equipment/')
    is_primary = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'equipment_images'
        ordering = ['-is_primary', '-uploaded_at']

    def __str__(self):
        return f"Image for {self.equipment.name}"


class EquipmentSpecification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name='specifications'
    )
    key = models.CharField(max_length=100)
    value = models.CharField(max_length=300)
    unit = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'equipment_specifications'
        ordering = ['key']
        unique_together = ['equipment', 'key']

    def __str__(self):
        return f"{self.key}: {self.value}{self.unit}"


class EquipmentAttachment(models.Model):
    FILE_TYPES = [
        ('manual', 'Manual'),
        ('certificate', 'Certificate'),
        ('inspection', 'Inspection Report'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name='attachments'
    )
    name = models.CharField(max_length=200)
    file = models.FileField(upload_to='equipment/attachments/')
    file_type = models.CharField(max_length=20, choices=FILE_TYPES, default='other')
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'equipment_attachments'
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.name


class MaintenanceRecord(models.Model):
    MAINTENANCE_TYPES = [
        ('preventive', 'Preventive'),
        ('repair', 'Repair'),
        ('inspection', 'Inspection'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name='maintenance_records'
    )
    date = models.DateField()
    maintenance_type = models.CharField(
        max_length=20, choices=MAINTENANCE_TYPES, default='preventive'
    )
    description = models.TextField()
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    performed_by = models.CharField(max_length=200, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'maintenance_records'
        ordering = ['-date']

    def __str__(self):
        return f"{self.get_maintenance_type_display()} - {self.equipment.name} ({self.date})"


class EquipmentTransit(models.Model):
    ROUTE_TYPES = [
        ('warehouse_to_site', 'Warehouse to Site'),
        ('site_to_site', 'Site to Site'),
    ]
    STATUS_CHOICES = [
        ('in_transit', 'In Transit'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name='transit_records'
    )
    date = models.DateField()
    route_type = models.CharField(max_length=30, choices=ROUTE_TYPES)
    source_warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='transits_out'
    )
    source_site = models.ForeignKey(
        'crm.CustomerSite', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='transits_out'
    )
    destination_site = models.ForeignKey(
        'crm.CustomerSite', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='transits_in'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_transit')
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'equipment_transit_records'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.get_route_type_display()} - {self.equipment.name} ({self.date})"

# Generated manually to bootstrap authentication app

from django.db import migrations
from django.conf import settings

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),  # Django's auth app
    ]

    operations = [
        # This migration exists to ensure the authentication app is recognized
        # The actual User model will be created by a subsequent migration
        migrations.RunPython(
            lambda apps, schema_editor: None,  # No-op forward
            lambda apps, schema_editor: None,  # No-op reverse
        ),
    ]
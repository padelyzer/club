# Generated migration for adding images field to Court model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clubs', '0002_add_court_special_pricing'),
    ]

    operations = [
        migrations.AddField(
            model_name='court',
            name='images',
            field=models.JSONField(
                default=list,
                help_text='List of court image URLs with metadata'
            ),
        ),
    ]
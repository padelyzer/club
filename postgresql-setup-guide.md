
# PostgreSQL Production Setup Guide

## 1. Add PostgreSQL to Render Service

1. Go to your Render dashboard: https://dashboard.render.com
2. Navigate to your backend service
3. Click "Environment" tab
4. Add a PostgreSQL database:
   - Click "New Database"
   - Choose "PostgreSQL"
   - Select region (same as your web service)
   - Choose plan (free tier available)

## 2. Configure Database Connection

Once PostgreSQL is created, add these environment variables:

```
DATABASE_URL=<provided by Render PostgreSQL>
DB_ENGINE=django.db.backends.postgresql
DB_NAME=<database name>
DB_USER=<database user>  
DB_PASSWORD=<database password>
DB_HOST=<database host>
DB_PORT=5432
```

## 3. Update Django Settings

Your Django settings should detect DATABASE_URL automatically.
The current configuration in settings/production.py should work.

## 4. Run Migrations

After PostgreSQL is connected:

```bash
# In your Render service console
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

## 5. Test the Connection

Check the health endpoint:
curl https://backend-io1y.onrender.com/api/v1/health/

The database check should return true with "postgresql" as vendor.

## 6. Optional: Redis Setup

For better performance, add Redis:

1. Add Redis service in Render
2. Set REDIS_URL environment variable
3. Backend will automatically use Redis for caching

## Current Status

✅ Backend deployed and running
✅ SQLite working (temporary)  
⚠️  PostgreSQL needed for production
⚠️  Redis recommended for performance
✅ All APIs responding correctly
✅ Authentication working
✅ Clubs module fully functional

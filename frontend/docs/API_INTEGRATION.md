# API Integration Documentation

## Overview
The frontend is now fully integrated with the Django backend API running on port 9200. All API services have been created and configured to communicate with the backend endpoints.

## Configuration

### Environment Variables
The API URL is configured in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:9200/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:9200/ws
```

## API Services

### 1. Authentication Service (`src/lib/api/services/auth.service.ts`)
Handles all authentication-related operations:
- **Login**: `POST /auth/login/`
- **Logout**: `POST /auth/logout/`
- **Get Profile**: `GET /auth/profile/`
- **Register**: `POST /auth/register/`
- **Refresh Token**: `POST /auth/token/refresh/`
- **Password Reset**: `POST /auth/password-reset/`
- **Change Password**: `POST /auth/change-password/`

Token management is handled automatically:
- Access tokens are stored in localStorage
- Tokens are automatically included in all requests
- Token refresh is handled automatically on 401 responses

### 2. Clubs Service (`src/lib/api/services/clubs.service.ts`)
Manages club operations:
- **List Clubs**: `GET /clubs/clubs/`
- **Get Club Details**: `GET /clubs/clubs/{id}/`
- **Create Club**: `POST /clubs/clubs/`
- **Update Club**: `PATCH /clubs/clubs/{id}/`
- **Delete Club**: `DELETE /clubs/clubs/{id}/`
- **Get Club Courts**: `GET /clubs/courts/?club={clubId}`

### 3. Courts Service (`src/lib/api/services/courts.service.ts`)
Manages court operations:
- **List Courts**: `GET /clubs/courts/`
- **Get Court Details**: `GET /clubs/courts/{id}/`
- **Check Availability**: `GET /clubs/courts/{id}/availability/`
- **Get Pricing**: `GET /clubs/courts/{id}/pricing/`
- **Schedule Maintenance**: `POST /clubs/courts/{id}/maintenance/`

### 4. Reservations Service (`src/lib/api/services/reservations.service.ts`)
Handles reservation management:
- **List Reservations**: `GET /reservations/reservations/`
- **Create Reservation**: `POST /reservations/reservations/`
- **Update Reservation**: `PATCH /reservations/reservations/{id}/`
- **Cancel Reservation**: `POST /reservations/reservations/{id}/cancel/`
- **Check Availability**: `POST /reservations/reservations/check_availability/`
- **Calendar View**: `GET /reservations/reservations/calendar/`

## API Client Configuration

The API client (`src/lib/api/client.ts`) includes:
- Automatic token injection in headers
- Request/response logging in development
- Automatic token refresh on 401 responses
- Error handling with user-friendly toast notifications
- CORS support

## Usage Examples

### Authentication
```typescript
import { useAuth } from '@/lib/api/hooks/useAuth';

function LoginComponent() {
  const { login, user, isAuthenticated } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login({ email, password });
      // User is now logged in
    } catch (error) {
      // Error is automatically shown as toast
    }
  };
}
```

### Making Reservations
```typescript
import { ReservationsService } from '@/lib/api/services/reservations.service';

async function createReservation() {
  try {
    const reservation = await ReservationsService.create({
      court_id: '123',
      date: '2024-01-20',
      start_time: '10:00',
      end_time: '11:00',
      client_id: '456'
    });
    console.log('Reservation created:', reservation);
  } catch (error) {
    console.error('Failed to create reservation:', error);
  }
}
```

### Checking Court Availability
```typescript
import { ReservationsService } from '@/lib/api/services/reservations.service';

async function checkAvailability() {
  const response = await ReservationsService.checkAvailability({
    court_id: '123',
    date: '2024-01-20',
    start_time: '10:00',
    duration_minutes: 60
  });
  
  if (response.is_available) {
    console.log('Court is available!');
  }
}
```

## Testing the Connection

Run the test script to verify the API connection:
```bash
npx tsx test-api-connection.ts
```

This will test:
1. Basic API connectivity
2. CORS configuration
3. Authentication endpoint

## Common Issues and Solutions

### CORS Errors
If you encounter CORS errors:
1. Ensure the Django backend has `http://localhost:3000` in CORS_ALLOWED_ORIGINS
2. Check that the backend is running on port 9200
3. Verify the API_URL in `.env.local`

### Authentication Errors
If authentication fails:
1. Check that tokens are being stored in localStorage
2. Verify the token format matches Django's expectations
3. Ensure the refresh token endpoint is working

### Connection Refused
If you get connection refused errors:
1. Verify the Django backend is running: `python manage.py runserver 0.0.0.0:9200`
2. Check that port 9200 is not blocked by firewall
3. Ensure the API_URL includes the correct protocol (http://)

## Next Steps

1. Implement error boundaries for better error handling
2. Add request caching for frequently accessed data
3. Implement optimistic updates for better UX
4. Add WebSocket support for real-time updates
5. Implement offline support with service workers
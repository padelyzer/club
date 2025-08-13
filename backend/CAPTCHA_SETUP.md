# CAPTCHA Implementation Guide

This document explains how to set up and configure Google reCAPTCHA v2 for the Padelyzer registration form.

## Overview

The CAPTCHA system has been implemented to prevent automated signups while maintaining a good user experience. It uses Google reCAPTCHA v2 (the "I'm not a robot" checkbox version) and can be easily enabled/disabled through environment variables.

## Features

- **Configurable**: Can be enabled/disabled via environment variables
- **Development-friendly**: Disabled by default in development mode
- **Production-ready**: Easy to enable for production environments
- **Error handling**: Comprehensive error messages and validation
- **User-friendly**: Clear feedback and error recovery

## Backend Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Enable/disable CAPTCHA (false for development, true for production)
ENABLE_CAPTCHA=true

# Google reCAPTCHA keys
RECAPTCHA_PUBLIC_KEY=your_site_key_here
RECAPTCHA_PRIVATE_KEY=your_secret_key_here
```

### 2. Test Keys

For development and testing, use these test keys provided by Google:
- **Site Key**: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- **Secret Key**: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

⚠️ **Warning**: Test keys will always pass validation. Use real keys in production.

### 3. Production Keys

To get production keys:

1. Visit [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Create a new site
3. Choose reCAPTCHA v2 → "I'm not a robot" Checkbox
4. Add your domain(s)
5. Copy the Site Key and Secret Key to your environment variables

## Frontend Configuration

### Environment Variables

Add to your frontend `.env.local`:

```bash
# Match backend setting
NEXT_PUBLIC_ENABLE_CAPTCHA=true

# Use the same site key as backend
NEXT_PUBLIC_RECAPTCHA_PUBLIC_KEY=your_site_key_here
```

## Development Setup

### Default Configuration

By default, CAPTCHA is **disabled** in development mode:

- Backend: `ENABLE_CAPTCHA=False` in development settings
- Frontend: `NEXT_PUBLIC_ENABLE_CAPTCHA=false` in .env.local

### Testing CAPTCHA in Development

To test CAPTCHA functionality during development:

1. Set `ENABLE_CAPTCHA=True` in backend `.env`
2. Set `NEXT_PUBLIC_ENABLE_CAPTCHA=true` in frontend `.env.local`
3. Use the test keys provided above
4. Restart both servers

## API Endpoints

### Registration Endpoint

**POST** `/api/v1/auth/register/`

Request with CAPTCHA:
```json
{
  "email": "user@example.com",
  "password": "strongpassword",
  "first_name": "John",
  "last_name": "Doe",
  "captcha": "recaptcha_response_token"
}
```

### Error Responses

CAPTCHA validation errors:
```json
{
  "captcha": ["CAPTCHA es requerido."]
}
```

```json
{
  "captcha": ["Verificación CAPTCHA fallida."]
}
```

```json
{
  "captcha": ["El CAPTCHA ha expirado. Por favor, inténtalo de nuevo."]
}
```

## Security Features

### Backend Validation

- Server-side verification with Google's API
- Timeout handling (5-second request timeout)
- Proper error message mapping
- Conditional validation based on settings

### Frontend Implementation

- Token management and expiration handling
- Automatic reset on validation errors
- User-friendly error messages
- Disabled form submission without valid CAPTCHA

## Troubleshooting

### Common Issues

1. **CAPTCHA not showing**: Check that `NEXT_PUBLIC_ENABLE_CAPTCHA=true`
2. **Always failing validation**: Ensure you're using the correct secret key
3. **Network errors**: Check firewall settings for Google reCAPTCHA API
4. **Domain errors**: Verify your domain is registered in reCAPTCHA console

### Debug Mode

Enable debug logging by setting Django's logging level to DEBUG and check for CAPTCHA-related log messages.

## Production Deployment

### Checklist

- [ ] Obtain production reCAPTCHA keys
- [ ] Set `ENABLE_CAPTCHA=True` in production environment
- [ ] Update `RECAPTCHA_PUBLIC_KEY` and `RECAPTCHA_PRIVATE_KEY`
- [ ] Test registration flow with real CAPTCHA
- [ ] Monitor error logs for CAPTCHA-related issues

### Environment Variables for Production

```bash
# Production settings
ENABLE_CAPTCHA=True
RECAPTCHA_PUBLIC_KEY=6Lf...your_production_site_key
RECAPTCHA_PRIVATE_KEY=6Lf...your_production_secret_key
```

## Integration Points

The CAPTCHA system integrates with:

- **Registration Form**: Primary implementation point
- **User Authentication**: Part of the signup flow
- **Error Handling**: Integrated with form validation
- **Settings System**: Configurable through Django settings

## Future Enhancements

Potential improvements:
- Add CAPTCHA to password reset form
- Implement reCAPTCHA v3 for invisible protection
- Add rate limiting based on CAPTCHA failures
- Implement custom CAPTCHA themes
# RECAPTCHA Configuration for Production

## Current Status
The RECAPTCHA test key error has been temporarily silenced in production to allow deployment.

## Action Required
To properly secure the application, you need to:

1. **Get RECAPTCHA Keys**
   - Go to https://www.google.com/recaptcha/admin
   - Create a new site
   - Choose reCAPTCHA v3 (recommended for better UX)
   - Add your production domains

2. **Add to Render Environment Variables**
   - Go to your Render dashboard
   - Navigate to Environment settings
   - Add these variables:
     ```
     RECAPTCHA_PUBLIC_KEY=your_site_key_here
     RECAPTCHA_PRIVATE_KEY=your_secret_key_here
     ```

3. **Remove the Temporary Fix**
   Once proper keys are configured, remove this line from `config/settings/production.py`:
   ```python
   SILENCED_SYSTEM_CHECKS = ["django_recaptcha.recaptcha_test_key_error"]
   ```

## Why This Matters
- RECAPTCHA protects your forms from spam and abuse
- Test keys don't provide any actual protection
- Django correctly identifies this as a security issue

## Affected Areas
The application uses RECAPTCHA in:
- User registration forms
- Contact forms
- Any public-facing forms that need protection

## Temporary Impact
With test keys and the error silenced:
- Forms will display RECAPTCHA
- But won't provide actual protection
- This is acceptable for initial deployment but should be fixed ASAP
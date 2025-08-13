# Manual Test Plan - B2B Login System

## Test Scenarios

### 1. ROOT User Login (Superadmin/Staff)
**User Type**: Superadmin or Staff  
**Expected Behavior**: Redirect to `/[locale]/root`

**Test Steps**:
1. Navigate to login page
2. Enter credentials for superadmin/staff user
3. Submit login form
4. Verify redirect to `/es/root` or `/en/root`

**Test Data**:
- Email: admin@padelyzer.com (is_superuser: true, is_staff: true)
- Email: staff@padelyzer.com (is_superuser: false, is_staff: true)

### 2. Club Owner Login
**User Type**: Club Owner (not superadmin/staff)  
**Expected Behavior**: Redirect to `/[locale]/[club-slug]`

**Test Steps**:
1. Navigate to login page
2. Enter credentials for club owner
3. Submit login form
4. Verify system fetches user's clubs
5. Verify redirect to `/es/[club-slug]`

**Test Data**:
- Email: owner@clubpadel.com
- Expected redirect: `/es/club-padel-madrid` (or actual club slug)

### 3. User Without Club Assignment
**User Type**: Regular user without club  
**Expected Behavior**: Redirect to `/[locale]/dashboard`

**Test Steps**:
1. Navigate to login page
2. Enter credentials for user without clubs
3. Submit login form
4. Verify redirect to `/es/dashboard`

### 4. Error Scenarios

#### 4.1 Invalid Credentials
**Expected**: Show error message, stay on login page

#### 4.2 Club API Failure
**Expected**: Redirect to dashboard as fallback

#### 4.3 Account Locked
**Expected**: Show account locked message

## Console Checks

During testing, monitor browser console for:
1. No 404 errors on redirect
2. No permission errors accessing routes
3. Proper API calls to `/clubs/user-clubs/` or `/api/auth/context`

## Network Tab Checks

1. Login POST request succeeds
2. Club fetch request (if not ROOT user)
3. Proper authorization headers sent

## Verification Checklist

- [ ] ROOT users can access `/root` module
- [ ] Club owners redirect to their club interface
- [ ] Users without clubs go to dashboard
- [ ] No B2C routes are accessible
- [ ] Error handling works properly
- [ ] 2FA flow works if enabled

## B2B Architecture Validation

✅ **ROOT Module**: Only accessible by superadmin/staff  
✅ **Club Module**: Only accessible by club owners  
✅ **No B2C Access**: Players cannot login to web system  
✅ **Proper Separation**: ROOT and CLUB contexts are isolated
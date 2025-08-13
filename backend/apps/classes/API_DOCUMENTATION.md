# Classes Module API Documentation

## Overview
The Classes module provides a comprehensive API for managing class schedules, instructors, enrollments, and attendance for a padel club.

## API Endpoints

### Class Levels
- `GET /api/v1/classes/levels/` - List all class levels
- `GET /api/v1/classes/levels/{id}/` - Get specific level
- `POST /api/v1/classes/levels/` - Create new level
- `PUT /api/v1/classes/levels/{id}/` - Update level
- `DELETE /api/v1/classes/levels/{id}/` - Delete level

### Class Types
- `GET /api/v1/classes/types/` - List class types
- `GET /api/v1/classes/types/{id}/` - Get specific type
- `POST /api/v1/classes/types/` - Create new type
- `PUT /api/v1/classes/types/{id}/` - Update type
- `DELETE /api/v1/classes/types/{id}/` - Delete type

### Instructors
- `GET /api/v1/classes/instructors/` - List instructors
- `GET /api/v1/classes/instructors/{id}/` - Get instructor details
- `POST /api/v1/classes/instructors/` - Create instructor profile
- `PUT /api/v1/classes/instructors/{id}/` - Update instructor
- `DELETE /api/v1/classes/instructors/{id}/` - Delete instructor
- `GET /api/v1/classes/instructors/{id}/schedule/` - Get instructor's schedule
- `GET /api/v1/classes/instructors/{id}/evaluations/` - Get instructor evaluations
- `GET /api/v1/classes/instructors/{id}/stats/` - Get instructor statistics
- `GET /api/v1/classes/instructors/{id}/availability/` - Get availability
- `POST /api/v1/classes/instructors/{id}/availability/` - Update availability
- `GET /api/v1/classes/instructors/{id}/upcoming_sessions/` - Get upcoming sessions

### Class Schedules
- `GET /api/v1/classes/schedules/` - List schedules
- `GET /api/v1/classes/schedules/{id}/` - Get schedule details
- `POST /api/v1/classes/schedules/` - Create schedule
- `PUT /api/v1/classes/schedules/{id}/` - Update schedule
- `DELETE /api/v1/classes/schedules/{id}/` - Delete schedule
- `POST /api/v1/classes/schedules/{id}/generate_sessions/` - Generate sessions
- `PATCH /api/v1/classes/schedules/{id}/toggle_published/` - Toggle published status

### Class Sessions
- `GET /api/v1/classes/sessions/` - List sessions
- `GET /api/v1/classes/sessions/{id}/` - Get session details
- `POST /api/v1/classes/sessions/` - Create session
- `PUT /api/v1/classes/sessions/{id}/` - Update session
- `DELETE /api/v1/classes/sessions/{id}/` - Delete session
- `POST /api/v1/classes/sessions/{id}/cancel/` - Cancel session
- `POST /api/v1/classes/sessions/{id}/start/` - Start session
- `POST /api/v1/classes/sessions/{id}/complete/` - Complete session
- `GET /api/v1/classes/sessions/{id}/enrollments/` - Get enrollments
- `POST /api/v1/classes/sessions/{id}/take_attendance/` - Take attendance
- `GET /api/v1/classes/sessions/{id}/waitlist/` - Get waitlist
- `POST /api/v1/classes/sessions/{id}/assign_substitute/` - Assign substitute instructor

### Class Enrollments
- `GET /api/v1/classes/enrollments/` - List enrollments
- `GET /api/v1/classes/enrollments/{id}/` - Get enrollment details
- `POST /api/v1/classes/enrollments/` - Create enrollment (with payment)
- `PUT /api/v1/classes/enrollments/{id}/` - Update enrollment
- `DELETE /api/v1/classes/enrollments/{id}/` - Delete enrollment
- `POST /api/v1/classes/enrollments/{id}/cancel/` - Cancel enrollment
- `POST /api/v1/classes/enrollments/{id}/check_in/` - Check in

### Class Attendance
- `GET /api/v1/classes/attendance/` - List attendance records
- `GET /api/v1/classes/attendance/{id}/` - Get attendance details
- `POST /api/v1/classes/attendance/` - Create attendance record
- `PUT /api/v1/classes/attendance/{id}/` - Update attendance
- `DELETE /api/v1/classes/attendance/{id}/` - Delete attendance

### Instructor Evaluations
- `GET /api/v1/classes/evaluations/` - List evaluations
- `GET /api/v1/classes/evaluations/{id}/` - Get evaluation details
- `POST /api/v1/classes/evaluations/` - Create evaluation
- `PUT /api/v1/classes/evaluations/{id}/` - Update evaluation
- `DELETE /api/v1/classes/evaluations/{id}/` - Delete evaluation

### Class Packages
- `GET /api/v1/classes/packages/` - List packages
- `GET /api/v1/classes/packages/{id}/` - Get package details
- `POST /api/v1/classes/packages/` - Create package
- `PUT /api/v1/classes/packages/{id}/` - Update package
- `DELETE /api/v1/classes/packages/{id}/` - Delete package

### Student Packages
- `GET /api/v1/classes/student-packages/` - List student packages
- `GET /api/v1/classes/student-packages/{id}/` - Get package details
- `POST /api/v1/classes/student-packages/` - Purchase package
- `PUT /api/v1/classes/student-packages/{id}/` - Update package
- `DELETE /api/v1/classes/student-packages/{id}/` - Delete package

### Calendar & Search
- `GET /api/v1/classes/calendar/monthly/` - Monthly calendar view
- `GET /api/v1/classes/calendar/weekly/` - Weekly calendar view
- `GET /api/v1/classes/search/available/` - Search available classes
- `GET /api/v1/classes/history/my_classes/` - Student's class history
- `GET /api/v1/classes/history/stats/` - Student's statistics

## Key Features Implemented

### 1. Enrollment with Payment Integration
- Supports both direct payment and package usage
- Integrates with Finance module for payment processing
- Handles member pricing automatically

### 2. Attendance Management
- Bulk attendance taking for instructors
- Automatic check-in on attendance
- Tracking of no-shows

### 3. Waitlist Management
- Automatic promotion from waitlist when spots open
- Configurable waitlist size per schedule
- Position tracking for fairness

### 4. Instructor Management
- Availability scheduling
- Substitute assignment with conflict checking
- Performance tracking through evaluations
- Statistics and analytics

### 5. Class Search
- Filter by date range, type, level, instructor
- Time of day filtering (morning/afternoon/evening)
- Day of week filtering
- Only shows classes with available spots

### 6. Calendar Views
- Monthly overview with session counts
- Weekly detailed view
- Integration with court scheduling

## Query Parameters

### Common Filters
- `club` - Filter by club ID
- `active_only=true` - Only active records
- `start_date` - Start date filter (YYYY-MM-DD)
- `end_date` - End date filter (YYYY-MM-DD)
- `status` - Filter by status

### Session Filters
- `instructor` - Filter by instructor ID
- `time_filter` - "upcoming" or "past"
- `class_type` - Filter by class type ID
- `level` - Filter by level ID

### Search Filters
- `day_of_week` - 0-6 (Monday-Sunday)
- `time_range` - "morning", "afternoon", "evening"

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Permissions
- Students can only view and enroll in classes
- Instructors can manage their own sessions and take attendance
- Club staff can manage all aspects of the classes module
- Organization admins have full access

## Error Responses
Standard error format:
```json
{
    "error": "Error message",
    "details": {} // Optional additional details
}
```

Common status codes:
- 200 - Success
- 201 - Created
- 400 - Bad Request
- 401 - Unauthorized
- 403 - Forbidden
- 404 - Not Found
- 409 - Conflict

## Integration Points
- **Finance Module**: Payment processing for enrollments
- **Clubs Module**: Court availability and scheduling
- **Clients Module**: Student profiles and preferences
- **Notifications Module**: Email/SMS for class reminders (TODO)
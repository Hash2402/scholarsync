# ScholarSync API Documentation

## Authentication

### Login
- **Endpoint**: `/auth/login`
- **Method**: POST
- **Description**: Authenticates users and returns user data with role-specific information
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string",
    "isProfessor": boolean
  }
  ```
- **Response**:
  ```json
  {
    "user_id": "string",
    "name": "string",
    "email": "string",
    "isProfessor": boolean,
    "courses_taught": [], // For professors
    "enrolled_courses": [] // For students
  }
  ```

## Grade Management

### Get Grades
- **Endpoint**: `/grades`
- **Method**: GET
- **Description**: Retrieves grades for a specific course
- **Query Parameters**:
  - `email`: string (required)
  - `course_id`: string (required)
  - `isProfessor`: boolean (required)
- **Response**:
  ```json
  {
    "course_id": "string",
    "course_name": "string",
    "students": [
      {
        "student_id": "string",
        "student_name": "string",
        "grade": "string",
        "grade_id": "string"
      }
    ]
  }
  ```

### Update Grade
- **Endpoint**: `/grades`
- **Method**: PUT
- **Description**: Updates a student's grade for a specific course
- **Query Parameters**:
  - `email`: string (required)
- **Request Body**:
  ```json
  {
    "grade_id": "string",
    "course_id": "string",
    "grade": "string",
    "student_id": "string"
  }
  ```
- **Response**:
  ```json
  {
    "grade_id": "string",
    "status": "success"
  }
  ```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

- 100 requests per minute per IP address
- Rate limit headers are included in all responses:
  - `X-RateLimit-Limit`: Maximum requests per minute
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets

## Authentication

All protected endpoints require a valid session token. The token should be included in the request headers:

```
Authorization: Bearer <token>
```

## Data Types

### Grade
- String representation of a number between 0 and 100
- Special value "NA" for ungraded assignments

### Course ID
- Alphanumeric string
- Format: `[A-Z]{2,3}[0-9]{3}`

### Student ID
- Alphanumeric string
- Format: `[A-Z]{2}[0-9]{6}`

## Best Practices

1. Always handle rate limiting in your client applications
2. Implement proper error handling for all API responses
3. Cache responses when appropriate
4. Use HTTPS for all API calls
5. Implement proper session management 
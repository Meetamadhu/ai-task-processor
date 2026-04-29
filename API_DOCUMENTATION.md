# AI Task Processing Platform - API Documentation

## Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://api.your-domain.com`

## Authentication

All endpoints except `/auth/*` require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

JWT tokens expire after 7 days.

## Error Handling

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Server Error

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Validation Rules**:
- Email must be valid email format
- Password minimum 6 characters
- Name is required
- Email must be unique (409 if exists)

**Example**:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

---

### Login

Authenticate user and get JWT token.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Error Cases**:
- `401`: Invalid email or password
- `400`: Missing email or password

**Example**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }' | jq -r '.token' > token.txt
```

---

## Task Endpoints

### Create Task

Submit a new task for processing.

**Endpoint**: `POST /tasks`

**Request Body**:
```json
{
  "title": "Convert to Uppercase",
  "inputText": "hello world",
  "operation": "uppercase"
}
```

**Operations**:
- `uppercase`: Convert text to uppercase
- `lowercase`: Convert text to lowercase
- `reverse`: Reverse the string
- `word_count`: Count words in text

**Response** (201 Created):
```json
{
  "task": {
    "id": "507f1f77bcf86cd799439012",
    "title": "Convert to Uppercase",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Validation**:
- Title required
- Input text required
- Operation must be one of: uppercase, lowercase, reverse, word_count

**Example**:
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $(cat token.txt)" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Task",
    "inputText": "test data",
    "operation": "uppercase"
  }'
```

---

### Get All Tasks

Retrieve all tasks for the authenticated user with optional filtering.

**Endpoint**: `GET /tasks`

**Query Parameters**:
- `status` (optional): Filter by status (pending, running, success, failed)
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `skip` (optional): Number of results to skip for pagination (default: 0)

**Response** (200 OK):
```json
{
  "tasks": [
    {
      "id": "507f1f77bcf86cd799439012",
      "title": "Convert to Uppercase",
      "inputText": "hello world",
      "operation": "uppercase",
      "status": "success",
      "result": "HELLO WORLD",
      "logs": [
        "[2024-01-15T10:30:00Z] Task created and queued for processing",
        "[2024-01-15T10:30:01Z] Task processing started",
        "[2024-01-15T10:30:02Z] Task completed successfully"
      ],
      "createdAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:30:02Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 50,
    "skip": 0,
    "pages": 1
  }
}
```

**Examples**:
```bash
# Get all tasks
curl -H "Authorization: Bearer $(cat token.txt)" \
  http://localhost:5000/api/tasks

# Get only completed tasks
curl -H "Authorization: Bearer $(cat token.txt)" \
  "http://localhost:5000/api/tasks?status=success"

# Get with pagination
curl -H "Authorization: Bearer $(cat token.txt)" \
  "http://localhost:5000/api/tasks?limit=20&skip=20"

# Combine filters
curl -H "Authorization: Bearer $(cat token.txt)" \
  "http://localhost:5000/api/tasks?status=pending&limit=10"
```

---

### Get Task by ID

Retrieve details of a specific task.

**Endpoint**: `GET /tasks/:taskId`

**Path Parameters**:
- `taskId`: Task ID (MongoDB ObjectId)

**Response** (200 OK):
```json
{
  "task": {
    "id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "title": "Convert to Uppercase",
    "inputText": "hello world",
    "operation": "uppercase",
    "status": "success",
    "result": "HELLO WORLD",
    "logs": [
      "[2024-01-15T10:30:00Z] Task created and queued for processing",
      "[2024-01-15T10:30:01Z] Task processing started",
      "[2024-01-15T10:30:02Z] Task completed successfully"
    ],
    "error": null,
    "startedAt": "2024-01-15T10:30:01Z",
    "completedAt": "2024-01-15T10:30:02Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:02Z"
  }
}
```

**Error Cases**:
- `404`: Task not found or not owned by user

**Example**:
```bash
curl -H "Authorization: Bearer $(cat token.txt)" \
  http://localhost:5000/api/tasks/507f1f77bcf86cd799439012
```

---

### Get Task Logs

Retrieve processing logs for a specific task.

**Endpoint**: `GET /tasks/:taskId/logs`

**Path Parameters**:
- `taskId`: Task ID (MongoDB ObjectId)

**Response** (200 OK):
```json
{
  "logs": [
    "[2024-01-15T10:30:00Z] Task created and queued for processing",
    "[2024-01-15T10:30:01Z] Task processing started",
    "[2024-01-15T10:30:01Z] Beginning string operation: uppercase",
    "[2024-01-15T10:30:02Z] Result: HELLO WORLD",
    "[2024-01-15T10:30:02Z] Task completed successfully"
  ]
}
```

**Example**:
```bash
curl -H "Authorization: Bearer $(cat token.txt)" \
  http://localhost:5000/api/tasks/507f1f77bcf86cd799439012/logs
```

---

### Delete Task

Delete a task. Can only delete own tasks.

**Endpoint**: `DELETE /tasks/:taskId`

**Path Parameters**:
- `taskId`: Task ID (MongoDB ObjectId)

**Response** (200 OK):
```json
{
  "message": "Task deleted successfully"
}
```

**Error Cases**:
- `404`: Task not found or not owned by user

**Example**:
```bash
curl -X DELETE \
  -H "Authorization: Bearer $(cat token.txt)" \
  http://localhost:5000/api/tasks/507f1f77bcf86cd799439012
```

---

## Health Check

### System Health

Check if the API is running and responsive.

**Endpoint**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Example**:
```bash
curl http://localhost:5000/health
```

---

## Rate Limiting

API requests are rate limited to:
- **100 requests per 15 minutes** per IP address

When rate limit is exceeded, the response will be:
```
HTTP/1.1 429 Too Many Requests
```

---

## CORS Configuration

CORS is enabled for:
- **Frontend**: Configured via `FRONTEND_URL` environment variable
- **Default**: `http://localhost:3000`

---

## Request/Response Examples

### Complete Workflow Example

```bash
#!/bin/bash

# 1. Register
RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }')

TOKEN=$(echo $RESPONSE | jq -r '.token')
USER_ID=$(echo $RESPONSE | jq -r '.user.id')

echo "Registered with token: $TOKEN"

# 2. Create task
TASK=$(curl -s -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "inputText": "hello world",
    "operation": "uppercase"
  }')

TASK_ID=$(echo $TASK | jq -r '.task.id')
echo "Created task: $TASK_ID"

# 3. Poll for results
for i in {1..10}; do
  RESULT=$(curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:5000/api/tasks/$TASK_ID)
  
  STATUS=$(echo $RESULT | jq -r '.task.status')
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "success" ]; then
    echo "Result: $(echo $RESULT | jq -r '.task.result')"
    break
  fi
  
  sleep 1
done

# 4. Get logs
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/tasks/$TASK_ID/logs | jq '.logs'
```

---

## Status Codes Reference

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Task retrieved successfully |
| 201 | Created | New task created |
| 400 | Bad Request | Missing required field |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Token expired or invalid |
| 404 | Not Found | Task doesn't exist |
| 409 | Conflict | Email already registered |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected error |

---

## Best Practices

1. **Store tokens securely** - Use secure storage (localStorage with caution, or sessionStorage)
2. **Implement token refresh** - Tokens expire after 7 days
3. **Use pagination** - Don't fetch all tasks at once
4. **Handle errors gracefully** - Check error responses
5. **Rate limiting awareness** - Implement exponential backoff for retries
6. **Poll status** - Don't make too many requests; use reasonable intervals

---

## Testing API Locally

### Using curl

```bash
# With token in variable
TOKEN="your_jwt_token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/tasks
```

### Using Postman

1. Set base URL: `http://localhost:5000/api`
2. Create environment with variable `token`
3. Add Bearer token in Authorization tab
4. Test each endpoint

### Using REST Client (VS Code)

Create `test.rest`:
```rest
### Register
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}

### Login
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

### Create Task
POST http://localhost:5000/api/tasks
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "title": "Test",
  "inputText": "hello",
  "operation": "uppercase"
}
```

---

## Support

For API issues or questions:
1. Check logs: `docker-compose logs backend`
2. Verify services: `docker-compose ps`
3. Test connectivity: `curl http://localhost:5000/health`
4. Open GitHub issue with error details

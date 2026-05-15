# DKnex AI API Documentation

## Base URL
`http://localhost:8080`

## Authentication

### Register User
`POST /api/auth/signup`
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "role": ["user"]
}
```

### Login User
`POST /api/auth/signin`
```json
{
  "username": "johndoe",
  "password": "password123"
}
```
*Response includes `token` which must be used as `Bearer <token>` in Authorization header for other requests.*

---

## Agent Management

### Create Agent (Admin Only)
`POST /api/agents`
```json
{
  "name": "CodeAssistant",
  "description": "Helps with Java coding",
  "type": "coding",
  "status": true
}
```

### List All Agents
`GET /api/agents`

### Get Agent Details
`GET /api/agents/{id}`

### Toggle Agent Status (Admin Only)
`PATCH /api/agents/{id}/toggle`

---

## AI Execution

### Execute Agent
`POST /api/agents/{id}/execute`
```json
{
  "input": "How do I use Spring Security?"
}
```

### Get Execution Logs
`GET /api/agents/{id}/logs`

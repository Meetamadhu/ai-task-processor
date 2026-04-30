# AI Task Processing Platform - Application Repository

A production-ready MERN stack application for asynchronous AI task processing with Redis queue management, MongoDB persistence, and Kubernetes-ready containerization.

## Features

- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Async Task Processing**: Background job processing with Redis queue
- **Real-time Status Tracking**: Monitor task status (pending, running, success, failed)
- **Supported Operations**:
  - Convert text to uppercase
  - Convert text to lowercase
  - Reverse string
  - Count words
- **Comprehensive Logging**: Task logs and results tracking
- **Security**: Helmet middleware, rate limiting, CORS configuration
- **Scalable Architecture**: Horizontally scalable worker services

## Architecture

Full write-up: **[ARCHITECTURE.md](./ARCHITECTURE.md)** (scaling, 100k tasks/day, indexes, Redis failure, staging vs production).

```text
┌─────────────┐
│   React     │
│  Frontend   │
└──────┬──────┘
       │
       │ HTTP(S)
       ▼
┌─────────────────────┐
│  Node.js + Express  │
│    Backend API      │
└────────────┬────────┘
       │     │
       │     └──────────────┐
    HTTP              Redis Queue
       │                    │
    JSON                    ▼
       │              ┌──────────────┐
       │              │   Python     │
       │              │   Workers    │
       │              │  (Scalable)  │
       │              └──────┬───────┘
       │                     │
       └─────────────┬───────┘
                     ▼
              ┌─────────────┐
              │  MongoDB    │
              │  Database   │
              └─────────────┘
```

## Project Structure

```
.
├── frontend/              # React application
│   ├── public/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service
│   │   ├── styles/       # CSS files
│   │   └── App.js
│   ├── Dockerfile
│   └── package.json
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── models/       # MongoDB models
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── worker/               # Python background worker
│   ├── worker.py
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml    # Local development setup
└── .github/workflows/    # CI/CD pipelines
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- MongoDB 6.0+ (for local development)
- Redis 7+ (for local development)

### Local Development with Docker Compose

1. **Clone the repository**:
```bash
git clone https://github.com/your-username/ai-task-processor.git
cd ai-task-processor
```

2. **Set up environment variables**:
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env

# Worker
cp worker/.env.example worker/.env
```

3. **Start all services**:
```bash
docker-compose up -d
```

4. **Access the application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017
- Redis: localhost:6379

5. **Create a test account**:
   - Register a new account on the frontend
   - Create and run tasks
   - Monitor task status in real-time

### Stopping services:
```bash
docker-compose down
```

### View logs:
```bash
docker-compose logs -f [service-name]
docker-compose logs -f backend
docker-compose logs -f worker
```

## Local Development (Without Docker)

### Backend Setup
```bash
cd backend
npm install
# Update .env with your MongoDB and Redis connection strings
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
# Update .env.local with backend API URL
npm start
```

### Worker Setup
```bash
cd worker
pip install -r requirements.txt
python worker.py
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Tasks
- `GET /api/tasks` - Get all tasks for authenticated user
- `GET /api/tasks/:taskId` - Get specific task
- `GET /api/tasks/:taskId/logs` - Get task logs
- `POST /api/tasks` - Create new task
- `DELETE /api/tasks/:taskId` - Delete task

### Health Check
- `GET /health` - Backend health check

## Database Schema

### User
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Task
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  inputText: String,
  operation: String (enum: uppercase, lowercase, reverse, word_count),
  status: String (enum: pending, running, success, failed),
  result: String,
  logs: [String],
  error: String,
  startedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Redis Queue Format

Tasks are stored in Redis with the following structure:
```javascript
{
  taskId: String,
  inputText: String,
  operation: String (uppercase, lowercase, reverse, word_count)
}
```

Queue name: `task_queue`

## Security Measures

- ✅ JWT authentication with 7-day expiration
- ✅ Bcrypt password hashing (10 salt rounds)
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Input validation with Joi
- ✅ Non-root user containers
- ✅ No hardcoded secrets

## Environment Variables

### Backend
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://mongo:27017/ai-task-processor
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=   # required — use a long random string (e.g. openssl rand -base64 48)
FRONTEND_URL=http://localhost:3000
```

### Frontend

`REACT_APP_API_URL` is embedded at **`npm run build`** time. For Docker, pass a build argument (see `frontend/Dockerfile` and `docker-compose.yml`). For production CI, set the repository variable `REACT_APP_API_URL` as documented above.

```
REACT_APP_API_URL=http://localhost:5000/api
```

### Worker
```
REDIS_HOST=redis
REDIS_PORT=6379
MONGODB_URI=mongodb://mongo:27017/ai-task-processor
```

## Troubleshooting

### Connection Issues
- Ensure all services are running: `docker-compose ps`
- Check logs: `docker-compose logs [service-name]`
- Verify network: `docker network ls`

### Database Issues
- Reset database: `docker-compose down -v` then `docker-compose up -d`
- Check MongoDB connection: `docker exec ai-task-processor-mongo mongosh`

### Worker Not Processing Tasks
- Check Redis connection: `docker exec ai-task-processor-redis redis-cli ping`
- Verify worker logs: `docker-compose logs -f worker`

## Performance Optimization

### Database Indexing
- `userId` and `createdAt` for user task queries
- `status` for filtering by task status
- `userId` and `status` for combined queries

### Caching Strategy
- Redis is used for job queue only
- Consider adding Redis caching layer for frequently accessed data

### Scaling
- Worker service scales horizontally with multiple replicas
- Backend API stateless for horizontal scaling
- MongoDB and Redis should use persistent volumes

## Testing

Run linting:
```bash
# Frontend
cd frontend && npm run lint

# Backend
cd backend && npm run lint

# Worker
pip install flake8
flake8 worker/worker.py
```

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/build-deploy.yml`.

| Secret / variable | Purpose |
|-------------------|---------|
| `DOCKER_USERNAME`, `DOCKER_PASSWORD` | Push images to Docker Hub |
| `INFRA_REPO` | GitHub repo slug for manifests (e.g. `your-org/ai-task-processor-infra`) |
| `INFRA_DEPLOY_TOKEN` | **PAT** with `contents: write` on the **infra** repo (used as `GH_TOKEN` + `gh auth setup-git` for push). |
| Repository variable `REACT_APP_API_URL` | **Optional** — public API base URL baked into the frontend at **Docker build** (e.g. `https://api.example.com/api`). If unset, CI defaults to `http://localhost:5000/api`. |

Lint runs first; image build/push runs only if lint passes. On `main`, the workflow bumps `newTag` (and Docker Hub `newName` prefix) in `infra-repo/k8s/kustomization.yaml` and pushes to `main`.

## Building Docker Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend
docker-compose build worker

# Push to registry
docker tag ai-task-processor-backend:latest your-registry/ai-task-processor-backend:latest
docker push your-registry/ai-task-processor-backend:latest
```

## Deployment

See the infrastructure repository for Kubernetes deployment details:
- [Infrastructure Repository](../infra-repo/README.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

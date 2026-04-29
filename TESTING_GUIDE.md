# Testing & Quality Assurance Guide

## Overview

This document outlines testing strategies, deployment procedures, and quality checks for the AI Task Processing Platform.

## Local Testing

### Backend Testing

```bash
# Install test dependencies
cd backend
npm install --save-dev jest supertest

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.js
```

### Frontend Testing

```bash
# Install test dependencies
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Run tests
npm test -- --watchAll=false

# Run with coverage
npm test -- --coverage --watchAll=false
```

### Worker Testing

```bash
# Test worker code with Python unittest
cd worker
pip install pytest

# Create test_worker.py
python -m pytest test_worker.py -v
```

## Linting & Code Quality

### Backend Linting

```bash
cd backend

# Run ESLint
npm run lint

# Fix issues automatically
npm run lint -- --fix

# Check specific file
npm run lint -- src/routes/auth.js
```

### Frontend Linting

```bash
cd frontend

# Run ESLint
npm run lint

# Fix issues automatically
npm run lint -- --fix
```

### Worker Code Quality

```bash
pip install flake8 pylint

# Check code style
flake8 worker/worker.py

# Detailed analysis
pylint worker/worker.py
```

## Security Scanning

### Dependencies Audit

```bash
# Backend
cd backend
npm audit
npm audit fix  # Fix automatically

# Frontend
cd frontend
npm audit
npm audit fix
```

### SAST (Static Application Security Testing)

```bash
# Install Snyk (if available)
npm install -g snyk

# Test project
snyk test

# Monitor for vulnerabilities
snyk monitor
```

## Docker Image Testing

### Build Validation

```bash
# Build and test image
docker build -t ai-task-processor-backend:test -f backend/Dockerfile ./backend

# Run container health check
docker run --rm ai-task-processor-backend:test npm run lint

# Scan image for vulnerabilities
docker scan ai-task-processor-backend:test
```

### Container Security

```bash
# Check for non-root user
docker inspect ai-task-processor-backend:test | grep -i user

# Verify image layers
docker history ai-task-processor-backend:test

# Check file permissions
docker run --rm ai-task-processor-backend:test ls -la
```

## Integration Testing

### API Integration Tests

```bash
# Start services
docker-compose up -d

# Run API tests
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Test task creation
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "inputText": "hello world",
    "operation": "uppercase"
  }'
```

### End-to-End Testing

```bash
# Create test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "e2e@example.com",
    "password": "test123",
    "name": "E2E Test"
  }' | jq -r '.token' > token.txt

# Create task
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $(cat token.txt)" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "E2E Test",
    "inputText": "test",
    "operation": "uppercase"
  }'

# Check task status (with polling)
for i in {1..10}; do
  echo "Attempt $i..."
  curl -X GET http://localhost:5000/api/tasks \
    -H "Authorization: Bearer $(cat token.txt)" | jq '.tasks[0] | {status, result}'
  sleep 2
done
```

## Load Testing

### Setup Artillery for load testing

```bash
npm install -g artillery

# Create load-test.yml
cat > load-test.yml << EOF
config:
  target: "http://localhost:5000"
  phases:
    - duration: 60
      arrivalRate: 5  # 5 requests/second
  processor: "./load-test-processor.js"

scenarios:
  - name: "Task Processing"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            - json: "$.token"
              as: "authToken"
      - post:
          url: "/api/tasks"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            title: "Load Test"
            inputText: "test data"
            operation: "uppercase"
EOF

# Run load test
artillery run load-test.yml
```

## Kubernetes Deployment Testing

### Pre-deployment Checks

```bash
# Validate YAML manifests
kubectl apply -f k8s/ --dry-run=client

# Check resource availability
kubectl describe nodes

# Verify image availability
kubectl auth can-i get pods --as=system:serviceaccount:default:default

# Check namespace
kubectl get namespace ai-task-processor
```

### Staged Deployment

```bash
# Stage 1: Deploy to namespace with validation
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Stage 2: Deploy databases
kubectl apply -f k8s/mongodb-statefulset.yaml
kubectl apply -f k8s/redis-statefulset.yaml

# Wait for databases
kubectl wait --for=condition=ready pod -l app=mongo -n ai-task-processor --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n ai-task-processor --timeout=300s

# Stage 3: Deploy application
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/worker-deployment.yaml

# Stage 4: Verify rollout
kubectl rollout status deployment/backend -n ai-task-processor
kubectl rollout status deployment/frontend -n ai-task-processor
kubectl rollout status deployment/worker -n ai-task-processor
```

### Post-deployment Validation

```bash
# Check pod health
kubectl get pods -n ai-task-processor
kubectl describe pods -n ai-task-processor

# Check logs
kubectl logs -f deployment/backend -n ai-task-processor
kubectl logs -f deployment/worker -n ai-task-processor

# Test service connectivity
kubectl port-forward svc/backend 5000:5000 -n ai-task-processor &
curl http://localhost:5000/health

# Test database connectivity
kubectl exec -it backend-xxx -n ai-task-processor -- \
  node -e "const MongoClient = require('mongodb').MongoClient; \
  MongoClient.connect(process.env.MONGODB_URI, (err, client) => { \
    console.log(err ? 'Connection failed' : 'Connected to MongoDB'); \
  });"
```

## Argo CD Sync Testing

```bash
# Verify application status
argocd app get ai-task-processor
argocd app wait ai-task-processor

# Check sync status
argocd app diff ai-task-processor

# Monitor logs
argocd app logs ai-task-processor

# Test manual sync
argocd app sync ai-task-processor
argocd app wait ai-task-processor

# Check for sync issues
argocd app wait ai-task-processor --health
```

## Performance Testing

### Monitor resource usage

```bash
# During load test
watch -n 1 'kubectl top pods -n ai-task-processor'

# Monitor HPA scaling
watch -n 1 'kubectl get hpa -n ai-task-processor'

# Check database performance
kubectl exec -it mongo-0 -n ai-task-processor -- mongosh
> db.tasks.aggregate([{$group: {_id: "$status", count: {$sum: 1}}}])
```

## Troubleshooting Failed Tests

### Common Issues

**Connection Refused**
```bash
# Verify service is running
docker-compose ps
kubectl get svc -n ai-task-processor

# Check logs
docker-compose logs backend
kubectl logs deployment/backend -n ai-task-processor
```

**Authentication Errors**
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check token validity
echo "token" | jq '.'
```

**Database Connection Issues**
```bash
# Test connectivity
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"
kubectl exec -it mongo-0 -n ai-task-processor -- mongosh --eval "db.adminCommand('ping')"
```

## CI/CD Testing

Tests are automatically run on:
- PR creation
- Commits to main/develop
- Tag creation

View results in GitHub Actions or CI/CD platform.

## Testing Checklist

- [ ] All unit tests pass
- [ ] Linting passes with no errors
- [ ] Security audit passes
- [ ] Integration tests pass
- [ ] Load tests meet requirements
- [ ] Docker image builds successfully
- [ ] Image security scan passes
- [ ] Kubernetes manifests validate
- [ ] Pod health checks pass
- [ ] Application endpoints respond
- [ ] Database operations work
- [ ] Scaling tests pass
- [ ] Rollback tests pass

## Best Practices

1. **Test Early, Test Often**: Run tests before committing
2. **Automate Everything**: Let CI/CD handle testing
3. **Test in Production-Like Environments**: Use staging cluster
4. **Monitor Test Results**: Track trends over time
5. **Fix Failing Tests Immediately**: Don't ignore failures
6. **Document Test Procedures**: Keep this guide updated
7. **Review Test Coverage**: Aim for > 80% coverage

## References

- [Jest Documentation](https://jestjs.io)
- [React Testing Library](https://testing-library.com/react)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Kubernetes Testing](https://kubernetes.io/docs/tasks/debug-application-cluster/)

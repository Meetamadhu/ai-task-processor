# AI Task Processing Platform - Complete Setup Guide

## Overview

This guide provides step-by-step instructions to set up and run the AI Task Processing Platform in various environments.

## Table of Contents

1. [Local Development with Docker Compose](#local-development)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Argo CD GitOps Setup](#argo-cd-setup)
4. [CI/CD Pipeline Configuration](#ci-cd-setup)
5. [Monitoring & Debugging](#monitoring)

---

## Local Development with Docker Compose {#local-development}

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Git

### Step 1: Clone Repository

```bash
git clone https://github.com/your-username/ai-task-processor.git
cd ai-task-processor
```

### Step 2: Setup Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
cat > backend/.env << EOF
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://mongo:27017/ai-task-processor
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=dev-secret-change-in-production
FRONTEND_URL=http://localhost:3000
EOF

# Frontend
cp frontend/.env.example frontend/.env

# Worker
cp worker/.env.example worker/.env
```

### Step 3: Start Services

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Step 4: Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Step 5: Create Test Account

1. Navigate to http://localhost:3000
2. Click "Register"
3. Create account with test credentials
4. Login and create tasks

### Step 6: Monitor Services

```bash
# View logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f worker

# Execute command in container
docker-compose exec backend npm run lint
```

### Step 7: Stop Services

```bash
docker-compose down
docker-compose down -v  # Also remove volumes
```

---

## Kubernetes Deployment {#kubernetes-deployment}

### Prerequisites

- Kubernetes 1.24+ cluster
- kubectl configured
- Helm 3+
- 4+ GB RAM, 2+ CPU cores

### Option A: Using k3s (Recommended for Testing)

```bash
# Install k3s
curl -sfL https://get.k3s.io | sh -

# Verify
kubectl get nodes
kubectl get pods -A
```

### Option B: Using Existing Cluster

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### Step 1: Create Namespace

```bash
kubectl create namespace ai-task-processor
kubectl label namespace ai-task-processor istio-injection=disabled
```

### Step 2: Create Secrets

```bash
# JWT Secret
kubectl create secret generic ai-task-processor-secret \
  --from-literal=JWT_SECRET='your-super-secret-jwt-key' \
  -n ai-task-processor

# Docker Registry (if using private registry)
kubectl create secret docker-registry regcred \
  --docker-server=docker.io \
  --docker-username=your-username \
  --docker-password=your-password \
  -n ai-task-processor
```

### Step 3: Update Image References

```bash
# Edit k8s/backend-deployment.yaml
# Replace: your-docker-registry -> your actual registry
sed -i 's|your-docker-registry|docker.io/your-username|g' infra-repo/k8s/*.yaml

# Verify changes
grep "image:" infra-repo/k8s/*.yaml
```

### Step 4: Apply Manifests

```bash
# Apply all manifests
kubectl apply -f infra-repo/k8s/

# Or use kustomize
kubectl apply -k infra-repo/k8s/

# Verify
kubectl get all -n ai-task-processor
```

### Step 5: Wait for Services to Start

```bash
# Monitor pod startup
kubectl get pods -n ai-task-processor -w

# Check pod status
kubectl describe pod <pod-name> -n ai-task-processor

# View logs
kubectl logs <pod-name> -n ai-task-processor
```

### Step 6: Setup Ingress

```bash
# Install NGINX Ingress Controller
./infra-repo/scripts/setup-ingress.sh

# Update domain in k8s/ingress.yaml
sed -i 's|app.example.com|your-domain.com|g' infra-repo/k8s/ingress.yaml
sed -i 's|api.example.com|api.your-domain.com|g' infra-repo/k8s/ingress.yaml

# Apply ingress
kubectl apply -f infra-repo/k8s/ingress.yaml

# Get Ingress IP
kubectl get ingress -n ai-task-processor
```

### Step 7: Configure DNS

```bash
# Get the Ingress Controller IP
INGRESS_IP=$(kubectl get svc -n ingress-nginx nginx-ingress-ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Point DNS records to: $INGRESS_IP"
```

Update your DNS provider:
- `app.your-domain.com` → Ingress IP
- `api.your-domain.com` → Ingress IP

---

## Argo CD GitOps Setup {#argo-cd-setup}

### Step 1: Install Argo CD

```bash
# Run installation script
chmod +x infra-repo/scripts/install-argo-cd.sh
./infra-repo/scripts/install-argo-cd.sh

# Or manually
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### Step 2: Access Argo CD Dashboard

```bash
# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Get admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)
echo "Password: $ARGOCD_PASSWORD"
```

Access: https://localhost:8080
- Username: admin
- Password: `$ARGOCD_PASSWORD`

### Step 3: Change Admin Password

```bash
# Port forward (if not running)
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Login with CLI
argocd login localhost:8080 --insecure \
  --username admin \
  --password "$ARGOCD_PASSWORD"

# Update password
argocd account update-password
```

### Step 4: Configure GitHub Repository Access

```bash
# If using private repository, add SSH key
kubectl create secret generic argocd-repo-creds \
  --from-literal=sshPrivateKeySecret=~/.ssh/id_rsa \
  -n argocd

# Or using personal access token
argocd repo add https://github.com/your-username/ai-task-processor-infra.git \
  --username your-username \
  --password your-personal-access-token
```

### Step 5: Create Argo CD Application

```bash
# Update repository URL in argocd/application.yaml
sed -i 's|https://github.com/your-username/ai-task-processor-infra.git|your-repo-url|g' \
  infra-repo/argocd/application.yaml

# Apply application
kubectl apply -f infra-repo/argocd/application.yaml

# Monitor sync
kubectl get application -n argocd -w
argocd app get ai-task-processor
argocd app logs ai-task-processor -n argocd
```

### Step 6: Enable Auto-Sync

The application is configured with auto-sync enabled. Changes to the repository will automatically deploy.

```bash
# Manual sync if needed
argocd app sync ai-task-processor

# Force refresh
argocd app refresh ai-task-processor
argocd app sync ai-task-processor --force
```

---

## CI/CD Pipeline Configuration {#ci-cd-setup}

### Step 1: Push Code to GitHub

```bash
git remote add origin https://github.com/your-username/ai-task-processor.git
git branch -M main
git push -u origin main
```

### Step 2: Setup Docker Hub Credentials

1. Go to https://hub.docker.com/settings/security
2. Create Personal Access Token
3. In GitHub Repository Settings → Secrets:
   - Add `DOCKER_USERNAME`
   - Add `DOCKER_PASSWORD`

### Step 3: Setup Infrastructure Repository Reference

In GitHub Repository Settings → Secrets:
- Add `INFRA_REPO`: `your-username/ai-task-processor-infra`

### Step 4: Trigger Pipeline

```bash
# Any push to main/develop will trigger pipeline
git add .
git commit -m "Initial commit"
git push origin main

# Monitor in GitHub → Actions
```

### Step 5: Monitor Pipeline

```bash
# View workflow
GitHub UI → Actions → Build and Deploy

# Check image push
docker pull docker.io/your-username/ai-task-processor-backend:latest
```

---

## Monitoring & Debugging {#monitoring}

### Health Checks

```bash
# Backend health
curl http://localhost:5000/health

# Check pod logs
kubectl logs -f deployment/backend -n ai-task-processor

# View resource usage
kubectl top pods -n ai-task-processor
kubectl top nodes
```

### Database Debugging

```bash
# Connect to MongoDB
kubectl exec -it mongo-0 -n ai-task-processor -- mongosh
  > use ai-task-processor
  > db.tasks.find().limit(1)
  > db.users.find().limit(1)

# Connect to Redis
kubectl exec -it redis-0 -n ai-task-processor -- redis-cli
  > KEYS *
  > LLEN task_queue
```

### Worker Scaling Monitoring

```bash
# Watch HPA status
kubectl get hpa -n ai-task-processor -w

# Detailed HPA info
kubectl describe hpa worker-hpa -n ai-task-processor

# View metrics
kubectl top pods -l app=worker -n ai-task-processor
```

### Common Issues

**Pods not starting:**
```bash
kubectl describe pod <pod-name> -n ai-task-processor
kubectl logs <pod-name> -n ai-task-processor
```

**Database connection errors:**
```bash
# Verify MongoDB is running
kubectl get statefulset mongo -n ai-task-processor
kubectl exec -it mongo-0 -n ai-task-processor -- mongosh --eval "db.adminCommand('ping')"
```

**Ingress not working:**
```bash
# Check certificate
kubectl get certificate -n ai-task-processor
kubectl describe certificate ai-task-processor-cert -n ai-task-processor

# Check ingress
kubectl get ingress -n ai-task-processor
kubectl describe ingress ai-task-processor -n ai-task-processor
```

### Useful Commands

```bash
# Get all resources
kubectl get all -n ai-task-processor

# Restart deployment
kubectl rollout restart deployment/backend -n ai-task-processor

# Scale manually
kubectl scale deployment backend --replicas=5 -n ai-task-processor

# Port forward to service
kubectl port-forward svc/backend 5000:5000 -n ai-task-processor

# Execute command in pod
kubectl exec -it backend-xxx -- npm run lint -n ai-task-processor

# Get pod shell
kubectl exec -it backend-xxx -- /bin/sh -n ai-task-processor
```

---

## Cleanup

### Local Development
```bash
docker-compose down -v
```

### Kubernetes
```bash
# Delete namespace and all resources
kubectl delete namespace ai-task-processor

# Delete Argo CD
kubectl delete namespace argocd
```

---

## Next Steps

1. Configure monitoring (Prometheus, Grafana, ELK)
2. Setup backup strategies
3. Configure alerting
4. Implement logging aggregation
5. Setup RBAC policies
6. Configure network policies

For detailed architecture information, see `ARCHITECTURE.md`.

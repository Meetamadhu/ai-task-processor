# Dockerfile for worker
FROM python:3.11-slim as builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# Create non-root user
RUN groupadd -g 1001 python && \
    useradd -r -u 1001 -g python python

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=python:python /root/.local /home/python/.local
COPY --chown=python:python worker.py .
COPY --chown=python:python .env.example .env.example

# Set PATH to use local pip packages
ENV PATH=/home/python/.local/bin:$PATH

# Switch to non-root user
USER python

CMD ["python", "-u", "worker.py"]

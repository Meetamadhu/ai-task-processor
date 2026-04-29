#!/usr/bin/env python3
# worker.py
import json
import os
import redis
import logging
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
from dotenv import load_dotenv
import time

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def _trim_uri(value):
    if not value:
        return ""
    s = str(value).strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()
    return s


def _build_mongo_uri():
    uri = _trim_uri(os.getenv("MONGODB_URI"))
    if not uri:
        return "mongodb://localhost:27017/ai-task-processor"
    auth = _trim_uri(os.getenv("MONGODB_AUTH_SOURCE", ""))
    if auth and "authSource=" not in uri:
        sep = "&" if "?" in uri else "?"
        from urllib.parse import quote
        return f"{uri}{sep}authSource={quote(auth, safe='')}"
    return uri


# Environment variables — prefer full Redis URL (Render/Railway)
def _redis_url():
    for key in ('REDIS_URL', 'REDISCLOUD_URL', 'REDIS_TLS_URL'):
        v = os.getenv(key)
        if v and str(v).strip():
            return str(v).strip()
    return None


REDIS_URL = _redis_url()
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
MONGODB_URI = _build_mongo_uri()

class TaskProcessor:
    def __init__(self):
        """Initialize Redis and MongoDB connections"""
        if REDIS_URL:
            self.redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        else:
            self.redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True
            )
        
        self.mongo_client = MongoClient(MONGODB_URI)
        self.db = self.mongo_client['ai-task-processor']
        self.tasks_collection = self.db['tasks']
        
        logger.info("TaskProcessor initialized")
    
    def process_task(self, task_data):
        """Process a single task"""
        try:
            task_id = task_data.get('taskId')
            input_text = task_data.get('inputText')
            operation = task_data.get('operation')
            
            logger.info(f"Processing task {task_id}: {operation}")
            
            # Update task status to running
            self.tasks_collection.update_one(
                {'_id': ObjectId(task_id)},
                {
                    '$set': {
                        'status': 'running',
                        'startedAt': datetime.utcnow()
                    },
                    '$push': {
                        'logs': f'[{datetime.utcnow().isoformat()}] Task processing started'
                    }
                }
            )
            
            # Process based on operation
            result = self.execute_operation(operation, input_text)
            
            # Update task with result
            self.tasks_collection.update_one(
                {'_id': ObjectId(task_id)},
                {
                    '$set': {
                        'status': 'success',
                        'result': result,
                        'completedAt': datetime.utcnow()
                    },
                    '$push': {
                        'logs': f'[{datetime.utcnow().isoformat()}] Task completed successfully'
                    }
                }
            )
            
            logger.info(f"Task {task_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Error processing task {task_id}: {str(e)}")
            
            # Update task with error
            self.tasks_collection.update_one(
                {'_id': ObjectId(task_id)},
                {
                    '$set': {
                        'status': 'failed',
                        'error': str(e),
                        'completedAt': datetime.utcnow()
                    },
                    '$push': {
                        'logs': f'[{datetime.utcnow().isoformat()}] Task failed: {str(e)}'
                    }
                }
            )
    
    def execute_operation(self, operation, input_text):
        """Execute the specified operation on input text"""
        if operation == 'uppercase':
            return input_text.upper()
        elif operation == 'lowercase':
            return input_text.lower()
        elif operation == 'reverse':
            return input_text[::-1]
        elif operation == 'word_count':
            return str(len(input_text.split()))
        else:
            raise ValueError(f"Unknown operation: {operation}")
    
    def start(self):
        """Start consuming tasks from Redis queue"""
        logger.info("Worker started. Waiting for tasks...")
        
        while True:
            try:
                # Block and wait for task from queue
                result = self.redis_client.brpop('task_queue', timeout=5)
                
                if result:
                    _, task_json = result
                    task_data = json.loads(task_json)
                    self.process_task(task_data)
                    
            except redis.ConnectionError:
                logger.error("Redis connection error. Retrying in 5 seconds...")
                time.sleep(5)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected error: {str(e)}")
                time.sleep(1)

if __name__ == '__main__':
    processor = TaskProcessor()
    processor.start()

// src/routes/tasks.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Task = require('../models/Task');
const Joi = require('joi');

const router = express.Router();

// Validation schema
const createTaskSchema = Joi.object({
  title: Joi.string().required(),
  inputText: Joi.string().required(),
  operation: Joi.string().valid('uppercase', 'lowercase', 'reverse', 'word_count').required()
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { error, value } = createTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const task = new Task({
      userId: req.user.userId,
      title: value.title,
      inputText: value.inputText,
      operation: value.operation,
      status: 'pending',
      logs: ['Task created and queued for processing']
    });

    await task.save();

    // Push to Redis queue
    const redisClient = req.app.locals.redisClient;
    const jobData = {
      taskId: task._id.toString(),
      inputText: value.inputText,
      operation: value.operation
    };

    await redisClient.lPush('task_queue', JSON.stringify(jobData));

    res.status(201).json({
      task: {
        id: task._id,
        title: task.title,
        status: task.status,
        createdAt: task.createdAt
      }
    });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get all tasks for user
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    const filter = { userId: req.user.userId };
    if (status) {
      filter.status = status;
    }

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Task fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:taskId', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      userId: req.user.userId
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Task fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Get task logs
router.get('/:taskId/logs', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      userId: req.user.userId
    }).select('logs');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ logs: task.logs });
  } catch (error) {
    console.error('Logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Delete task
router.delete('/:taskId', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.taskId,
      userId: req.user.userId
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Task deletion error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;

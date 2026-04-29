// src/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    inputText: {
      type: String,
      required: true
    },
    operation: {
      type: String,
      enum: ['uppercase', 'lowercase', 'reverse', 'word_count'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'success', 'failed'],
      default: 'pending'
    },
    result: {
      type: String,
      default: null
    },
    logs: {
      type: [String],
      default: []
    },
    error: {
      type: String,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Create indexes for faster queries
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ status: 1 });
taskSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);

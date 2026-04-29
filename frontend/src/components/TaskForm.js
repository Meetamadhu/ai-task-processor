// src/components/TaskForm.js
import React, { useState } from 'react';
import { taskAPI } from '../services/api';
import '../styles/TaskForm.css';

function TaskForm({ onTaskCreated }) {
  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [operation, setOperation] = useState('uppercase');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await taskAPI.createTask(title, inputText, operation);
      setSuccess('Task created successfully!');
      setTitle('');
      setInputText('');
      setOperation('uppercase');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
      // Notify parent component
      onTaskCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-form">
      <h2>Create New Task</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Task Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
            placeholder="Enter task title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="input-text">Input Text:</label>
          <textarea
            id="input-text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            required
            disabled={loading}
            placeholder="Enter text to process"
            rows="6"
          />
        </div>

        <div className="form-group">
          <label htmlFor="operation">Operation:</label>
          <select
            id="operation"
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            disabled={loading}
          >
            <option value="uppercase">Convert to Uppercase</option>
            <option value="lowercase">Convert to Lowercase</option>
            <option value="reverse">Reverse String</option>
            <option value="word_count">Count Words</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
}

export default TaskForm;

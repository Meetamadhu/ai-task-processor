// src/components/TaskCard.js
import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import '../styles/TaskCard.css';

function TaskCard({ task, isExpanded, onLogPanelTaskId, onTaskDeleted }) {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  /** Keeps the logs panel open across parent re-renders / poll timing; syncs down when parent clears expansion. */
  const [logsPanelOpen, setLogsPanelOpen] = useState(false);

  useEffect(() => {
    if (isExpanded || logsLoading) return undefined;
    if (!logsPanelOpen) return undefined;
    const id = setTimeout(() => setLogsPanelOpen(false), 400);
    return () => clearTimeout(id);
  }, [isExpanded, logsLoading, logsPanelOpen]);

  const handleViewLogs = async () => {
    if (logsPanelOpen) {
      setLogsPanelOpen(false);
      onLogPanelTaskId(null);
      setLogsError('');
      return;
    }

    setLogsPanelOpen(true);
    onLogPanelTaskId(task._id);
    setLogsError('');
    try {
      setLogsLoading(true);
      const response = await taskAPI.getTaskLogs(task._id);
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogsError('Could not load logs. Try again.');
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await onTaskDeleted(task._id);
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ffa500';
      case 'running':
        return '#3498db';
      case 'success':
        return '#27ae60';
      case 'failed':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  return (
    <div className={`task-card ${getStatusClass(task.status)}`}>
      <div className="task-header">
        <div className="task-info">
          <h3>{task.title}</h3>
          <span className="task-operation">{task.operation}</span>
          <span className={`task-status ${getStatusClass(task.status)}`} style={{ borderColor: getStatusColor(task.status) }}>
            {task.status.toUpperCase()}
          </span>
        </div>
        <div className="task-date">
          {new Date(task.createdAt).toLocaleDateString()} {new Date(task.createdAt).toLocaleTimeString()}
        </div>
      </div>

      <div className="task-content">
        <p><strong>Input:</strong> {task.inputText.substring(0, 100)}{task.inputText.length > 100 ? '...' : ''}</p>
        {task.result && <p><strong>Result:</strong> {task.result.substring(0, 100)}{task.result.length > 100 ? '...' : ''}</p>}
        {task.error && <p className="error"><strong>Error:</strong> {task.error}</p>}
      </div>

      <div className="task-actions">
        <button
          onClick={handleViewLogs}
          className="logs-btn"
          disabled={logsLoading}
        >
          {logsPanelOpen ? 'Hide' : 'View'} Logs
        </button>
        <button 
          onClick={handleDelete}
          className="delete-btn"
        >
          Delete
        </button>
      </div>

      {logsPanelOpen && (
        <div className="task-logs">
          <h4>Task Logs</h4>
          {logsLoading ? (
            <p>Loading logs...</p>
          ) : logsError ? (
            <p className="error">{logsError}</p>
          ) : logs.length === 0 ? (
            <p>No logs available</p>
          ) : (
            <div className="logs-content">
              {logs.map((log, index) => (
                <p key={index} className="log-entry">{log}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskCard;

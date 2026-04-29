// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI } from '../services/api';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import '../styles/Dashboard.css';

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [user, setUser] = useState(null);
  const [expandedLogTaskId, setExpandedLogTaskId] = useState(null);
  const expandedLogTaskIdRef = useRef(null);
  const navigate = useNavigate();

  const setLogPanelTaskId = useCallback((taskId) => {
    expandedLogTaskIdRef.current = taskId;
    setExpandedLogTaskId(taskId);
  }, []);

  const fetchTasks = useCallback(async (options = {}) => {
    const silent = options.silent === true;
    try {
      if (!silent) setLoading(true);
      const response = await taskAPI.getTasks(statusFilter || undefined);
      const raw = response.data?.tasks;
      const incoming = Array.isArray(raw) ? raw : [];
      setTasks((prev) => {
        const prevSafe = Array.isArray(prev) ? prev : [];
        const exp = expandedLogTaskIdRef.current;
        if (!exp) return incoming;
        const expStr = String(exp);
        if (incoming.some((t) => String(t._id) === expStr)) return incoming;
        const ghost = prevSafe.find((t) => String(t._id) === expStr);
        if (!ghost) return incoming;
        return [ghost, ...incoming.filter((t) => String(t._id) !== expStr)];
      });
      setError('');
    } catch (err) {
      if (!silent) {
        setError('Failed to fetch tasks');
      }
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchTasks({ silent: false });

    const interval = setInterval(() => fetchTasks({ silent: true }), 3000);
    return () => clearInterval(interval);
  }, [statusFilter, fetchTasks]);

  const handleTaskCreated = async () => {
    await fetchTasks({ silent: true });
  };

  const handleTaskDeleted = async (taskId) => {
    try {
      await taskAPI.deleteTask(taskId);
      if (
        expandedLogTaskIdRef.current != null &&
        String(expandedLogTaskIdRef.current) === String(taskId)
      ) {
        setLogPanelTaskId(null);
      }
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>AI Task Processor</h1>
        <div className="user-info">
          <span>Welcome, {user?.name}!</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="left-panel">
          <TaskForm onTaskCreated={handleTaskCreated} />
        </div>

        <div className="right-panel">
          <div className="filter-section">
            <label htmlFor="status-filter">Filter by status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setLogPanelTaskId(null);
              }}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading && tasks.length === 0 && (
            <div className="loading">Loading tasks...</div>
          )}

          {!loading && tasks.length === 0 && (
            <div className="no-tasks">No tasks found. Create one to get started!</div>
          )}

          {tasks.length > 0 && (
            <TaskList
              tasks={tasks}
              onTaskDeleted={handleTaskDeleted}
              expandedTaskId={expandedLogTaskId}
              onLogPanelTaskId={setLogPanelTaskId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

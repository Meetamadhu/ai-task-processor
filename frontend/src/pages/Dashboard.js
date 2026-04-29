// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
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
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchTasks();
    
    // Poll for task updates every 3 seconds
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTasks(statusFilter || undefined);
      setTasks(response.data.tasks);
      setError('');
    } catch (err) {
      setError('Failed to fetch tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = async () => {
    await fetchTasks();
  };

  const handleTaskDeleted = async (taskId) => {
    try {
      await taskAPI.deleteTask(taskId);
      setTasks(tasks.filter(t => t._id !== taskId));
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
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}
          
          {loading && <div className="loading">Loading tasks...</div>}
          
          {!loading && tasks.length === 0 && (
            <div className="no-tasks">No tasks found. Create one to get started!</div>
          )}
          
          {!loading && tasks.length > 0 && (
            <TaskList tasks={tasks} onTaskDeleted={handleTaskDeleted} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

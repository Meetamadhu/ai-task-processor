// src/components/TaskList.js
import React, { useState } from 'react';
import TaskCard from './TaskCard';
import '../styles/TaskList.css';

function TaskList({ tasks, onTaskDeleted }) {
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const toggleExpand = (taskId) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  return (
    <div className="task-list">
      <h2>Your Tasks ({tasks.length})</h2>
      <div className="tasks-container">
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            isExpanded={expandedTaskId === task._id}
            onToggleExpand={() => toggleExpand(task._id)}
            onTaskDeleted={onTaskDeleted}
          />
        ))}
      </div>
    </div>
  );
}

export default TaskList;

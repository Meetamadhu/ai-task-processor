// src/components/TaskList.js
import React from 'react';
import TaskCard from './TaskCard';
import '../styles/TaskList.css';

function TaskList({ tasks, onTaskDeleted, expandedTaskId, onLogPanelTaskId }) {
  return (
    <div className="task-list">
      <h2>Your Tasks ({tasks.length})</h2>
      <div className="tasks-container">
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            isExpanded={String(expandedTaskId) === String(task._id)}
            onLogPanelTaskId={onLogPanelTaskId}
            onTaskDeleted={onTaskDeleted}
          />
        ))}
      </div>
    </div>
  );
}

export default TaskList;

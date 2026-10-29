import { useEffect, useState } from 'react';
import './App.css';

import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
} from './api/taskService';

function App() {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Tasks and UI state
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [error, setError] = useState('');

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load tasks when the page first opens
  useEffect(() => {
    loadTasks();
  }, []);

  // Fetch tasks from Spring Boot
  async function loadTasks() {
    try {
      setLoading(true);
      setError('');

      const response = await getAllTasks();

      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setError(
        'Unable to load tasks. Please check that the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  }

  // Create a task or update its title and description
  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setError('Please enter a task title.');
      return;
    }

    const existingTask = tasks.find(
      (task) => task.id === editingTaskId
    );

    const taskData = {
      title: trimmedTitle,
      description: trimmedDescription,
      completed: existingTask ? existingTask.completed === true : false,
    };

    try {
      setSaving(true);
      setError('');

      if (editingTaskId !== null) {
        await updateTask(editingTaskId, taskData);
      } else {
        await createTask(taskData);
      }

      setTitle('');
      setDescription('');
      setEditingTaskId(null);

      await loadTasks();
    } catch (error) {
      console.error('Failed to save task:', error);
      setError('Unable to save the task. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Load task details into the form
  function handleEdit(task) {
    setEditingTaskId(task.id);
    setTitle(task.title || '');
    setDescription(task.description || '');
    setError('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // Cancel editing
  function handleCancelEdit() {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setError('');
  }

  // Delete a task
  async function handleDelete(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this task?'
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      await deleteTask(id);

      if (editingTaskId === id) {
        handleCancelEdit();
      }

      await loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      setError('Unable to delete the task. Please try again.');
    }
  }

  // NEW: Toggle a task between Pending and Completed
  async function handleToggleStatus(task) {
    const newCompletedStatus = task.completed !== true;

    try {
      setUpdatingStatusId(task.id);
      setError('');

      // Send the updated status to Spring Boot.
      // Keep the title and description unchanged.
      await updateTask(task.id, {
        title: task.title,
        description: task.description || '',
        completed: newCompletedStatus,
      });

      // Fetch the latest saved tasks from the backend.
      await loadTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
      setError(
        'Unable to update task status. Check your backend update method.'
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  // Dashboard statistics
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.completed === true
  ).length;

  const pendingTasks = totalTasks - completedTasks;

  // Search and status filtering
  const filteredTasks = tasks.filter((task) => {
    const search = searchTerm.trim().toLowerCase();

    const taskTitle = String(task.title || '').toLowerCase();
    const taskDescription = String(task.description || '').toLowerCase();

    const matchesSearch =
      taskTitle.includes(search) ||
      taskDescription.includes(search);

    const isCompleted = task.completed === true;

    let matchesStatus = true;

    if (statusFilter === 'PENDING') {
      matchesStatus = !isCompleted;
    } else if (statusFilter === 'COMPLETED') {
      matchesStatus = isCompleted;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="app">
      <div className="dashboard">

        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="brand-icon">✓</div>

            <div>
              <p className="eyebrow">TASK MANAGEMENT SYSTEM</p>
              <h1>My Workspace</h1>
              <p className="header-subtitle">
                Organize your work. Track your progress. Get things done.
              </p>
            </div>
          </div>

          <div className="header-badge">
            <span className="online-dot"></span>
            Task Dashboard
          </div>
        </header>

        {/* Statistics */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Total Tasks</span>
              <span className="stat-icon total-icon">▤</span>
            </div>

            <p className="stat-number">{totalTasks}</p>
            <p className="stat-description">
              All tasks in your workspace
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Pending Tasks</span>
              <span className="stat-icon pending-icon">◷</span>
            </div>

            <p className="stat-number">{pendingTasks}</p>
            <p className="stat-description">
              Tasks waiting to be completed
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">Completed Tasks</span>
              <span className="stat-icon completed-icon">✓</span>
            </div>

            <p className="stat-number">{completedTasks}</p>
            <p className="stat-description">
              Tasks successfully completed
            </p>
          </div>
        </section>

        {/* Error message */}
        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon">!</span>
            <span>{error}</span>

            <button
              type="button"
              className="error-close"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Create and edit form */}
        <section className="panel form-panel">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">
                {editingTaskId !== null ? 'UPDATE TASK' : 'GET STARTED'}
              </p>

              <h2>
                {editingTaskId !== null ? 'Edit Task' : 'Create a Task'}
              </h2>

              <p className="section-description">
                {editingTaskId !== null
                  ? 'Update the details of your task below.'
                  : 'Add a new task to keep your work organized.'}
              </p>
            </div>

            <span className="section-number">
              {editingTaskId !== null ? '02' : '01'}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="task-title">Task Title</label>

              <input
                id="task-title"
                type="text"
                placeholder="e.g. Complete Spring Boot API"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={150}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-description">
                Description{' '}
                <span className="optional-label">Optional</span>
              </label>

              <textarea
                id="task-description"
                placeholder="Add some details about this task..."
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingTaskId !== null
                    ? '✓ Update Task'
                    : '+ Create Task'}
              </button>

              {editingTaskId !== null && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Tasks overview */}
        <section className="panel tasks-panel">
          <div className="tasks-heading">
            <div>
              <p className="section-eyebrow">YOUR WORK</p>
              <h2>Tasks Overview</h2>
              <p className="section-description">
                Review, search, and manage your tasks.
              </p>
            </div>

            <span className="task-count">
              {filteredTasks.length}{' '}
              {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          {/* Search and filters */}
          <div className="toolbar">
            <div className="search-box">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>

              <input
                type="search"
                placeholder="Search tasks..."
                aria-label="Search tasks"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

              {searchTerm && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="filter-buttons" aria-label="Filter tasks">
              <button
                type="button"
                className={
                  statusFilter === 'ALL' ? 'filter-active' : ''
                }
                aria-pressed={statusFilter === 'ALL'}
                onClick={() => setStatusFilter('ALL')}
              >
                All <span>{totalTasks}</span>
              </button>

              <button
                type="button"
                className={
                  statusFilter === 'PENDING' ? 'filter-active' : ''
                }
                aria-pressed={statusFilter === 'PENDING'}
                onClick={() => setStatusFilter('PENDING')}
              >
                Pending <span>{pendingTasks}</span>
              </button>

              <button
                type="button"
                className={
                  statusFilter === 'COMPLETED'
                    ? 'filter-active'
                    : ''
                }
                aria-pressed={statusFilter === 'COMPLETED'}
                onClick={() => setStatusFilter('COMPLETED')}
              >
                Completed <span>{completedTasks}</span>
              </button>
            </div>
          </div>

          {/* Loading and empty states */}
          {loading ? (
            <div className="state-message">
              <div className="spinner"></div>
              <p>Loading your tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {searchTerm || statusFilter !== 'ALL' ? '⌕' : '✓'}
              </div>

              <h3>
                {searchTerm || statusFilter !== 'ALL'
                  ? 'No matching tasks'
                  : 'No tasks yet'}
              </h3>

              <p>
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Try a different search term or select another filter.'
                  : 'Create your first task using the form above.'}
              </p>

              {(searchTerm || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear Search & Filters
                </button>
              )}
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => {
                const isCompleted = task.completed === true;
                const isUpdating = updatingStatusId === task.id;

                return (
                  <article className="task-card" key={task.id}>
                    <div
                      className={`task-status-marker ${
                        isCompleted
                          ? 'marker-completed'
                          : 'marker-pending'
                      }`}
                    ></div>

                    <div className="task-content">
                      <div className="task-title-row">
                        <h3
                          className={
                            isCompleted
                              ? 'task-title completed-title'
                              : 'task-title'
                          }
                        >
                          {task.title}
                        </h3>

                        <span
                          className={`status-badge ${
                            isCompleted
                              ? 'status-completed'
                              : 'status-pending'
                          }`}
                        >
                          <span className="status-dot"></span>
                          {isCompleted ? 'Completed' : 'Pending'}
                        </span>
                      </div>

                      <p className="task-description">
                        {task.description || 'No description provided.'}
                      </p>

                      <p className="task-id">Task ID: {task.id}</p>
                    </div>

                    <div className="task-actions">
                      {/* NEW: Change task status */}
                      <button
                        type="button"
                        className={`button ${
                          isCompleted
                            ? 'button-secondary'
                            : 'button-primary'
                        }`}
                        onClick={() => handleToggleStatus(task)}
                        disabled={isUpdating}
                      >
                        {isUpdating
                          ? 'Updating...'
                          : isCompleted
                            ? '↩ Mark Pending'
                            : '✓ Mark Complete'}
                      </button>

                      <button
                        type="button"
                        className="button button-edit"
                        onClick={() => handleEdit(task)}
                        aria-label={`Edit ${task.title}`}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="button button-delete"
                        onClick={() => handleDelete(task.id)}
                        aria-label={`Delete ${task.title}`}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>
            Task Management System <span>•</span> Built with React & Spring
            Boot
          </p>

          <p>Organize your day, one task at a time.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskStats,
  updateTask,
} from './api/taskService';
import './App.css';

const PAGE_SIZE = 8;

const EMPTY_FORM = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'MEDIUM',
  completed: false,
};

const PRIORITY_ORDER = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function formatDate(dateString) {
  if (!dateString) {
    return 'No due date';
  }

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.validationErrors?.title ||
    fallback
  );
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const firstResponse = await getAllTasks({
        page: 0,
        size: 100,
        sortBy: 'createdAt',
        direction: 'desc',
      });

      const firstPage = firstResponse.data;
      let allTasks = [...(firstPage.content || [])];

      // Load remaining pages when there are more than 100 tasks.
      const totalPages = firstPage.totalPages || 0;

      for (let page = 1; page < totalPages; page += 1) {
        const response = await getAllTasks({
          page,
          size: 100,
          sortBy: 'createdAt',
          direction: 'desc',
        });

        allTasks = allTasks.concat(response.data.content || []);
      }

      setTasks(allTasks);
    } catch (requestError) {
      console.error('Failed to fetch tasks:', requestError);
      setError(
        getErrorMessage(
          requestError,
          'Unable to load tasks. Please check that the backend and database are running.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await getTaskStats();
      setStats(response.data);
    } catch (requestError) {
      console.error('Failed to fetch task statistics:', requestError);

      // Keep the dashboard usable if the statistics request fails.
      setStats({
        total: tasks.length,
        completed: tasks.filter((task) => task.completed).length,
        pending: tasks.filter((task) => !task.completed).length,
      });
    }
  }, [tasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const filteredTasks = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const result = tasks.filter((task) => {
      const title = (task.title || '').toLowerCase();
      const description = (task.description || '').toLowerCase();

      const matchesSearch =
        !searchTerm ||
        title.includes(searchTerm) ||
        description.includes(searchTerm);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'COMPLETED' && task.completed) ||
        (statusFilter === 'PENDING' && !task.completed);

      const matchesPriority =
        priorityFilter === 'ALL' ||
        (task.priority || 'MEDIUM') === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

    result.sort((first, second) => {
      let comparison = 0;

      if (sortBy === 'title') {
        comparison = (first.title || '').localeCompare(second.title || '');
      } else if (sortBy === 'priority') {
        comparison =
          (PRIORITY_ORDER[first.priority || 'MEDIUM'] || 2) -
          (PRIORITY_ORDER[second.priority || 'MEDIUM'] || 2);
      } else if (sortBy === 'dueDate') {
        const firstDate = first.dueDate || '9999-12-31';
        const secondDate = second.dueDate || '9999-12-31';

        comparison = firstDate.localeCompare(secondDate);
      } else if (sortBy === 'completed') {
        comparison = Number(first.completed) - Number(second.completed);
      } else {
        const firstDate = first.createdAt || '';
        const secondDate = second.createdAt || '';

        comparison = firstDate.localeCompare(secondDate);
      }

      return comparison * directionMultiplier;
    });

    return result;
  }, [tasks, search, statusFilter, priorityFilter, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));

  const safePage = Math.min(currentPage, totalPages);

  const visibleTasks = filteredTasks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function updateFormField(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function openCreateForm() {
    setEditingTask(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setSuccess('');
    setIsFormOpen(true);
  }

  function openEditForm(task) {
    setEditingTask(task);

    setForm({
      title: task.title || '',
      description: task.description || '',
      dueDate: task.dueDate || '',
      priority: task.priority || 'MEDIUM',
      completed: Boolean(task.completed),
    });

    setError('');
    setSuccess('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setIsFormOpen(false);
    setEditingTask(null);
    setForm({ ...EMPTY_FORM });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedTitle = form.title.trim();

    if (!trimmedTitle) {
      setError('Please enter a task title.');
      return;
    }

    if (trimmedTitle.length > 120) {
      setError('The title cannot exceed 120 characters.');
      return;
    }

    if (form.description.length > 2000) {
      setError('The description cannot exceed 2000 characters.');
      return;
    }

    const taskData = {
      title: trimmedTitle,
      description: form.description.trim(),
      dueDate: form.dueDate || null,
      priority: form.priority,
      completed: Boolean(form.completed),
    };

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        setSuccess('Task updated successfully.');
      } else {
        await createTask(taskData);
        setSuccess('Task created successfully.');
      }

      setIsFormOpen(false);
      setEditingTask(null);
      setForm({ ...EMPTY_FORM });
      setCurrentPage(1);

      await loadTasks();
    } catch (requestError) {
      console.error('Failed to save task:', requestError);

      setError(
        getErrorMessage(
          requestError,
          'Unable to save the task. Please try again.'
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(task) {
    setError('');
    setSuccess('');

    const updatedTask = {
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate || null,
      priority: task.priority || 'MEDIUM',
      completed: !task.completed,
    };

    try {
      await updateTask(task.id, updatedTask);

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? { ...item, completed: !task.completed }
            : item
        )
      );

      setSuccess(
        task.completed
          ? 'Task marked as pending.'
          : 'Task marked as completed.'
      );

      await loadStats();
    } catch (requestError) {
      console.error('Failed to update task status:', requestError);

      setError(
        getErrorMessage(
          requestError,
          'Unable to update task status. Please try again.'
        )
      );
    }
  }

  async function handleDelete(task) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await deleteTask(task.id);

      setTasks((previous) =>
        previous.filter((item) => item.id !== task.id)
      );

      setSuccess('Task deleted successfully.');
      await loadStats();
    } catch (requestError) {
      console.error('Failed to delete task:', requestError);

      setError(
        getErrorMessage(
          requestError,
          'Unable to delete the task. Please try again.'
        )
      );
    }
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setCurrentPage(1);
  }

  function handleStatusFilterChange(event) {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  }

  function handlePriorityFilterChange(event) {
    setPriorityFilter(event.target.value);
    setCurrentPage(1);
  }

  function handleSortChange(event) {
    setSortBy(event.target.value);
    setCurrentPage(1);
  }

  function toggleSortDirection() {
    setSortDirection((previous) =>
      previous === 'asc' ? 'desc' : 'asc'
    );
    setCurrentPage(1);
  }

  function isOverdue(task) {
    if (!task.dueDate || task.completed) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(`${task.dueDate}T00:00:00`);

    return dueDate < today;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            ✓
          </div>

          <div>
            <h1>TaskFlow</h1>
            <p>Task Management Dashboard</p>
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateForm}
        >
          <span aria-hidden="true">＋</span> New Task
        </button>
      </header>

      <main className="main-content">
        <section className="welcome-section">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h2>Manage your day, one task at a time.</h2>
            <p className="welcome-description">
              Organize priorities, track deadlines, and keep your work moving.
            </p>
          </div>
        </section>

        {error && (
          <div className="alert alert-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="status">
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess('')}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <section className="stats-grid" aria-label="Task statistics">
          <article className="stat-card">
            <div className="stat-icon stat-icon-total">▤</div>
            <div>
              <p className="stat-label">Total tasks</p>
              <h3>{stats.total}</h3>
              <p className="stat-caption">Tasks in your workspace</p>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon stat-icon-pending">◷</div>
            <div>
              <p className="stat-label">Pending</p>
              <h3>{stats.pending}</h3>
              <p className="stat-caption">Still to be completed</p>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon stat-icon-completed">✓</div>
            <div>
              <p className="stat-label">Completed</p>
              <h3>{stats.completed}</h3>
              <p className="stat-caption">Tasks finished</p>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon stat-icon-progress">↗</div>
            <div>
              <p className="stat-label">Completion rate</p>
              <h3>
                {stats.total > 0
                  ? Math.round((stats.completed / stats.total) * 100)
                  : 0}
                %
              </h3>
              <p className="stat-caption">Of all tasks completed</p>
            </div>
          </article>
        </section>

        <section className="tasks-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">STAY ON TRACK</p>
              <h2>Your tasks</h2>
              <p className="section-description">
                View, organize, and update your tasks.
              </p>
            </div>

            <span className="task-count">
              {filteredTasks.length}{' '}
              {filteredTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search tasks..."
                value={search}
                onChange={handleSearchChange}
                aria-label="Search tasks"
              />
            </div>

            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              aria-label="Filter by status"
              className="toolbar-select"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={handlePriorityFilterChange}
              aria-label="Filter by priority"
              className="toolbar-select"
            >
              <option value="ALL">All priorities</option>
              <option value="HIGH">High priority</option>
              <option value="MEDIUM">Medium priority</option>
              <option value="LOW">Low priority</option>
            </select>

            <select
              value={sortBy}
              onChange={handleSortChange}
              aria-label="Sort tasks by"
              className="toolbar-select"
            >
              <option value="createdAt">Date created</option>
              <option value="title">Title</option>
              <option value="dueDate">Due date</option>
              <option value="priority">Priority</option>
              <option value="completed">Status</option>
            </select>

            <button
              type="button"
              className="sort-direction-button"
              onClick={toggleSortDirection}
              title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
              aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {loading ? (
            <div className="state-panel">
              <div className="loading-spinner" />
              <h3>Loading your tasks...</h3>
              <p>Connecting to your task workspace.</p>
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="state-panel empty-state">
              <div className="empty-icon" aria-hidden="true">
                ✓
              </div>

              <h3>
                {tasks.length === 0
                  ? 'No tasks yet'
                  : 'No matching tasks'}
              </h3>

              <p>
                {tasks.length === 0
                  ? 'Create your first task to get started.'
                  : 'Try changing your search or filters.'}
              </p>

              {tasks.length === 0 && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={openCreateForm}
                >
                  ＋ Create your first task
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="task-list">
                {visibleTasks.map((task) => {
                  const priority = task.priority || 'MEDIUM';
                  const overdue = isOverdue(task);

                  return (
                    <article
                      className={`task-card ${task.completed ? 'task-card-completed' : ''}`}
                      key={task.id}
                    >
                      <label className="task-checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={Boolean(task.completed)}
                          onChange={() => handleToggleStatus(task)}
                          aria-label={`Mark ${task.title} ${task.completed ? 'pending' : 'completed'}`}
                        />
                        <span className="custom-checkbox" />
                      </label>

                      <div className="task-main">
                        <div className="task-title-row">
                          <h3 className={task.completed ? 'completed-title' : ''}>
                            {task.title}
                          </h3>

                          {task.completed && (
                            <span className="status-badge status-completed">
                              Completed
                            </span>
                          )}

                          {!task.completed && (
                            <span className="status-badge status-pending">
                              Pending
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="task-description">
                            {task.description}
                          </p>
                        )}

                        <div className="task-meta">
                          <span
                            className={`priority-badge priority-${priority.toLowerCase()}`}
                          >
                            <span className="priority-dot" />
                            {priority.charAt(0) + priority.slice(1).toLowerCase()}
                          </span>

                          <span
                            className={`due-date ${overdue ? 'due-date-overdue' : ''}`}
                          >
                            <span aria-hidden="true">▦</span>
                            {overdue
                              ? `Overdue · ${formatDate(task.dueDate)}`
                              : formatDate(task.dueDate)}
                          </span>
                        </div>
                      </div>

                      <div className="task-actions">
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => openEditForm(task)}
                          aria-label={`Edit ${task.title}`}
                          title="Edit task"
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="icon-button delete-button"
                          onClick={() => handleDelete(task)}
                          aria-label={`Delete ${task.title}`}
                          title="Delete task"
                        >
                          ×
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="pagination">
                <p>
                  Showing{' '}
                  {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filteredTasks.length)} of{' '}
                  {filteredTasks.length} tasks
                </p>

                <div className="pagination-controls">
                  <button
                    type="button"
                    className="page-button"
                    disabled={safePage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    ← Previous
                  </button>

                  <span className="page-indicator">
                    Page {safePage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="page-button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <footer className="app-footer">
          <span>TaskFlow</span>
          <span>Stay organized. Keep making progress.</span>
        </footer>
      </main>

      {isFormOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <section
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-form-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">
                  {editingTask ? 'UPDATE YOUR WORK' : 'ADD TO YOUR WORKSPACE'}
                </p>

                <h2 id="task-form-title">
                  {editingTask ? 'Edit task' : 'Create a task'}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">
                  Task title <span className="required-mark">*</span>
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={updateFormField}
                  placeholder="e.g. Complete Spring Boot project"
                  maxLength={120}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={updateFormField}
                  placeholder="Add details about this task..."
                  rows={4}
                  maxLength={2000}
                />

                <span className="field-hint">
                  {form.description.length}/2000 characters
                </span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="priority">Priority</label>

                  <select
                    id="priority"
                    name="priority"
                    value={form.priority}
                    onChange={updateFormField}
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="dueDate">Due date</label>

                  <input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={updateFormField}
                  />
                </div>
              </div>

              {editingTask && (
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    name="completed"
                    checked={form.completed}
                    onChange={updateFormField}
                  />
                  <span>Mark this task as completed</span>
                </label>
              )}

              {error && (
                <div className="alert alert-error form-error" role="alert">
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingTask
                      ? 'Save changes'
                      : 'Create task'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
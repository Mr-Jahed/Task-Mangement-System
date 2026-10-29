import axios from 'axios';

const API_URL = '/api/tasks';

// Fetch one page of tasks.
// Defaults match the Spring Boot API.
export function getAllTasks(params = {}) {
  return axios.get(API_URL, {
    params: {
      page: 0,
      size: 10,
      sortBy: 'createdAt',
      direction: 'desc',
      ...params,
    },
  });
}

// Fetch dashboard statistics.
export function getTaskStats() {
  return axios.get(`${API_URL}/stats`);
}

// Fetch one task by ID.
export function getTaskById(id) {
  return axios.get(`${API_URL}/${id}`);
}

// Create a task.
export function createTask(task) {
  return axios.post(API_URL, task);
}

// Update a task.
export function updateTask(id, task) {
  return axios.put(`${API_URL}/${id}`, task);
}

// Delete a task.
export function deleteTask(id) {
  return axios.delete(`${API_URL}/${id}`);
}
# TaskFlow - Task Management Application

TaskFlow is a full-stack task management web application built with Spring Boot on the backend and React + Vite on the frontend. It allows users to create, update, delete, search, filter, sort, and track tasks efficiently in a clean and modern dashboard.

The project is designed as a practical full-stack application for managing daily work, deadlines, priorities, and progress with a user-friendly interface and robust API validation.

## Overview

TaskFlow provides a complete task management workflow:

- Create new tasks with title, description, priority, and due date
- Update existing tasks and toggle completion status
- Delete tasks with confirmation
- Search for tasks by title or description
- Filter by status and priority
- Sort tasks by date, title, due date, status, or priority
- View dashboard statistics such as total, pending, completed, and completion rate
- Handle validation and backend error responses professionally

## Tech Stack

### Backend
- Java 27
- Spring Boot 4.1.2
- Spring Web MVC
- Spring Data JPA
- MySQL Connector
- Jakarta Validation
- Maven

### Frontend
- React 19
- Vite
- JavaScript (ES modules)
- Axios
- CSS for responsive UI design

## Project Structure

```text
taskmanager/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/taskmanager/
│   │   │       ├── controller/
│   │   │       ├── entity/
│   │   │       ├── exception/
│   │   │       ├── repository/
│   │   │       ├── service/
│   │   │       └── TaskmanagerApplication.java
│   │   └── resources/
│   │       └── application.properties
│   └── test/
├── pom.xml
├── mvnw
├── mvnw.cmd
├── HELP.md
└── README.md
```

## Features

### Task Management
- Add a task with required title and optional description
- Set priority: High, Medium, Low
- Assign due dates
- Mark tasks as completed or pending
- Edit and delete tasks from the dashboard

### Dashboard and UI
- Dashboard cards showing total, pending, completed, and completion rate
- Search bar for quick task lookup
- Filter tasks by status and priority
- Sort ascending or descending by selected field
- Pagination for large task lists
- Responsive and modern interface for desktop and tablet users

### Backend Capabilities
- REST API built with Spring Boot controllers
- Pagination and sorting support
- Validation for task fields and request payloads
- Global exception handling for validation and not-found scenarios
- Statistics endpoint for dashboard data

## Database Configuration

The application uses MySQL and is configured in `src/main/resources/application.properties`.

Default configuration:

```properties
spring.application.name=taskmanager
spring.datasource.url=jdbc:mysql://localhost:3306/taskmanager_db
spring.datasource.username=root
spring.datasource.password=root

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

server.port=8081
```

### MySQL Setup

1. Install MySQL and start the MySQL server.
2. Create the database:

```sql
CREATE DATABASE taskmanager_db;
```

3. Update the username/password in `application.properties` if needed.
4. Ensure the database is running before launching the backend.

## Prerequisites

Before running the project, make sure you have the following installed:

- JDK 27 or compatible Java version
- Maven 3.9+
- Node.js 18+
- npm or yarn
- MySQL 8+

## Running the Project

### 1. Start the backend

From the project root:

On Windows:

```bash
mvnw.cmd clean spring-boot:run
```

On macOS/Linux:

```bash
./mvnw clean spring-boot:run
```

The backend runs on:

```text
http://localhost:8081
```

### 2. Start the frontend

Open a new terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend development server runs on:

```text
http://localhost:5173
```

The frontend is configured to proxy `/api` requests to the backend server.

## Production Build

### Frontend Production Build

```bash
cd frontend
npm run build
```

This generates a production-ready bundle inside the `frontend/dist` directory.

### Backend Packaging

From the root project directory:

```bash
./mvnw clean package
```

This creates a runnable JAR in the `target` directory.

## API Endpoints

Base URL:

```text
http://localhost:8081/api/tasks
```

### Get all tasks
```http
GET /api/tasks?page=0&size=10&sortBy=createdAt&direction=desc
```

### Get task statistics
```http
GET /api/tasks/stats
```

### Get task by ID
```http
GET /api/tasks/{id}
```

### Create task
```http
POST /api/tasks
```

Request body example:

```json
{
  "title": "Complete project documentation",
  "description": "Write a final project summary and setup guide.",
  "dueDate": "2026-11-05",
  "priority": "HIGH",
  "completed": false
}
```

### Update task
```http
PUT /api/tasks/{id}
```

### Delete task
```http
DELETE /api/tasks/{id}
```

## Data Model

The core entity is `Task` and contains:

- `id`
- `title`
- `description`
- `completed`
- `priority`
- `dueDate`
- `createdAt`
- `updatedAt`

Priority values:

- `HIGH`
- `MEDIUM`
- `LOW`

## Validation and Error Handling

The backend validates task data and returns clear API responses for invalid input.

Examples of handled scenarios:
- Missing or blank title
- Title exceeds 120 characters
- Description exceeds 2000 characters
- Invalid sort parameters
- Invalid task ID or missing task record
- Malformed JSON or invalid enum values

Validation and general errors are centralized in `GlobalExceptionHandler` for consistent API responses.

## Notes

- The application currently has no authentication or authorization layer.
- This project is intended as a learning and demonstration full-stack application.
- The frontend state is refreshed after create, update, delete, and toggle operations.
- The UI includes a modern dashboard-style design with task cards and modal forms.

## Dependencies Summary

### Backend dependencies
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-validation`
- `spring-boot-starter-webmvc`
- `mysql-connector-j`

### Frontend dependencies
- `react`
- `react-dom`
- `axios`
- `vite`

## License

This project is for educational and demonstration purposes.

## Conclusion

TaskFlow is a complete full-stack task management solution that showcases backend API design, database integration, validation, and a modern React front-end. It is a strong foundation for further enhancement, including authentication, drag-and-drop task organization, notifications, and multi-user support.

## Contributors / Project Context

This application was developed as a full-stack task tracking project combining:
- a Java Spring Boot backend
- a MySQL database
- and a React-based dashboard interface

It demonstrates how to build a working productivity app from backend API to frontend interaction.

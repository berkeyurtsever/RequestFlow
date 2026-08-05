# RequestFlow

RequestFlow is a role-based corporate request management system developed during my internship. It allows company employees to create requests, follow their progress, communicate through comments, upload attachments, and receive notifications.

The system provides separate permissions and interfaces for Admin, Supervisor, Staff, and User roles.

## Technologies

### Backend

- C#
- ASP.NET Core Web API
- Entity Framework Core
- SQLite
- JWT Authentication
- Swagger / OpenAPI

### Frontend

- React
- JavaScript
- Vite
- React Router
- Axios
- Recharts
- Lucide React
- CSS

## Main Features

- User registration and login
- JWT-based authentication
- Role-based authorization
- Request creation, editing and deletion
- Request assignment to staff members
- Status and priority management
- Advanced request filtering
- Search, sorting and pagination
- Comment system
- Attachment upload, download and deletion
- Permanent Activity Timeline
- Backend notification system
- Notification preference settings
- Category management
- Employee and role management
- Reports and dashboard charts
- CSV report export
- Light and dark themes
- Responsive desktop, tablet and mobile design
- Loading, empty and error states
- Confirmation dialogs and toast messages

## User Roles

### Admin

- Can view and manage all requests
- Can assign requests to Staff users
- Can delete requests
- Can manage employees and roles
- Can manage categories
- Can view reports
- Can change system settings

### Supervisor

- Can view all requests
- Can assign requests to Staff users
- Can update request status and priority
- Can access management operations allowed by the system

### Staff

- Can view only requests assigned to them
- Can update assigned requests
- Can add comments and attachments
- Can receive assignment and request update notifications

### User

- Can create new requests
- Can view only their own requests
- Can edit permitted request information
- Can add comments and attachments
- Can follow request progress

## Request Workflow

A request normally follows this process:

1. A user creates a new request.
2. Management reviews the request.
3. The request is assigned to a Staff user.
4. The Staff user processes the request.
5. The request status is updated.
6. Comments, attachments and activities are recorded.
7. The request is marked as resolved or rejected.

## Notification System

RequestFlow creates in-application notifications for:

- New request creation
- Staff assignment
- Assignment changes
- Assignment removal
- Request status changes
- Request priority changes
- Request detail updates
- New comments
- Attachment operations

Administrators can enable or disable the following notification categories from the Settings page:

- New request notifications
- Assignment notifications
- Status change notifications
- Comment notifications

## Project Structure

```text
RequestFlow/
├── backend/
│   └── RequestFlow.Api/
│       ├── Controllers/
│       ├── Data/
│       ├── DTOs/
│       ├── Migrations/
│       ├── Models/
│       ├── frontend/
│       │   └── requestflow-ui/
│       │       ├── src/
│       │       │   ├── components/
│       │       │   ├── context/
│       │       │   ├── layouts/
│       │       │   ├── pages/
│       │       │   └── services/
│       │       └── package.json
│       ├── Program.cs
│       ├── appsettings.json
│       └── RequestFlow.Api.csproj
└── README.md
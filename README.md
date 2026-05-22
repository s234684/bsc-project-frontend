# Bachelor Project Frontend

React and Vite frontend for the questionnaire demonstrator.

The frontend expects the Spring Boot backend to be running at `http://localhost:8080`. During development, Vite proxies `/api` requests to the backend.

## Requirements

- Node.js 18 or newer
- npm
- The backend demonstrator running locally or with Docker Desktop

## Start the Backend First

Use one of the backend setup options:

- Docker Desktop: from the backend repository, run `docker compose up --build`
- Local PostgreSQL: load `schema.sql` and `seed-demo-data.sql`, then run `mvn spring-boot:run`

The backend should be available at:

```text
http://localhost:8080
```

## Run the Frontend

From the frontend repository root:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Demo Login Emails

Enter one of these emails in the login field:

| Email | Role |
| --- | --- |
| `alice@example.com` | Participant, Tenant A |
| `bob@example.com` | Participant, Tenant B |
| `manager@example.com` | Manager |
| `instructor@example.com` | Instructor |

The demonstrator uses mock authentication. The selected email is sent to the backend as the `X-Debug-User` header.

## Expected Demo Flow

1. Log in as `alice@example.com` or `bob@example.com` to view participant questionnaires and gap profiles.
2. Log in as `instructor@example.com` to view questionnaires, submissions, and gap profiles.
3. Log in as `manager@example.com` to view manager-level gap profile information.

Alice and Bob each have one questionnaire already submitted and one practice questionnaire still open for submission.

## Build

```bash
npm run build
```

The production build is written to `dist`.

## Lint

```bash
npm run lint
```

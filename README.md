# Bachelor Project Frontend

This is the frontend application for the Bachelor Project, built with React, TypeScript, and Vite. It provides the user interface for interacting with the backend API.

## Purpose

The frontend serves as the client-side application that communicates with the Spring Boot backend to manage and display data. It is designed to be a modern, responsive web application using React for component-based development.

## Tech Stack

- **React 19**: For building the user interface
- **TypeScript**: For type safety
- **Vite**: For fast development and building
- **ESLint**: For code linting

## Installation

1. Ensure you have Node.js (version 18 or higher) installed.
2. Clone the repository and navigate to the frontend directory.
3. Install dependencies:

```bash
npm install
```

## Running the Development Server

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (default Vite port).

## Building for Production

To build the application for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Linting

To run the linter:

```bash
npm run lint
```

## Backend Communication

This frontend communicates with the backend API running on `http://localhost:8080` (Spring Boot default). The services in `src/services/` handle API calls to the backend endpoints.

Make sure the backend is running before using the frontend features that require data from the API.

## Project Structure

- `src/components/`: Reusable React components
- `src/pages/`: Page components for different routes
- `src/services/`: API service functions for backend communication
- `src/routes/`: Routing configuration
- `src/assets/`: Static assets like images
- `public/`: Public static files

## Contributing

1. Follow the existing code style and TypeScript types.
2. Run linting before committing.
3. Ensure components are properly typed and tested.
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# Nexus
> A self-hosted end-to-end encrypted messaging application

## Team Members

* [**Mark Grünzweil**](https://github.com/m-gruen)
* [**Henry Ladstätter**](https://github.com/HenryLad)
* [**Antonio Subašić**](https://github.com/antoniosubasic)
* [**David Vrhovac**](https://github.com/PlutoTinte06)

## Introduction

In recent years, governments have repeatedly called for backdoors in end-to-end encrypted messaging services to enable surveillance. With this project, we aim to demonstrate two key points:

1. Backdoors undermine security – Once a backdoor exists, it’s not only accessible to governments, but also to malicious actors. This fundamentally breaks the promise of secure communication.

2. Strong encryption is accessible to everyone – We want to show that even a group of students is capable of building a secure, end-to-end encrypted messaging service. This highlights that, if encryption is outlawed or weakened, those with criminal intent can still create their own tools — meaning only law-abiding users would be left unprotected.

Our goal is to raise awareness of the risks of mandated backdoors and emphasize the importance of preserving privacy and security for everyone.

## Features

* End-to-end encryption
* Self-hosted infrastructure
* User authentication and registration
* Real-time messaging
* Message persistence
* Cross-platform compatibility

## Architecture

The application is built using a client-server architecture:

* **Frontend**: The user interface that runs on the client device
* **Backend**: The server that handles message routing and storage
* **Database**: The storage system for user data and messages

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- PostgreSQL (if running without Docker)

## Installation

### Using Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/2425-3AHIF-WMC/self-hosted-e2e-messenger.git
   cd self-hosted-e2e-messenger
   ```

2. Copy `.env-template` to `.env` and update with your values:
   ```bash
   cp .env-template .env
   ```

3. Start the services:
   ```bash
   docker compose up -d --build
   ```

### Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/2425-3AHIF-WMC/self-hosted-e2e-messenger.git
   cd self-hosted-e2e-messenger
   ```

2. Copy `.env-template` to `.env` and update with your values:
   ```bash
   cp .env-template .env
   ```

3. Install dependencies and build the backend:
   ```bash
   cd backend
   npm install
   ```

4. Install dependencies and build the frontend:
   ```bash
   cd ../frontend
   npm install
   ```

5. Start the PostgreSQL database and create required tables (see `run` script).

6. Start the backend:
   ```bash
   cd ../backend
   npm run dev
   ```

7. In a separate terminal, start the frontend:
   ```bash
   cd ../frontend
   npm run dev
   ```

## Usage

1. Open your browser and navigate to `http://localhost:8080` (or whichever port you specified in the `.env` file)
2. Register a new account
3. Add contacts and start messaging

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| DB_USER | Database username |
| DB_PASSWORD | Database password |
| DB_NAME | Database name |
| DB_PORT | Database port (typically 5432 for PostgreSQL) |
| BACKEND_PORT | Port for the backend server |
| FRONTEND_PORT | Port for the frontend server |
| JWT_SECRET | Secret key for JWT token generation |

## Security Considerations

- The JWT secret should be a long, random string to ensure security. You could use this website to generate a secure key: [jwtsecret.com](https://jwtsecret.com/generate).

# URL Shortener API

A comprehensive URL shortener built with Node.js, Express, TypeScript, and Prisma (SQLite).

## Features

- **Shorten URL**: Convert a long URL into a 6-character short code.
- **Custom Aliases**: Users can provide their own custom short codes.
- **Expiration**: Set an expiration date for links (they return 410 Gone after expiry).
- **Password Protection**: Secure links with a password.
- **Bulk Shortening**: Enterprise users can shorten multiple URLs in one request.
- **Analytics**: Tracks click counts and last access time.
- **Soft Delete**: Links are marked as deleted rather than removed from the database.
- **User Tiers**: different capabilities for 'Hobby' vs 'Enterprise' users.

## Technologies Used

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (via Prisma ORM)
- **Testing**: Jest & Supertest

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Initialize the database:
   ```bash
   npx prisma migrate dev --name init
   ```

3. Seed the database with test users:
   ```bash
   npx ts-node prisma/seed.ts
   ```

### Running the Server

- **Development Mode** (auto-reload):
  ```bash
  npm run dev
  ```
- **Production Build**:
  ```bash
  npm run build
  npm start
  ```

The server runs on `http://localhost:3000`.

## Authentication

All API endpoints (except redirect) require an API Key passed in the header:
- **Header**: `x-api-key`

### Test Users (from seed)

| Name | API Key | Tier | Notes |
|------|---------|------|-------|
| ABC | `123` | Hobby | Standard user |
| DEF | `234` | Hobby | Standard user |
| GHI | `345` | Hobby | Standard user |
| Hobby | `hobby_key_123` | Hobby | Explicit hobby tier |
| Enterprise | `enterprise_key_456` | Enterprise | Access to Bulk Shorten |

## API Endpoints

### 1. Shorten URL
**POST** `/shorten`

Create a new short link.

- **Headers**: `x-api-key: <your_key>`
- **Body**:
  ```json
  {
    "longUrl": "https://example.com",
    "customCode": "my-link",       // Optional
    "expiresAt": "2025-12-31",     // Optional (ISO Date string)
    "password": "secret_pass"      // Optional
  }
  ```
- **Response**: `201 Created`
  ```json
  { "code": "my-link" }
  ```

### 2. Bulk Shorten (Enterprise Only)
**POST** `/shorten/bulk`

Shorten multiple URLs at once.

- **Headers**: `x-api-key: <enterprise_key>`
- **Body**:
  ```json
  {
    "urls": [
      { "longUrl": "https://google.com" },
      { "longUrl": "https://yahoo.com", "customCode": "yahoo-search" }
    ]
  }
  ```
- **Response**: `207 Multi-Status`
  ```json
  [
    { "longUrl": "https://google.com", "code": "Xy7z9A", "status": "success" },
    { "longUrl": "https://yahoo.com", "code": "yahoo-search", "status": "success" }
  ]
  ```

### 3. Redirect
**GET** `/redirect?code={code}`

Redirects to the original URL. No API Key required for public links.

- **Query Params**:
  - `code`: The short code.
  - `password`: (Optional) Required if the link is password protected.
- **Response**:
  - `302 Found`: Redirects to destination.
  - `404 Not Found`: Link does not exist or deleted.
  - `410 Gone`: Link has expired.
  - `401 Unauthorized`: Password incorrect or missing.

### 4. List My URLs
**GET** `/urls`

List all active URLs created by the authenticated user.

- **Headers**: `x-api-key: <your_key>`
- **Response**: `200 OK`
  ```json
  {
    "user": "abc@gmail.com",
    "total": 5,
    "data": [ ... ]
  }
  ```

### 5. Update URL
**PATCH** `/shorten/:code`

Update an existing short link. You must own the link.

- **Headers**: `x-api-key: <your_key>`
- **Body** (all optional):
  ```json
  {
    "longUrl": "https://new-url.com",
    "expiresAt": null,             // Set null to remove expiry
    "password": "new_password"
  }
  ```
- **Response**: `200 OK`

### 6. Delete URL (Soft Delete)
**DELETE** `/shorten/:code`

Mark a URL as deleted.

- **Headers**: `x-api-key: <your_key>`
- **Response**: `204 No Content`

## Testing

Run the automated test suite using Jest:

```bash
npm test -- src/user_server.test.ts
```

[Q5] Usually, we don’t write raw SQL queries in the backend app. Can you find out why?

- Raw sql is prone to sql injection attack if not written properly. while orm give parameterized query that avoids sql injection.
- ORM is very clean and easy to change or modify the database
- ORM automatically checks for types 

# URL Shortener API

A simple URL shortener built with Node.js, Express, TypeScript, and Prisma (SQLite).

## Features

- **Shorten URL**: Convert a long URL into a 6-character short code.
- **Duplicate Handling**: Returns the existing code if the same URL is submitted again.
- **Redirect**: Redirects from the short code to the original URL.
- **Delete**: Remove a short URL entry.

## Technologies Used

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (via Prisma ORM)
- **Testing**: Jest & Supertest

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Initialize the database:
   ```bash
   npx prisma migrate dev --name init
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

## API Endpoints

### 1. Shorten URL
**POST** `/shorten`

- **Body**: `{ "longUrl": "https://example.com" }`
- **Response**: `{ "code": "x7z9Aa" }`

### 2. Redirect
**GET** `/redirect?code={code}`

- Redirects to the original URL.
- Returns `404` if the code is invalid.

### 3. Delete Short URL
**DELETE** `/shorten/{code}`

- **Response**: `204 No Content`
- Returns `404` if the code is not found.

## Testing

Run the automated test suite using Jest:

```bash
npm test
```

# Deploy to Cloudflare Workers

This application is a TanStack Start project configured for Cloudflare Workers.
The existing server function keeps answer keys on the server; they are not sent
to students' browsers.

## First deployment

1. Create or sign in to a Cloudflare account.
2. In a terminal at the repository root, run:

   ```sh
   npm install
   npm run deploy
   ```

3. Approve the Cloudflare sign-in when prompted. The command prints the public
   `workers.dev` address when deployment finishes.

Cloudflare's Worker will host the user interface and the server-side grading
function together. Add the resulting public URL to Canvas as an External URL
module item. For Ketcher, choose **Load in a new tab**.

## Later deployments

After making changes, run:

```sh
npm run deploy
```

## Local verification

```sh
npm install
npm run dev
```

The instructor question bank and grading keys are currently held in the
server-side application code. A later D1 migration can move them into a
database and add an instructor-only management screen.

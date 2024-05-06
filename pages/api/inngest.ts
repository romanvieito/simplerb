import { Inngest } from "inngest";
import { serve } from "inngest/next";
import { sql } from '@vercel/postgres';

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app" });

const syncUser = inngest.createFunction(
  { id: "sync-user-from-clerk" }, // ←The 'id' is an arbitrary string used to identify the function in the dashboard
  { event: "clerk/user.created" }, // ← This is the function's triggering event

  
  async ({ event }) => { 
    const credits = 3;
    const client = await sql.connect();
    await client.sql`INSERT INTO users (name, email, created_date, credits) VALUES (${event.data.first_name}, ${event.data.email_addresses[0].email_address}, ${event.data.created_at}, ${credits});`;
    client.release();
  }
);

// Create an API that serves zero functions
export default serve({
  client: inngest,
  functions: [
    syncUser,
  ],
});


  
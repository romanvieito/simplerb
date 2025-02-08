import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { emails, subject, body } = req.body;

        if (!emails || !Array.isArray(emails) || !subject || !body) {
            return res.status(400).json({ error: "Please provide emails array, subject and body" });
        }

        // Insert emails one by one
        for (const email of emails) {
            await sql`
                INSERT INTO emails (to_email, subject, body) 
                VALUES (${email}, ${subject}, ${body})
            `;
        }

        return res.status(200).json({ 
            success: true, 
            message: `${emails.length} emails queued successfully`,
            count: emails.length
        });
    } catch (error) {
        console.error("Error queueing emails:", error);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message 
        });
    }
} 
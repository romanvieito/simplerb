import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await sql`
            INSERT INTO emails (to_email, subject, body)
            VALUES (${to}, ${subject}, ${body})
            RETURNING id
        `;

        return res.status(200).json({ 
            success: true, 
            message: "Email queued successfully",
            id: result.rows[0].id
        });
    } catch (error) {
        console.error("Error queueing email:", error);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message 
        });
    }
} 
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { subscribers } = req.body;  // Expects array of {email, name}

        if (!subscribers || !Array.isArray(subscribers)) {
            return res.status(400).json({ error: "Please provide an array of subscribers" });
        }

        // Insert subscribers, ignore duplicates
        for (const { email, name } of subscribers) {
            await sql`
                INSERT INTO email_list (email, name)
                VALUES (${email}, ${name})
                ON CONFLICT (email) DO UPDATE 
                SET name = ${name}
            `;
        }

        return res.status(200).json({ 
            success: true, 
            message: `Subscribers imported successfully`
        });
    } catch (error) {
        console.error("Error importing subscribers:", error);
        return res.status(500).json({ error: error.message });
    }
} 
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { subject, body, template } = req.body;

        if (!subject || !body) {
            return res.status(400).json({ error: "Please provide subject and body" });
        }

        // Get all active subscribers with their names
        const { rows: activeSubscribers } = await sql`
            SELECT email, name FROM email_list WHERE active = true
        `;

        // Queue personalized emails for each active subscriber
        for (const subscriber of activeSubscribers) {
            // Personalize subject
            const personalizedSubject = subject.replace(
                '{name}', 
                subscriber.name || 'there'
            );

            // Build personalized greeting
            let greeting = '';
            if (subscriber.name) {
                greeting = `Dear ${subscriber.name},`;
            } else {
                greeting = 'Hello,';
            }

            // Build personalized body with template
            const personalizedBody = `${greeting}

${body}

Best regards,
Your Team

---
`;

            await sql`
                INSERT INTO emails (to_email, subject, body)
                VALUES (${subscriber.email}, ${personalizedSubject}, ${personalizedBody})
            `;
        }

        return res.status(200).json({ 
            success: true, 
            message: `Queued ${activeSubscribers.length} emails`
        });
    } catch (error) {
        console.error("Error queueing daily emails:", error);
        return res.status(500).json({ error: error.message });
    }
} 
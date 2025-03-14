import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const emails = req.body;

        if (!Array.isArray(emails)) {
            return res.status(400).json({ error: 'Invalid input format. Expected array of emails.' });
        }

        const results = [];
        const errors = [];

        // First check for duplicates within the uploaded file itself
        const emailSet = new Set();
        for (const entry of emails) {
            if (emailSet.has(entry.email)) {
                errors.push({ email: entry.email, error: 'Duplicate email within upload file' });
                continue;
            }
            emailSet.add(entry.email);
        }

        for (const entry of emails) {
            try {
                // Validate email format
                if (!entry.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) {
                    errors.push({ email: entry.email, error: 'Invalid email format' });
                    continue;
                }

                // Skip if it's a duplicate within the upload file
                if (errors.some(e => e.email === entry.email)) {
                    continue;
                }

                // Check if email already exists in database
                const { rows: existing } = await sql`
                    SELECT email, name FROM email_list WHERE email = ${entry.email}
                `;

                if (existing.length > 0) {
                    errors.push({ 
                        email: entry.email, 
                        error: `Email already exists ${existing[0].name ? `with name: ${existing[0].name}` : 'without a name'}`
                    });
                    continue;
                }

                // Insert new email into the database
                const { rows } = await sql`
                    INSERT INTO email_list (
                        email,
                        name,
                        active,
                        send_count
                    ) VALUES (
                        ${entry.email},
                        ${entry.name || null},
                        true,
                        ${0}
                    )
                    RETURNING *
                `;

                results.push(rows[0]);
            } catch (error) {
                errors.push({ email: entry.email, error: error.message });
            }
        }

        return res.status(200).json({
            success: true,
            inserted: results.length,
            results,
            errors
        });
    } catch (error) {
        console.error('Error uploading emails:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 
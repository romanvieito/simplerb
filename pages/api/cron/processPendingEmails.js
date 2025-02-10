import { sql } from '@vercel/postgres';

// Remove the edge config - use regular serverless function instead
// export const config = {
//     runtime: 'edge',
//     regions: ['iad1']
// };

// Change to regular API route format
export default async function handler(req, res) {
    try {
        // Just call your existing sendEmail endpoint
        const response = await fetch(`${process.env.VERCEL_URL}/api/sendEmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error processing emails:', error);
        return res.status(500).json({ error: error.message });
    }
} 
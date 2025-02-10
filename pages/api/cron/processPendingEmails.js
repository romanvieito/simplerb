import { sql } from '@vercel/postgres';

// Remove the edge config - use regular serverless function instead
// export const config = {
//     runtime: 'edge',
//     regions: ['iad1']
// };

// Change to regular API route format
export default async function handler(req, res) {
    try {
        // Determine the base URL based on environment
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';  // Default to localhost for development

        // Call your existing sendEmail endpoint
        const response = await fetch(`${baseUrl}/api/sendEmail`, {
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
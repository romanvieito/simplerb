import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from '@vercel/postgres';
import { nanoid } from 'nanoid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { content, title, userId } = req.body;
      
      console.log('Received publish request:', { 
        hasContent: !!content, 
        title, 
        userId,
        contentLength: content?.length 
      });
      
      if (!content || !userId) {
        console.error('Missing required fields:', { content: !!content, userId });
        return res.status(400).json({ error: 'Content and userId are required' });
      }

      // Generate a unique ID for the page
      const uniqueId = nanoid(10);
      
      try {
        // Save the published page to the database
        const result = await sql`
          INSERT INTO published_pages (id, title, content, user_id, created_at)
          VALUES (${uniqueId}, ${title || 'Untitled'}, ${content}, ${userId}, NOW())
          RETURNING id;
        `;
        
        console.log('Published page saved:', result.rows[0].id);
        
        res.status(200).json({ 
          message: 'Page published successfully',
          pageId: uniqueId,
          url: `https://simplerb.com/p/${uniqueId}`
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Check if it's a table not found error
        if (dbError instanceof Error && dbError.message.includes('relation "published_pages" does not exist')) {
          return res.status(500).json({ 
            error: 'Database table not found. Please run the migration first.',
            details: dbError.message 
          });
        }
        throw dbError;
      }
    } catch (error) {
      console.error('Error publishing page:', error);
      res.status(500).json({ 
        error: 'Failed to publish page',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 
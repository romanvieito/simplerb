import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'pexels';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!PEXELS_API_KEY) {
  throw new Error('PEXELS_API_KEY is not defined in environment variables');
}

const client = createClient(PEXELS_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const result = await client.photos.search({
      query,
      per_page: 1,
      orientation: 'landscape',
    });

    if ('error' in result) {
      throw new Error(result.error);
    }

    if (!result.photos || result.photos.length === 0) {
      return res.status(404).json({ error: 'No images found' });
    }

    const photo = result.photos[0];
    return res.status(200).json({
      photos: [{
        src: {
          large: photo.src.large,
          medium: photo.src.medium,
          small: photo.src.small,
        },
        alt: photo.alt,
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
      }],
    });
  } catch (error) {
    console.error('Error fetching from Pexels:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch images from Pexels' 
    });
  }
} 
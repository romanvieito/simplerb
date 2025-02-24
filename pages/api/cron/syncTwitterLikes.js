import { sql } from '@vercel/postgres';

export const config = {
    runtime: 'edge',
    regions: ['iad1']
}

export default async function handler(req) {
    try {
        // First, create the table if it doesn't exist
        await sql`
            CREATE TABLE IF NOT EXISTS liked_tweets (
                tweet_id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                author_id TEXT NOT NULL,
                like_count INTEGER DEFAULT 0,
                retweet_count INTEGER DEFAULT 0,
                reply_count INTEGER DEFAULT 0,
                quote_count INTEGER DEFAULT 0,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Fetch liked tweets from Twitter API
        const response = await fetch('https://api.twitter.com/2/users/${process.env.TWITTER_USER_ID}/liked_tweets', {
            headers: {
                'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            next: { revalidate: 0 } // Disable cache
        });

        if (!response.ok) {
            throw new Error(`Twitter API error: ${response.status} ${await response.text()}`);
        }

        const { data: tweets } = await response.json();

        // Process each tweet
        let processedCount = 0;
        for (const tweet of tweets) {
            // Upsert the tweet
            await sql`
                INSERT INTO liked_tweets (
                    tweet_id,
                    text,
                    created_at,
                    author_id,
                    like_count,
                    retweet_count,
                    reply_count,
                    quote_count,
                    updated_at
                ) VALUES (
                    ${tweet.id},
                    ${tweet.text},
                    ${tweet.created_at},
                    ${tweet.author_id},
                    ${tweet.public_metrics?.like_count || 0},
                    ${tweet.public_metrics?.retweet_count || 0},
                    ${tweet.public_metrics?.reply_count || 0},
                    ${tweet.public_metrics?.quote_count || 0},
                    NOW()
                )
                ON CONFLICT (tweet_id) 
                DO UPDATE SET
                    like_count = EXCLUDED.like_count,
                    retweet_count = EXCLUDED.retweet_count,
                    reply_count = EXCLUDED.reply_count,
                    quote_count = EXCLUDED.quote_count,
                    updated_at = NOW()
            `;
            processedCount++;
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: processedCount
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        console.error('Error syncing liked tweets:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
} 
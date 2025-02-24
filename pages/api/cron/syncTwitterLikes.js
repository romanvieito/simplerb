import { sql } from '@vercel/postgres';

// Remove edge runtime config
// export const config = {
//     runtime: 'edge',
//     regions: ['iad1']
// }

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
    try {
        // First, get user ID by username
        const usernameUrl = 'https://api.twitter.com/2/users/by/username/romanvieito';
        
        const userResponse = await fetch(usernameUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        // If rate limited, wait and try again
        if (userResponse.status === 429) {
            await wait(5000); // Wait 5 seconds
            return res.status(200).json({
                success: false,
                message: 'Rate limited. Please try again in a few seconds.'
            });
        }

        const userData = await userResponse.json();
        console.log('User data:', userData);

        if (!userResponse.ok) {
            return res.status(userResponse.status).json({
                error: `Twitter API error getting user: ${userResponse.status}`,
                details: userData
            });
        }

        const userId = userData.data.id;

        // Wait a bit before making the second request
        await wait(1000);

        // Now get tweets with correct user ID
        const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets?max_results=5&tweet.fields=created_at,public_metrics`;
        
        const tweetsResponse = await fetch(tweetsUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        // If rate limited, wait and try again
        if (tweetsResponse.status === 429) {
            await wait(5000); // Wait 5 seconds
            return res.status(200).json({
                success: false,
                message: 'Rate limited on tweets request. Please try again in a few seconds.'
            });
        }

        const tweetsData = await tweetsResponse.json();

        if (!tweetsResponse.ok) {
            return res.status(tweetsResponse.status).json({
                error: `Twitter API error getting tweets: ${tweetsResponse.status}`,
                details: tweetsData
            });
        }

        // Create table if not exists
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

        const tweets = tweetsData.data || [];

        let processedCount = 0;
        for (const tweet of tweets) {
            await sql`
                INSERT INTO liked_tweets (
                    tweet_id, text, created_at, author_id,
                    like_count, retweet_count, reply_count, quote_count, updated_at
                ) VALUES (
                    ${tweet.id}, 
                    ${tweet.text}, 
                    ${tweet.created_at}, 
                    ${userId},
                    ${tweet.public_metrics?.like_count || 0},
                    ${tweet.public_metrics?.retweet_count || 0},
                    ${tweet.public_metrics?.reply_count || 0},
                    ${tweet.public_metrics?.quote_count || 0},
                    NOW()
                ) ON CONFLICT (tweet_id) DO NOTHING
            `;
            processedCount++;
        }

        return res.status(200).json({
            success: true,
            processed: processedCount,
            debug: {
                userId,
                tweets: tweetsData
            }
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
} 
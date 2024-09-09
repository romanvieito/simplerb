import { useState, useEffect } from 'react';
import { NextPage } from 'next';

const CampaignsPage: NextPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/google-ads-api?customerId=165-818-5146');
        if (!response.ok) throw new Error('Failed to fetch campaigns');
        const data = await response.json();
        setCampaigns(data.results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Campaigns</h1>
      <ul>
        {campaigns.map((campaign) => (
          <li key={campaign.campaign.id}>
            {campaign.campaign.name} - Clicks: {campaign.metrics.clicks}, 
            Impressions: {campaign.metrics.impressions}, 
            Cost: ${(parseInt(campaign.metrics.cost_micros) / 1000000).toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CampaignsPage;

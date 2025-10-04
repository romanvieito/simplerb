import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsCustomer, validateAdPilotAccess } from './client';

interface CreateCampaignRequest {
  type: 'SEARCH' | 'PMAX';
  keywords: string[];
  budgetDaily: number;
  locations: string[];
  languages: string[];
  url: string;
  copy: {
    headlines: string[];
    descriptions: string[];
    longHeadlines?: string[];
  };
  campaignNameSuffix?: string;
  brand?: string;
}

interface CreateCampaignResponse {
  success: boolean;
  campaignId?: string;
  campaignBudgetId?: string;
  adGroupIds?: string[];
  adIds?: string[];
  assetGroupIds?: string[];
  summary?: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<CreateCampaignResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Validate admin access
    const userEmail = req.headers['x-user-email'] as string;
    if (!validateAdPilotAccess(userEmail)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const {
      type,
      keywords,
      budgetDaily,
      locations,
      languages,
      url,
      copy,
      campaignNameSuffix = '',
      brand = 'AdPilot'
    }: CreateCampaignRequest = req.body;

    // Validate required fields
    if (!type || !keywords?.length || !budgetDaily || !url || !copy?.headlines?.length || !copy?.descriptions?.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: type, keywords, budgetDaily, url, copy' 
      });
    }

    const customer = getGoogleAdsCustomer();

    const adpilotLabel = process.env.ADPILOT_LABEL || 'AdPilot';
    const validateOnly = process.env.ADPILOT_VALIDATE_ONLY === 'true';

    // Generate campaign name
    const domain = new URL(url).hostname.replace('www.', '');
    const dateStr = new Date().toISOString().split('T')[0];
    const campaignName = `${domain} – ${type} – ${dateStr}${campaignNameSuffix ? ' – ' + campaignNameSuffix : ''}`;

    const operations: any[] = [];

    // 1. Create Campaign Budget
    const budgetResourceName = `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaignBudgets/${Date.now()}`;
    const budgetOperation = {
      create: {
        name: `${campaignName} Budget`,
        delivery_method: 'STANDARD',
        amount_micros: budgetDaily * 1000000, // Convert to micros
        explicitly_shared: false,
      }
    };
    operations.push(budgetOperation);

    // 2. Create Campaign
    const campaignResourceName = `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaigns/${Date.now() + 1}`;
    const campaignOperation: any = {
      create: {
        name: campaignName,
        advertising_channel_type: type === 'SEARCH' ? 'SEARCH' : 'PERFORMANCE_MAX',
        status: 'PAUSED', // Start paused for review
        campaign_budget: budgetResourceName,
        manual_cpc: type === 'SEARCH' ? {
          enhanced_cpc_enabled: true
        } : undefined,
        performance_max_setting: type === 'PMAX' ? {
          final_url_expansion_opt_out: false
        } : undefined,
        labels: [adpilotLabel],
      }
    };

    // Add location targeting
    if (locations.length > 0) {
      campaignOperation.create.geo_target_type_setting = {
        positive_geo_target_type: 'PRESENCE_OR_INTEREST',
        negative_geo_target_type: 'PRESENCE'
      };
    }

    operations.push(campaignOperation);

    if (type === 'SEARCH') {
      // 3. Create Ad Group for Search
      const adGroupResourceName = `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/adGroups/${Date.now() + 2}`;
      operations.push({
        create: {
          name: `${campaignName} Ad Group`,
          campaign: campaignResourceName,
          cpc_bid_micros: 1000000, // $1.00 default bid
          status: 'ENABLED',
        }
      });

      // 4. Create Responsive Search Ad
      const adResourceName = `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/ads/${Date.now() + 3}`;
      operations.push({
        create: {
          type: 'RESPONSIVE_SEARCH_AD',
          ad_group: adGroupResourceName,
          responsive_search_ad: {
            headlines: copy.headlines.slice(0, 15).map(headline => ({
              text: headline,
              pinned_field: 'HEADLINE_1'
            })),
            descriptions: copy.descriptions.slice(0, 4).map(desc => ({
              text: desc
            })),
            path1: 'shop',
            path2: 'now',
          },
          final_urls: [url],
          status: 'ENABLED',
        }
      });

      // 5. Create Keywords
      keywords.forEach((keyword, index) => {
        operations.push({
          create: {
            ad_group: adGroupResourceName,
            keyword: {
              text: keyword,
              match_type: index < keywords.length / 2 ? 'EXACT' : 'PHRASE'
            },
            cpc_bid_micros: 1000000, // $1.00 default bid
            status: 'ENABLED',
          }
        });
      });

    } else {
      // Performance Max Campaign
      // 3. Create Asset Group
      const assetGroupResourceName = `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/assetGroups/${Date.now() + 2}`;
      operations.push({
        create: {
          name: `${campaignName} Asset Group`,
          campaign: campaignResourceName,
          final_urls: [url],
          status: 'ENABLED',
        }
      });

      // 4. Create Text Assets (Headlines)
      copy.headlines.slice(0, 5).forEach((headline, index) => {
        operations.push({
          create: {
            asset: {
              type: 'TEXT',
              text_asset: {
                text: headline
              }
            },
            asset_group: assetGroupResourceName,
            status: 'ENABLED',
          }
        });
      });

      // 5. Create Long Headlines (if available)
      if (copy.longHeadlines?.length) {
        copy.longHeadlines.slice(0, 5).forEach(longHeadline => {
          operations.push({
            create: {
              asset: {
                type: 'TEXT',
                text_asset: {
                  text: longHeadline
                }
              },
              asset_group: assetGroupResourceName,
              status: 'ENABLED',
            }
          });
        });
      }

      // 6. Create Description Assets
      copy.descriptions.slice(0, 5).forEach(description => {
        operations.push({
          create: {
            asset: {
              type: 'TEXT',
              text_asset: {
                text: description
              }
            },
            asset_group: assetGroupResourceName,
            status: 'ENABLED',
          }
        });
      });
    }

    // Execute operations
    if (validateOnly) {
      // Dry run - just validate the operations
      console.log('DRY RUN: Would create', operations.length, 'entities');
      return res.status(200).json({
        success: true,
        summary: `DRY RUN: Would create ${operations.length} entities for campaign "${campaignName}"`
      });
    }

    // Actually create the campaign
    console.log('Creating campaign with', operations.length, 'operations');
    console.log('Operations:', JSON.stringify(operations, null, 2));
    
    const response = await customer.mutateResources(operations);
    console.log('Campaign creation response:', response);

    const summary = `
Campaign created successfully:
- Campaign: ${campaignName}
- Budget: $${budgetDaily}/day
- Type: ${type}
- Keywords: ${keywords.length}
- Copy: ${copy.headlines.length} headlines, ${copy.descriptions.length} descriptions
- Status: PAUSED (ready for review)
`;

    res.status(200).json({
      success: true,
      summary,
      campaignId: campaignResourceName.split('/').pop(),
      campaignBudgetId: budgetResourceName.split('/').pop(),
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    
    // Get more detailed error information
    let errorMessage = 'Unknown error';
    let errorCode = null;
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
    } else if (typeof error === 'object' && error !== null) {
      // Handle Google Ads API errors
      if ('code' in error) {
        errorCode = error.code;
      }
      if ('message' in error) {
        errorMessage = error.message;
      }
      if ('details' in error) {
        errorDetails = error.details;
      }
      // Convert to string if it's an object
      if (errorMessage === 'Unknown error') {
        errorMessage = JSON.stringify(error, null, 2);
      }
    }
    
    // Provide more detailed error information
    const response = {
      success: false,
      error: `Failed to create campaign: ${errorMessage}`,
      errorCode: errorCode,
      errorDetails: errorDetails,
      validateOnly: process.env.ADPILOT_VALIDATE_ONLY === 'true',
      customerId: process.env.GADS_LOGIN_CUSTOMER_ID
    };
    
    res.status(500).json(response);
  }
}

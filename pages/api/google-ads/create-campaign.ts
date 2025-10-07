import { NextApiRequest, NextApiResponse } from 'next';
import { 
  getGoogleAdsCustomer, 
  validateAdPilotAccess, 
  generateResourceName, 
  extractResourceId, 
  handleGoogleAdsError,
  formatCustomerId 
} from './client';

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
  // Enhanced targeting options
  demographics?: {
    ageRanges?: string[];
    genders?: string[];
    parentalStatuses?: string[];
    incomeRanges?: string[];
  };
  audiences?: {
    interests?: string[];
    remarketing?: string[];
    customAudiences?: string[];
  };
  bidding?: {
    strategy?: 'TARGET_CPA' | 'TARGET_ROAS' | 'MAXIMIZE_CONVERSIONS' | 'MAXIMIZE_CONVERSION_VALUE' | 'MANUAL_CPC';
    targetCpa?: number;
    targetRoas?: number;
    maxCpc?: number;
  };
  adSchedule?: {
    enabled: boolean;
    schedule: Array<{
      dayOfWeek: string;
      startHour: number;
      endHour: number;
      bidModifier?: number;
    }>;
  };
  deviceTargeting?: {
    mobile?: number; // bid modifier
    tablet?: number;
    desktop?: number;
  };
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
      brand = 'AdPilot',
      demographics,
      audiences,
      bidding,
      adSchedule,
      deviceTargeting
    }: CreateCampaignRequest = req.body;

    // Validate required fields
    if (!type || !keywords?.length || !budgetDaily || !url || !copy?.headlines?.length || !copy?.descriptions?.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: type, keywords, budgetDaily, url, copy' 
      });
    }

    const customer = getGoogleAdsCustomer();
    const customerId = formatCustomerId(process.env.GADS_LOGIN_CUSTOMER_ID!);

    const adpilotLabel = process.env.ADPILOT_LABEL || 'AdPilot';
    const validateOnly = process.env.ADPILOT_VALIDATE_ONLY === 'true';

    // Generate campaign name
    const domain = new URL(url).hostname.replace('www.', '');
    const dateStr = new Date().toISOString().split('T')[0];
    const campaignName = `${domain} – ${type} – ${dateStr}${campaignNameSuffix ? ' – ' + campaignNameSuffix : ''}`;

    const operations: any[] = [];

    // 1. Create Campaign Budget with enhanced configuration
    const budgetResourceName = generateResourceName('campaignBudgets', customerId);
    const budgetOperation = {
      create: {
        name: `${campaignName} Budget`,
        delivery_method: 'STANDARD',
        amount_micros: budgetDaily * 1000000, // Convert to micros
        explicitly_shared: false,
        // Add budget type for better control
        type: 'STANDARD',
        // Add period for daily budget
        period: 'DAILY'
      }
    };
    operations.push(budgetOperation);

    // 2. Create Campaign with enhanced configuration
    const campaignResourceName = generateResourceName('campaigns', customerId);
    const campaignOperation: any = {
      create: {
        name: campaignName,
        advertising_channel_type: type === 'SEARCH' ? 'SEARCH' : 'PERFORMANCE_MAX',
        status: 'PAUSED', // Start paused for review
        campaign_budget: budgetResourceName,
        // Enhanced bidding configuration
        ...(type === 'SEARCH' ? {
          manual_cpc: {
            enhanced_cpc_enabled: true,
            ...(bidding?.maxCpc && { cpc_bid_ceiling_micros: bidding.maxCpc * 1000000 })
          }
        } : {}),
        performance_max_setting: type === 'PMAX' ? {
          final_url_expansion_opt_out: false,
          ...(bidding?.strategy && { bidding_strategy: bidding.strategy })
        } : undefined,
        labels: [adpilotLabel],
        // Add network settings
        network_settings: {
          target_google_search: true,
          target_search_network: true,
          target_content_network: type === 'PMAX',
          target_partner_search_network: false
        },
        // Add start and end dates
        start_date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, ''),
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

    // 3. Add Location Targeting
    if (locations.length > 0) {
      locations.forEach(locationId => {
        operations.push({
          create: {
            campaign: campaignResourceName,
            criterion: {
              type: 'LOCATION',
              location: {
                geo_target_constant: `geoTargetConstants/${locationId}`
              }
            },
            status: 'ENABLED'
          }
        });
      });
    }

    // 4. Add Language Targeting
    if (languages.length > 0) {
      languages.forEach(languageId => {
        operations.push({
          create: {
            campaign: campaignResourceName,
            criterion: {
              type: 'LANGUAGE',
              language: {
                language_constant: `languageConstants/${languageId}`
              }
            },
            status: 'ENABLED'
          }
        });
      });
    }

    if (type === 'SEARCH') {
      // 5. Create Ad Group for Search
      const adGroupResourceName = generateResourceName('adGroups', customerId);
      operations.push({
        create: {
          name: `${campaignName} Ad Group`,
          campaign: campaignResourceName,
          cpc_bid_micros: (bidding?.maxCpc || 1) * 1000000, // Use provided bid or default $1.00
          status: 'ENABLED',
          // Add ad group type for better organization
          type: 'SEARCH_STANDARD',
        }
      });

      // 6. Create Responsive Search Ad
      const adResourceName = generateResourceName('ads', customerId);
      operations.push({
        create: {
          type: 'RESPONSIVE_SEARCH_AD',
          ad_group: adGroupResourceName,
          responsive_search_ad: {
            headlines: copy.headlines.slice(0, 15).map((headline, index) => ({
              text: headline,
              pinned_field: index === 0 ? 'HEADLINE_1' : undefined
            })),
            descriptions: copy.descriptions.slice(0, 4).map(desc => ({
              text: desc
            })),
            path1: 'shop',
            path2: 'now',
            // Add more ad customization
            business_name: brand,
            call_to_action_text: 'LEARN_MORE',
          },
          final_urls: [url],
          status: 'ENABLED',
        }
      });

      // 7. Create Keywords with enhanced match types
      keywords.forEach((keyword, index) => {
        const matchType = index < keywords.length * 0.3 ? 'EXACT' : 
                         index < keywords.length * 0.6 ? 'PHRASE' : 'BROAD';
        
        operations.push({
          create: {
            ad_group: adGroupResourceName,
            keyword: {
              text: keyword,
              match_type: matchType
            },
            cpc_bid_micros: (bidding?.maxCpc || 1) * 1000000,
            status: 'ENABLED',
            // Add keyword quality score tracking
            quality_info: {
              quality_score: 0 // Will be updated by Google
            }
          }
        });
      });

    } else {
      // Performance Max Campaign
      // 5. Create Asset Group
      const assetGroupResourceName = generateResourceName('assetGroups', customerId);
      operations.push({
        create: {
          name: `${campaignName} Asset Group`,
          campaign: campaignResourceName,
          final_urls: [url],
          status: 'ENABLED',
          // Add asset group type
          type: 'PERFORMANCE_MAX',
        }
      });

      // 6. Create Text Assets (Headlines)
      copy.headlines.slice(0, 5).forEach((headline, index) => {
        const assetResourceName = generateResourceName('assets', customerId);
        operations.push({
          create: {
            asset: {
              type: 'TEXT',
              text_asset: {
                text: headline
              },
              resource_name: assetResourceName,
            },
            asset_group: assetGroupResourceName,
            status: 'ENABLED',
          }
        });
      });

      // 7. Create Long Headlines (if available)
      if (copy.longHeadlines?.length) {
        copy.longHeadlines.slice(0, 5).forEach(longHeadline => {
          const assetResourceName = generateResourceName('assets', customerId);
          operations.push({
            create: {
              asset: {
                type: 'TEXT',
                text_asset: {
                  text: longHeadline
                },
                resource_name: assetResourceName,
              },
              asset_group: assetGroupResourceName,
              status: 'ENABLED',
            }
          });
        });
      }

      // 8. Create Description Assets
      copy.descriptions.slice(0, 5).forEach(description => {
        const assetResourceName = generateResourceName('assets', customerId);
        operations.push({
          create: {
            asset: {
              type: 'TEXT',
              text_asset: {
                text: description
              },
              resource_name: assetResourceName,
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
    
    const errorInfo = handleGoogleAdsError(error);
    
    // Provide more detailed error information
    const response = {
      success: false,
      error: `Failed to create campaign: ${errorInfo.message}`,
      errorCode: errorInfo.code,
      errorDetails: errorInfo.details,
      validateOnly: process.env.ADPILOT_VALIDATE_ONLY === 'true',
      customerId: process.env.GADS_LOGIN_CUSTOMER_ID,
      troubleshooting: [
        'Check that all required fields are provided',
        'Verify your Google Ads account has sufficient permissions',
        'Ensure your budget and bid amounts are within valid ranges',
        'Check that your keywords and copy meet Google Ads policies',
        'Verify your targeting settings are valid'
      ]
    };
    
    res.status(500).json(response);
  }
}

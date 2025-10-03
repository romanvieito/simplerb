import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsClient, validateAdPilotAccess } from './client';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

interface BulkCsvRequest {
  dryRun?: boolean;
}

interface BulkCsvResponse {
  success: boolean;
  results?: Array<{
    row: number;
    action: string;
    status: 'success' | 'error';
    message: string;
  }>;
  error?: string;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BulkCsvResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Validate admin access
    const userEmail = req.headers['x-user-email'] as string;
    if (!validateAdPilotAccess(userEmail)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { dryRun = false } = req.query as BulkCsvRequest;

    // Parse multipart form data
    const formData = await new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        
        if (!boundary) {
          reject(new Error('No boundary found in multipart data'));
          return;
        }

        // Simple multipart parser for CSV file
        const parts = buffer.toString().split(`--${boundary}`);
        let csvData = '';
        
        for (const part of parts) {
          if (part.includes('Content-Disposition: form-data') && part.includes('filename=')) {
            const lines = part.split('\n');
            const dataStartIndex = lines.findIndex(line => line.trim() === '');
            if (dataStartIndex !== -1) {
              csvData = lines.slice(dataStartIndex + 1).join('\n').trim();
              break;
            }
          }
        }

        if (!csvData) {
          reject(new Error('No CSV data found'));
          return;
        }

        resolve(csvData);
      });
      req.on('error', reject);
    });

    // Parse CSV data
    const rows: any[] = [];
    const stream = Readable.from([formData as string]);
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No data rows found in CSV' 
      });
    }

    const client = getGoogleAdsClient();
    const customer = client.customer({ 
      customer_id: process.env.GADS_LOGIN_CUSTOMER_ID 
    });

    const results: any[] = [];
    const operations: any[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row: any = rows[i];
      const rowNumber = i + 2; // +2 because CSV is 1-indexed and we skip header

      try {
        // Validate required fields
        if (!row.campaignId || !row.action) {
          results.push({
            row: rowNumber,
            action: 'validation',
            status: 'error',
            message: 'Missing required fields: campaignId, action'
          });
          continue;
        }

        const campaignId = row.campaignId;
        const action = row.action.toUpperCase();

        switch (action) {
          case 'PAUSE_CAMPAIGN':
            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaigns/${campaignId}`,
                status: 'PAUSED'
              }
            });
            results.push({
              row: rowNumber,
              action: 'PAUSE_CAMPAIGN',
              status: 'success',
              message: `Campaign ${campaignId} will be paused`
            });
            break;

          case 'ENABLE_CAMPAIGN':
            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaigns/${campaignId}`,
                status: 'ENABLED'
              }
            });
            results.push({
              row: rowNumber,
              action: 'ENABLE_CAMPAIGN',
              status: 'success',
              message: `Campaign ${campaignId} will be enabled`
            });
            break;

          case 'UPDATE_BUDGET':
            if (!row.budgetAmount) {
              results.push({
                row: rowNumber,
                action: 'UPDATE_BUDGET',
                status: 'error',
                message: 'budgetAmount is required for UPDATE_BUDGET action'
              });
              continue;
            }
            
            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaignBudgets/${campaignId}`,
                amount_micros: parseFloat(row.budgetAmount) * 1000000
              }
            });
            results.push({
              row: rowNumber,
              action: 'UPDATE_BUDGET',
              status: 'success',
              message: `Campaign ${campaignId} budget will be updated to $${row.budgetAmount}`
            });
            break;

          case 'UPDATE_BID':
            if (!row.adGroupId || !row.criterionId || !row.bidAmount) {
              results.push({
                row: rowNumber,
                action: 'UPDATE_BID',
                status: 'error',
                message: 'adGroupId, criterionId, and bidAmount are required for UPDATE_BID action'
              });
              continue;
            }

            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/adGroupCriteria/${row.criterionId}`,
                cpc_bid_micros: parseFloat(row.bidAmount) * 1000000
              }
            });
            results.push({
              row: rowNumber,
              action: 'UPDATE_BID',
              status: 'success',
              message: `Bid for criterion ${row.criterionId} will be updated to $${row.bidAmount}`
            });
            break;

          case 'PAUSE_KEYWORD':
            if (!row.criterionId) {
              results.push({
                row: rowNumber,
                action: 'PAUSE_KEYWORD',
                status: 'error',
                message: 'criterionId is required for PAUSE_KEYWORD action'
              });
              continue;
            }

            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/adGroupCriteria/${row.criterionId}`,
                status: 'PAUSED'
              }
            });
            results.push({
              row: rowNumber,
              action: 'PAUSE_KEYWORD',
              status: 'success',
              message: `Keyword ${row.criterionId} will be paused`
            });
            break;

          case 'ENABLE_KEYWORD':
            if (!row.criterionId) {
              results.push({
                row: rowNumber,
                action: 'ENABLE_KEYWORD',
                status: 'error',
                message: 'criterionId is required for ENABLE_KEYWORD action'
              });
              continue;
            }

            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/adGroupCriteria/${row.criterionId}`,
                status: 'ENABLED'
              }
            });
            results.push({
              row: rowNumber,
              action: 'ENABLE_KEYWORD',
              status: 'success',
              message: `Keyword ${row.criterionId} will be enabled`
            });
            break;

          default:
            results.push({
              row: rowNumber,
              action: action,
              status: 'error',
              message: `Unknown action: ${action}. Supported actions: PAUSE_CAMPAIGN, ENABLE_CAMPAIGN, UPDATE_BUDGET, UPDATE_BID, PAUSE_KEYWORD, ENABLE_KEYWORD`
            });
        }

      } catch (error) {
          results.push({
            row: rowNumber,
            action: 'processing',
            status: 'error',
            message: `Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
      }
    }

    // Execute operations if not dry run
    if (!dryRun && operations.length > 0) {
      try {
        await customer.mutateResources(operations);
        console.log(`Applied ${operations.length} bulk operations`);
      } catch (error) {
        console.error('Error applying bulk operations:', error);
        return res.status(500).json({
          success: false,
          error: `Failed to apply bulk operations: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error processing bulk CSV:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to process CSV: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}

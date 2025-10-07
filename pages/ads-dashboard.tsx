import React, { useState, useEffect } from 'react';
import Head from 'next/head';

interface Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  cpa: number;
  roas: number;
  budget: number;
  budgetUtilization: number;
  qualityScore?: number;
}

interface Metrics {
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  totalConversionValue: number;
  averageCtr: number;
  averageCpc: number;
  averageConversionRate: number;
  averageCpa: number;
  averageRoas: number;
  totalBudget: number;
  budgetUtilization: number;
  campaigns: Campaign[];
  performance: {
    bestPerformingCampaign: string;
    worstPerformingCampaign: string;
    topKeywords: any[];
    recommendations: string[];
  };
}

export default function AdsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [optimizationSettings, setOptimizationSettings] = useState({
    maxCpcIncrease: 20,
    minCpcDecrease: 15,
    pauseLowPerforming: true,
    pauseThreshold: {
      ctr: 1,
      conversionRate: 2,
      cpa: 100
    }
  });
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      // Use sample data for testing - switch to /api/google-ads/metrics for real data
      const response = await fetch('/api/google-ads/metrics', {
        headers: { 'x-user-email': 'romanvieito@gmail.com' }
      });
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async () => {
    try {
      setOptimizing(true);
      const response = await fetch('/api/google-ads/optimize-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'romanvieito@gmail.com'
        },
        body: JSON.stringify({
          campaignId: selectedCampaign,
          optimizationType: 'ALL',
          settings: optimizationSettings
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Optimization completed! Applied ${data.optimizations?.applied.length || 0} changes.`);
        fetchMetrics(); // Refresh metrics
      } else {
        alert('Optimization failed: ' + data.error);
      }
    } catch (err) {
      alert('Optimization error: ' + (err as Error).message);
    } finally {
      setOptimizing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchMetrics}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Google Ads Dashboard - AdPilot</title>
      </Head>

      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Google Ads Dashboard</h1>
            <div className="flex space-x-4">
              <button
                onClick={fetchMetrics}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Refresh
              </button>
              <button
                onClick={runOptimization}
                disabled={optimizing}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {optimizing ? 'Optimizing...' : 'Run Optimization'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Spend</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(metrics?.totalCost || 0)}
            </p>
            <p className="text-sm text-gray-600">
              Budget: {formatCurrency(metrics?.totalBudget || 0)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Conversions</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(metrics?.totalConversions || 0)}
            </p>
            <p className="text-sm text-gray-600">
              Value: {formatCurrency(metrics?.totalConversionValue || 0)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average CTR</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatPercentage(metrics?.averageCtr || 0)}
            </p>
            <p className="text-sm text-gray-600">
              Clicks: {formatNumber(metrics?.totalClicks || 0)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average CPA</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(metrics?.averageCpa || 0)}
            </p>
            <p className="text-sm text-gray-600">
              ROAS: {metrics?.averageRoas?.toFixed(2) || 0}x
            </p>
          </div>
        </div>

        {/* Performance Insights */}
        {metrics?.performance && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Best Performing Campaign</h3>
                <p className="text-lg font-semibold text-green-600">
                  {metrics.performance.bestPerformingCampaign || 'N/A'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Needs Attention</h3>
                <p className="text-lg font-semibold text-red-600">
                  {metrics.performance.worstPerformingCampaign || 'N/A'}
                </p>
              </div>
            </div>
            
            {metrics.performance.recommendations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Recommendations</h3>
                <ul className="space-y-2">
                  {metrics.performance.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Campaigns Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Campaigns</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROAS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget Util
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics?.campaigns.map((campaign) => (
                  <tr 
                    key={campaign.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedCampaign === campaign.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedCampaign(
                      selectedCampaign === campaign.id ? null : campaign.id
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {campaign.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {campaign.type} • {formatNumber(campaign.impressions)} impressions
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        campaign.status === 'ENABLED' 
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'PAUSED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(campaign.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(campaign.conversions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(campaign.ctr)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(campaign.cpa)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.roas.toFixed(2)}x
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              campaign.budgetUtilization > 80 ? 'bg-green-500' :
                              campaign.budgetUtilization > 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(campaign.budgetUtilization, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatPercentage(campaign.budgetUtilization)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Optimization Settings */}
        {selectedCampaign && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Optimization Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max CPC Increase (%)
                </label>
                <input
                  type="number"
                  value={optimizationSettings.maxCpcIncrease}
                  onChange={(e) => setOptimizationSettings({
                    ...optimizationSettings,
                    maxCpcIncrease: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min CPC Decrease (%)
                </label>
                <input
                  type="number"
                  value={optimizationSettings.minCpcDecrease}
                  onChange={(e) => setOptimizationSettings({
                    ...optimizationSettings,
                    minCpcDecrease: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pause CTR Threshold (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={optimizationSettings.pauseThreshold.ctr}
                  onChange={(e) => setOptimizationSettings({
                    ...optimizationSettings,
                    pauseThreshold: {
                      ...optimizationSettings.pauseThreshold,
                      ctr: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pause Conversion Rate Threshold (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={optimizationSettings.pauseThreshold.conversionRate}
                  onChange={(e) => setOptimizationSettings({
                    ...optimizationSettings,
                    pauseThreshold: {
                      ...optimizationSettings.pauseThreshold,
                      conversionRate: parseFloat(e.target.value)
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useContext, useEffect, useCallback } from 'react';
import Head from "next/head";
import { useRouter } from 'next/router';
import { useUser } from "@clerk/nextjs";
import { 
  Button, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import SBRContext from "../context/SBRContext";
import { Toaster, toast } from "react-hot-toast";

interface CampaignMetrics {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
}

interface DashboardMetrics {
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  averageCtr: number;
  averageCpc: number;
  averageConversionRate: number;
  campaigns: CampaignMetrics[];
}

const AdsDashboard = () => {
  const router = useRouter();
  const { isLoaded, user, isSignedIn } = useUser();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [alerts, setAlerts] = useState<any[]>([]);

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { admin } = context;

  // Redirect non-admin users
  useEffect(() => {
    if (isLoaded && (!isSignedIn || !admin)) {
      router.push('/ads');
    }
  }, [isLoaded, isSignedIn, admin, router]);

  const fetchMetrics = useCallback(async () => {
    if (!user?.emailAddresses[0]?.emailAddress) return;

    setRefreshing(true);
    try {
      const response = await fetch(`/api/google-ads/metrics?days=${selectedPeriod}`, {
        headers: {
          'x-user-email': user.emailAddresses[0].emailAddress
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setMetrics(data.metrics);
        generateAlerts(data.metrics);
      } else {
        toast.error(data.error || 'Failed to fetch metrics');
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to fetch metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedPeriod]);

  const generateAlerts = (metrics: DashboardMetrics) => {
    const newAlerts: any[] = [];

    metrics.campaigns.forEach(campaign => {
      // Low CTR alert
      if (campaign.ctr < 0.01 && campaign.impressions > 1000) {
        newAlerts.push({
          type: 'warning',
          title: 'Low CTR',
          message: `${campaign.name} has CTR of ${(campaign.ctr * 100).toFixed(2)}% with ${campaign.impressions.toLocaleString()} impressions`,
          campaignId: campaign.id
        });
      }

      // High CPC alert
      if (campaign.cpc > 5.0 && campaign.clicks > 50) {
        newAlerts.push({
          type: 'error',
          title: 'High CPC',
          message: `${campaign.name} has CPC of $${campaign.cpc.toFixed(2)} with ${campaign.clicks} clicks`,
          campaignId: campaign.id
        });
      }

      // Low conversion rate alert
      if (campaign.conversions > 0 && campaign.conversionRate < 0.01 && campaign.clicks > 100) {
        newAlerts.push({
          type: 'warning',
          title: 'Low Conversion Rate',
          message: `${campaign.name} has conversion rate of ${(campaign.conversionRate * 100).toFixed(2)}% with ${campaign.clicks} clicks`,
          campaignId: campaign.id
        });
      }

      // High cost per conversion alert
      if (campaign.conversions > 0 && campaign.cost > 200) {
        const costPerConversion = campaign.cost / campaign.conversions;
        if (costPerConversion > 100) {
          newAlerts.push({
            type: 'error',
            title: 'High Cost Per Conversion',
            message: `${campaign.name} has cost per conversion of $${costPerConversion.toFixed(2)}`,
            campaignId: campaign.id
          });
        }
      }
    });

    setAlerts(newAlerts);
  };

  const runOptimization = async () => {
    if (!user?.emailAddresses[0]?.emailAddress) return;

    setLoading(true);
    try {
      const response = await fetch('/api/google-ads/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.emailAddresses[0].emailAddress
        },
        body: JSON.stringify({ dryRun: false })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Applied ${data.optimizations?.length || 0} optimizations`);
        fetchMetrics(); // Refresh metrics
      } else {
        toast.error(data.error || 'Failed to run optimization');
      }
    } catch (error) {
      console.error('Error running optimization:', error);
      toast.error('Failed to run optimization');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn && admin) {
      fetchMetrics();
    }
  }, [fetchMetrics, isSignedIn, admin]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CircularProgress />
      </div>
    );
  }

  if (!isSignedIn || !admin) {
    return null;
  }

  return (
    <div className="flex max-w-7xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>AdPilot Dashboard</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{ duration: 5000 }}
      />

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        <div className="absolute top-4 left-4">
          <div className="flex items-center space-x-0.5">
            <span className="text-gray-800 font-semibold text-lg">simpler</span>
            <div className="w-4 h-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4 flex space-x-2">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchMetrics}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={runOptimization}
            disabled={loading}
          >
            Run Optimization
          </Button>
        </div>

        <h1 className="text-2xl text-gray-900 mb-8 tracking-tight">
          AdPilot <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Dashboard</span>
        </h1>

        <div className="w-full space-y-6">
          {/* Period Selector */}
          <div className="flex justify-center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as number)}
              >
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.type === 'error' ? 'error' : 'warning'}
                  icon={<WarningIcon />}
                >
                  <AlertTitle>{alert.title}</AlertTitle>
                  {alert.message}
                </Alert>
              ))}
            </div>
          )}

          {/* KPI Cards */}
          {metrics && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <Typography color="textSecondary" gutterBottom>
                          Impressions
                        </Typography>
                        <Typography variant="h4">
                          {metrics.totalImpressions.toLocaleString()}
                        </Typography>
                      </div>
                      <VisibilityIcon color="primary" />
                    </div>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <Typography color="textSecondary" gutterBottom>
                          Clicks
                        </Typography>
                        <Typography variant="h4">
                          {metrics.totalClicks.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          CTR: {(metrics.averageCtr * 100).toFixed(2)}%
                        </Typography>
                      </div>
                      <TouchAppIcon color="primary" />
                    </div>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <Typography color="textSecondary" gutterBottom>
                          Cost
                        </Typography>
                        <Typography variant="h4">
                          ${metrics.totalCost.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Avg CPC: ${metrics.averageCpc.toFixed(2)}
                        </Typography>
                      </div>
                      <AttachMoneyIcon color="primary" />
                    </div>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <Typography color="textSecondary" gutterBottom>
                          Conversions
                        </Typography>
                        <Typography variant="h4">
                          {metrics.totalConversions}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Rate: {(metrics.averageConversionRate * 100).toFixed(2)}%
                        </Typography>
                      </div>
                      <ShoppingCartIcon color="primary" />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Campaigns Table */}
          {metrics && (
            <Card>
              <CardContent>
                <Typography variant="h6" className="mb-4">Campaigns</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Campaign Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Impressions</TableCell>
                        <TableCell align="right">Clicks</TableCell>
                        <TableCell align="right">CTR</TableCell>
                        <TableCell align="right">Cost</TableCell>
                        <TableCell align="right">CPC</TableCell>
                        <TableCell align="right">Conversions</TableCell>
                        <TableCell align="right">Conv. Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metrics.campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <Typography variant="body2" className="font-medium">
                              {campaign.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={campaign.status}
                              color={campaign.status === 'ENABLED' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {campaign.impressions.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            {campaign.clicks.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            <div className="flex items-center justify-end">
                              {(campaign.ctr * 100).toFixed(2)}%
                              {campaign.ctr > 0.02 ? (
                                <TrendingUpIcon className="text-green-500 ml-1" fontSize="small" />
                              ) : campaign.ctr < 0.01 ? (
                                <TrendingDownIcon className="text-red-500 ml-1" fontSize="small" />
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell align="right">
                            ${campaign.cost.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            ${campaign.cpc.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {campaign.conversions}
                          </TableCell>
                          <TableCell align="right">
                            {(campaign.conversionRate * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdsDashboard;



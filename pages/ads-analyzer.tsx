import React, { useState, useContext, useEffect, useCallback } from 'react';
import Head from "next/head";
import { useRouter } from 'next/router';
import { useUser, useClerk, UserButton } from "@clerk/nextjs";
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
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  LinearProgress
} from "@mui/material";
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SBRContext from "../context/SBRContext";
import { Toaster, toast } from "react-hot-toast";

interface ParsedRow {
  [key: string]: string;
}

interface AnalysisResult {
  id: number;
  campaignCount: number;
  adGroupCount: number;
  keywordCount: number;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  avgCTR: number;
  previewRows: ParsedRow[];
}

interface Recommendation {
  type: 'pause' | 'bid_increase' | 'bid_decrease' | 'ad_copy' | 'negative_keyword' | 'budget' | 'geography';
  entity: 'keyword' | 'ad' | 'campaign' | 'ad_group';
  campaign: string;
  ad_group?: string;
  keyword_or_ad: string;
  issue: string;
  suggestion: string;
  evidence: string;
}

interface OptimizationResult {
  recommendations: Recommendation[];
  summary: {
    totalRecommendations: number;
    pauseRecommendations: number;
    bidRecommendations: number;
    otherRecommendations: number;
  };
}

const AdsAnalyzerPage = () => {
  const router = useRouter();
  const { isLoaded, user, isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  
  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const steps = [
    'Upload CSV',
    'Validate & Preview',
    'Analysis',
    'Results & Recommendations'
  ];

  // Required columns for Google Ads Editor format (case-insensitive)
  const requiredColumns = ['campaign', 'ad group', 'impressions', 'clicks', 'cost'];
  const optionalColumns = ['keyword', 'ad', 'quality score', 'ad strength', 'location', 'geo'];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      setCurrentStep(1);
      
      // Parse CSV for preview
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          setCsvData(results.data as ParsedRow[]);
          validateColumns(results.meta.fields || []);
        },
        error: (error: any) => {
          toast.error(`Error parsing CSV: ${error.message}`);
        }
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const validateColumns = (headers: string[]) => {
    const errors: string[] = [];
    
    // Normalize headers to lowercase for comparison
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Check for required columns (case-insensitive)
    requiredColumns.forEach(col => {
      if (!normalizedHeaders.includes(col.toLowerCase())) {
        errors.push(`Missing required column: ${col}`);
      }
    });
    
    // Check for at least one of Keyword or Ad (case-insensitive)
    if (!normalizedHeaders.includes('keyword') && !normalizedHeaders.includes('ad')) {
      errors.push('Must have either "Keyword" or "Ad" column');
    }
    
    setValidationErrors(errors);
  };

  const runAnalysis = async () => {
    if (!uploadedFile || !user?.emailAddresses[0]?.emailAddress) return;

    setLoading(true);
    try {
      // Read file content
      const fileContent = await uploadedFile.text();
      
      // Submit for analysis
      const response = await fetch('/api/google-ads/analyze-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.emailAddresses[0].emailAddress
        },
        body: JSON.stringify({
          fileName: uploadedFile.name,
          csv: fileContent,
          userEmail: user.emailAddresses[0].emailAddress
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setAnalysisResult(data);
        setCurrentStep(3);
        
        // Run optimization
        await runOptimization(data.id);
      } else {
        toast.error(data.error || 'Failed to analyze CSV');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong analyzing CSV');
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async (analysisId: number) => {
    try {
      const response = await fetch('/api/google-ads/optimize-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        },
        body: JSON.stringify({ analysisId })
      });

      const data = await response.json();
      
      if (response.ok) {
        setOptimizationResult(data);
      } else {
        toast.error(data.error || 'Failed to generate recommendations');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong generating recommendations');
    }
  };

  const exportRecommendations = async (format: 'csv' | 'json') => {
    if (!analysisResult || !optimizationResult) return;

    setExporting(true);
    try {
      const response = await fetch('/api/google-ads/export-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        },
        body: JSON.stringify({
          analysisId: analysisResult.id,
          format
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Download the file
        const blob = new Blob([data.data], { type: data.contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Recommendations exported successfully!');
      } else {
        toast.error(data.error || 'Failed to export recommendations');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong exporting recommendations');
    } finally {
      setExporting(false);
    }
  };

  // Chart data preparation
  const getChartData = () => {
    if (!analysisResult) return { campaignData: [], ctrData: [] };

    // Top campaigns by impressions
    const campaignMap = new Map();
    csvData.forEach(row => {
      const campaign = row.Campaign || 'Unknown';
      if (!campaignMap.has(campaign)) {
        campaignMap.set(campaign, { name: campaign, impressions: 0, clicks: 0, cost: 0 });
      }
      const data = campaignMap.get(campaign);
      data.impressions += parseInt(row.Impressions || '0');
      data.clicks += parseInt(row.Clicks || '0');
      data.cost += parseFloat(row.Cost || '0');
    });

    const campaignData = Array.from(campaignMap.values())
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10);

    // CTR distribution
    const ctrRanges = [
      { range: '0-1%', count: 0, color: '#ef4444' },
      { range: '1-3%', count: 0, color: '#f59e0b' },
      { range: '3-5%', count: 0, color: '#10b981' },
      { range: '5%+', count: 0, color: '#059669' }
    ];

    csvData.forEach(row => {
      const impressions = parseInt(row.Impressions || '0');
      const clicks = parseInt(row.Clicks || '0');
      if (impressions > 0) {
        const ctr = (clicks / impressions) * 100;
        if (ctr <= 1) ctrRanges[0].count++;
        else if (ctr <= 3) ctrRanges[1].count++;
        else if (ctr <= 5) ctrRanges[2].count++;
        else ctrRanges[3].count++;
      }
    });

    return { campaignData, ctrData: ctrRanges };
  };

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

  const { campaignData, ctrData } = getChartData();

  return (
    <div className="flex max-w-7xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Ads Analyzer - AdPilot</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{ duration: 5000 }}
      />

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        <div className="absolute top-4 left-4 flex items-center space-x-3">
          {/* Logo */}
          <div className="flex items-center space-x-0.5">
            <span className="text-gray-800 font-semibold text-lg">simpler</span>
            <div className="w-4 h-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
          </div>
          
          {/* Tool Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => router.push('/domain')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Domain
            </button>
            <button 
              onClick={() => router.push('/web')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Website
            </button>
            <button 
              onClick={() => router.push('/email')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Email
            </button>
            <button className="px-3 py-1 bg-white rounded-md text-sm font-medium text-gray-800 shadow-sm">
              Ads
            </button>
          </div>

          {/* AdPilot Navigation */}
          {admin && (
            <div className="flex items-center space-x-1 bg-blue-50 rounded-lg p-1 ml-4">
              <button 
                onClick={() => router.push('/ads')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  router.pathname === '/ads' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                Wizard
              </button>
              <button 
                onClick={() => router.push('/campaign-drafts')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  router.pathname === '/campaign-drafts' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                Drafts
              </button>
              <button 
                onClick={() => router.push('/ads-analyzer')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  router.pathname === '/ads-analyzer' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                Analyze
              </button>
            </div>
          )}
        </div>

        <Box
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            gap: 2,
            alignItems: "center",
          }}
        >
          {isSignedIn ? (
            <UserButton userProfileUrl="/user" afterSignOutUrl="/" />
          ) : (
            <Button
              variant="outlined"
              onClick={() => openSignIn()}
            >
              Sign in
            </Button>
          )}
        </Box>

        <h1 className="text-2xl text-gray-900 mb-8 tracking-tight">
          Google Ads <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">CSV Analyzer</span>
        </h1>

        {/* Stepper */}
        <div className="w-full max-w-4xl mx-auto mt-8 mb-8">
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </div>

        {/* Content */}
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-8">
            
            {/* Step 1: Upload */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <Typography variant="h5" className="text-gray-900 mb-4">Upload Google Ads CSV</Typography>
                
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Typography variant="h6" className="mb-2">
                    {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" className="mb-4">
                    or click to select a file
                  </Typography>
                  <Typography variant="caption" display="block" color="textSecondary">
                    Supports Google Ads Editor export format (.csv, max 10MB)
                  </Typography>
                </div>

                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Required columns:</strong> Campaign, Ad Group, Impressions, Clicks, Cost
                    <br />
                    <strong>Optional columns:</strong> Keyword or Ad, Quality Score, Ad Strength, Location
                    <br />
                    <em>Column names are case-insensitive and will be matched automatically.</em>
                  </Typography>
                </Alert>
              </div>
            )}

            {/* Step 2: Validate & Preview */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <Typography variant="h5" className="text-gray-900 mb-4">Validate & Preview</Typography>
                
                {uploadedFile && (
                  <Alert severity="success">
                    <Typography variant="body2">
                      File uploaded: <strong>{uploadedFile.name}</strong> ({csvData.length} rows)
                    </Typography>
                  </Alert>
                )}

                {validationErrors.length > 0 && (
                  <Alert severity="error">
                    <Typography variant="body2">
                      <strong>Validation errors:</strong>
                      <ul className="mt-2">
                        {validationErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </Typography>
                  </Alert>
                )}

                {validationErrors.length === 0 && csvData.length > 0 && (
                  <div>
                    <Typography variant="h6" className="mb-4">Data Preview (first 10 rows)</Typography>
                    <TableContainer component={Paper} className="max-h-96 overflow-auto">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {Object.keys(csvData[0]).map((header) => (
                              <TableCell key={header} className="font-medium">{header}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {csvData.slice(0, 10).map((row, index) => (
                            <TableRow key={index}>
                              {Object.values(row).map((value, cellIndex) => (
                                <TableCell key={cellIndex}>{value}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button onClick={() => setCurrentStep(0)}>Back</Button>
                  <Button
                    variant="contained"
                    onClick={runAnalysis}
                    disabled={validationErrors.length > 0 || csvData.length === 0}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? 'Analyzing...' : 'Run Analysis'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Analysis */}
            {currentStep === 2 && (
              <div className="space-y-6 text-center">
                <Typography variant="h5" className="text-gray-900 mb-4">Running Analysis</Typography>
                <CircularProgress size={60} />
                <Typography variant="body1" color="textSecondary">
                  Processing your Google Ads data and generating recommendations...
                </Typography>
                <LinearProgress className="mt-4" />
              </div>
            )}

            {/* Step 4: Results */}
            {currentStep === 3 && analysisResult && (
              <div className="space-y-6">
                <Typography variant="h5" className="text-gray-900 mb-4">Analysis Results</Typography>
                
                {/* Summary Cards */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" className="text-blue-600">
                          {analysisResult.campaignCount}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Campaigns
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" className="text-green-600">
                          {analysisResult.totalImpressions.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Impressions
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" className="text-orange-600">
                          {analysisResult.totalClicks.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Clicks
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" className="text-purple-600">
                          ${analysisResult.totalCost.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total Cost
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Charts */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" className="mb-4">Top Campaigns by Impressions</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={campaignData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              fontSize={12}
                            />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="impressions" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" className="mb-4">CTR Distribution</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={ctrData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="count"
                              label={({ range, count }) => `${range}: ${count}`}
                            >
                              {ctrData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Recommendations */}
                {optimizationResult && (
                  <div>
                    <Typography variant="h6" className="mb-4">
                      Optimization Recommendations ({optimizationResult.summary.totalRecommendations})
                    </Typography>
                    
                    <div className="space-y-3 max-h-96 overflow-auto">
                      {optimizationResult.recommendations.map((rec, index) => (
                        <Card key={index} variant="outlined">
                          <CardContent>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Chip 
                                    label={rec.type.replace('_', ' ')} 
                                    size="small" 
                                    color={
                                      rec.type === 'pause' ? 'error' :
                                      rec.type.includes('bid') ? 'warning' : 'info'
                                    }
                                  />
                                  <Typography variant="body2" color="textSecondary">
                                    {rec.campaign} {rec.ad_group && `> ${rec.ad_group}`}
                                  </Typography>
                                </div>
                                <Typography variant="body2" className="font-medium mb-1">
                                  {rec.keyword_or_ad}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" className="mb-2">
                                  {rec.issue}
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Suggestion:</strong> {rec.suggestion}
                                </Typography>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Export */}
                    <div className="flex justify-center gap-4 mt-6">
                      <Button
                        variant="outlined"
                        onClick={() => exportRecommendations('csv')}
                        disabled={exporting}
                        startIcon={exporting ? <CircularProgress size={20} /> : null}
                      >
                        Export CSV
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => exportRecommendations('json')}
                        disabled={exporting}
                        startIcon={exporting ? <CircularProgress size={20} /> : null}
                      >
                        Export JSON
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-center mt-8">
                  <Button
                    variant="contained"
                    onClick={() => {
                      setCurrentStep(0);
                      setUploadedFile(null);
                      setCsvData([]);
                      setAnalysisResult(null);
                      setOptimizationResult(null);
                    }}
                  >
                    Analyze Another File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdsAnalyzerPage;

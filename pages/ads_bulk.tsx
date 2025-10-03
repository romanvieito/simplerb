import React, { useState, useContext, useEffect, useRef } from 'react';
import Head from "next/head";
import { useRouter } from 'next/router';
import { useUser } from "@clerk/nextjs";
import { 
  Button, 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Divider
} from "@mui/material";
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SBRContext from "../context/SBRContext";
import { Toaster, toast } from "react-hot-toast";

interface BulkResult {
  row: number;
  action: string;
  status: 'success' | 'error';
  message: string;
}

const AdsBulk = () => {
  const router = useRouter();
  const { isLoaded, user, isSignedIn } = useUser();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setResults([]);
      setShowPreview(false);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const downloadTemplate = () => {
    const csvContent = `campaignId,action,budgetAmount,adGroupId,criterionId,bidAmount
123456789,PAUSE_CAMPAIGN,,
123456789,ENABLE_CAMPAIGN,,
123456789,UPDATE_BUDGET,100,
123456789,UPDATE_BID,456789012,789012345,2.50
123456789,PAUSE_KEYWORD,,,789012345,
123456789,ENABLE_KEYWORD,,,789012345,`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'adpilot-bulk-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const previewFile = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/google-ads/bulk-csv?dryRun=true', {
        method: 'POST',
        headers: {
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results || []);
        setShowPreview(true);
        toast.success('Preview generated successfully');
      } else {
        toast.error(data.error || 'Failed to preview CSV');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Failed to preview CSV');
    } finally {
      setLoading(false);
    }
  };

  const applyChanges = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/google-ads/bulk-csv', {
        method: 'POST',
        headers: {
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results || []);
        toast.success('Bulk changes applied successfully');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error(data.error || 'Failed to apply bulk changes');
      }
    } catch (error) {
      console.error('Error applying changes:', error);
      toast.error('Failed to apply bulk changes');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !isSignedIn || !admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="flex max-w-6xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>AdPilot Bulk Editor</title>
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

        <h1 className="text-2xl text-gray-900 mb-8 tracking-tight">
          AdPilot <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Bulk Editor</span>
        </h1>

        <div className="w-full space-y-6">
          {/* Instructions */}
          <Card>
            <CardContent>
              <Typography variant="h6" className="mb-4">How to Use Bulk Editor</Typography>
              <div className="text-left space-y-2">
                <Typography variant="body2">
                  1. Download the CSV template below to see the required format
                </Typography>
                <Typography variant="body2">
                  2. Fill in your campaign data (campaign IDs, actions, etc.)
                </Typography>
                <Typography variant="body2">
                  3. Upload your CSV file and preview changes before applying
                </Typography>
                <Typography variant="body2">
                  4. Apply changes to update your Google Ads campaigns
                </Typography>
              </div>
            </CardContent>
          </Card>

          {/* Template Download */}
          <Card>
            <CardContent>
              <Typography variant="h6" className="mb-4">CSV Template</Typography>
              <Typography variant="body2" className="mb-4 text-gray-600">
                Download the template to see the required CSV format and column headers.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={downloadTemplate}
              >
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardContent>
              <Typography variant="h6" className="mb-4">Upload CSV File</Typography>
              
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".csv"
                  style={{ display: 'none' }}
                />
                
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select CSV File
                </Button>

                {selectedFile && (
                  <div>
                    <Typography variant="body2" className="text-green-600">
                      Selected: {selectedFile.name}
                    </Typography>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={previewFile}
                    disabled={!selectedFile || loading}
                  >
                    Preview Changes
                  </Button>

                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={applyChanges}
                    disabled={!selectedFile || loading}
                  >
                    Apply Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" className="mb-4">
                  Results ({results.length} operations)
                </Typography>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Message</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>{result.row}</TableCell>
                          <TableCell>{result.action}</TableCell>
                          <TableCell>
                            <Chip
                              label={result.status}
                              color={result.status === 'success' ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{result.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Divider className="my-4" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Typography variant="h6" className="text-green-600">
                      {results.filter(r => r.status === 'success').length} Successful
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="h6" className="text-red-600">
                      {results.filter(r => r.status === 'error').length} Errors
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supported Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" className="mb-4">Supported Actions</Typography>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <Typography variant="subtitle1" className="font-medium">Campaign Actions</Typography>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>PAUSE_CAMPAIGN - Pause a campaign</li>
                    <li>ENABLE_CAMPAIGN - Enable a paused campaign</li>
                    <li>UPDATE_BUDGET - Update daily budget (requires budgetAmount)</li>
                  </ul>
                </div>
                <div>
                  <Typography variant="subtitle1" className="font-medium">Keyword Actions</Typography>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>UPDATE_BID - Update keyword bid (requires adGroupId, criterionId, bidAmount)</li>
                    <li>PAUSE_KEYWORD - Pause a keyword (requires criterionId)</li>
                    <li>ENABLE_KEYWORD - Enable a paused keyword (requires criterionId)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdsBulk;

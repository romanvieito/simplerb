import React, { useState, useContext, useEffect } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SBRContext from "../context/SBRContext";
import { Toaster, toast } from "react-hot-toast";

interface CampaignDraft {
  id: string;
  name: string;
  industry?: string;
  campaignData: {
    type: 'SEARCH' | 'PMAX';
    brand: string;
    url: string;
    keywords: string[];
    budgetDaily: number;
  };
  generatedCopy: {
    headlines: string[];
    descriptions: string[];
  };
  status: 'draft' | 'ready' | 'exported';
  createdAt: string;
  updatedAt: string;
}

const CampaignDraftsPage = () => {
  const router = useRouter();
  const { isLoaded, user, isSignedIn } = useUser();
  const { openSignIn } = useClerk();
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<CampaignDraft | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

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

  const fetchDrafts = async () => {
    if (!user?.emailAddresses[0]?.emailAddress) return;

    try {
      const response = await fetch('/api/campaign-drafts/list', {
        headers: {
          'x-user-email': user.emailAddresses[0].emailAddress
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setDrafts(data.drafts);
      } else {
        toast.error(data.error || 'Failed to fetch drafts');
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast.error('Failed to fetch drafts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn && admin) {
      fetchDrafts();
    }
  }, [isSignedIn, admin]);

  const exportDraft = async (draftId: string, format: 'google-ads-editor' | 'csv' | 'json') => {
    if (!user?.emailAddresses[0]?.emailAddress) return;

    setExporting(draftId);
    try {
      const response = await fetch('/api/campaign-drafts/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user.emailAddresses[0].emailAddress
        },
        body: JSON.stringify({ draftId, format })
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
        
        toast.success('Campaign exported successfully!');
        fetchDrafts(); // Refresh to update status
      } else {
        toast.error(data.error || 'Failed to export draft');
      }
    } catch (error) {
      console.error('Error exporting draft:', error);
      toast.error('Failed to export draft');
    } finally {
      setExporting(null);
    }
  };

  const previewDraft = (draft: CampaignDraft) => {
    setSelectedDraft(draft);
    setPreviewOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'ready': return 'success';
      case 'exported': return 'info';
      default: return 'default';
    }
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

  return (
    <div className="flex max-w-7xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Campaign Drafts - AdPilot</title>
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
            <button 
              onClick={() => router.push('/smart-pilot')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Smart Pilot
            </button>
          </div>

          {/* AdPilot Navigation */}
          {admin && (
            <div className="flex items-center space-x-1 bg-blue-50 rounded-lg p-1 ml-4">
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
                onClick={() => router.push('/ads?wizard=true')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  router.pathname === '/ads' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                Wizard
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
          <Button
            variant="contained"
            onClick={() => router.push('/ads')}
          >
            New Campaign
          </Button>
          
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
          Campaign <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Drafts</span>
        </h1>

        <div className="w-full">
          {drafts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Typography variant="h6" className="mb-4">
                  No campaign drafts yet
                </Typography>
                <Typography variant="body2" color="textSecondary" className="mb-6">
                  Create your first campaign and save it as a draft to get started.
                  <br/>
                  Export drafts to Google Ads Editor for manual import.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => router.push('/ads?wizard=true')}
                >
                  New Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Brand</TableCell>
                    <TableCell>Budget</TableCell>
                    <TableCell>Keywords</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drafts.map((draft) => (
                    <TableRow key={draft.id}>
                      <TableCell>
                        <Typography variant="body2" className="font-medium">
                          {draft.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={draft.campaignData.type} size="small" />
                      </TableCell>
                      <TableCell>{draft.campaignData.brand}</TableCell>
                      <TableCell>${draft.campaignData.budgetDaily}/day</TableCell>
                      <TableCell>{draft.campaignData.keywords.length}</TableCell>
                      <TableCell>
                        <Chip 
                          label={draft.status} 
                          size="small" 
                          color={getStatusColor(draft.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(draft.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Box className="flex space-x-1">
                          <IconButton
                            size="small"
                            onClick={() => previewDraft(draft)}
                            title="Preview"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => exportDraft(draft.id, 'google-ads-editor')}
                            disabled={exporting === draft.id}
                            title="Export to Google Ads Editor"
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </main>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Campaign Preview</DialogTitle>
        <DialogContent>
          {selectedDraft && (
            <div className="space-y-4">
              <div>
                <Typography variant="h6">Campaign Details</Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {selectedDraft.name}<br/>
                  <strong>Type:</strong> {selectedDraft.campaignData.type}<br/>
                  <strong>Brand:</strong> {selectedDraft.campaignData.brand}<br/>
                  <strong>URL:</strong> {selectedDraft.campaignData.url}<br/>
                  <strong>Budget:</strong> ${selectedDraft.campaignData.budgetDaily}/day<br/>
                  <strong>Keywords:</strong> {selectedDraft.campaignData.keywords.join(', ')}
                </Typography>
              </div>
              
              <div>
                <Typography variant="h6">Generated Copy</Typography>
                <Typography variant="body2">
                  <strong>Headlines:</strong><br/>
                  {selectedDraft.generatedCopy.headlines.map((headline, index) => (
                    <span key={index}>• {headline}<br/></span>
                  ))}
                  <br/>
                  <strong>Descriptions:</strong><br/>
                  {selectedDraft.generatedCopy.descriptions.map((desc, index) => (
                    <span key={index}>• {desc}<br/></span>
                  ))}
                </Typography>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedDraft) {
                exportDraft(selectedDraft.id, 'google-ads-editor');
                setPreviewOpen(false);
              }
            }}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CampaignDraftsPage;

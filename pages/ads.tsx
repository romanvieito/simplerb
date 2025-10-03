import React, { useState, useRef, useContext, useEffect, useCallback } from 'react';
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import Header from "../components/Header";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useRouter } from 'next/router';
import { useUser } from "@clerk/nextjs";
import { Button, Box, TextField, FormControl, InputLabel, Select, MenuItem, Chip, Typography, Stepper, Step, StepLabel } from "@mui/material";
import DiamondIcon from '@mui/icons-material/Diamond';
import LoginIcon from '@mui/icons-material/Login';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";
import mixpanel from "../utils/mixpanel-config";

const AdsPage = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, user, isSignedIn } = useUser();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<any>(null);
  
  // Campaign data
  const [campaignData, setCampaignData] = useState({
    type: 'SEARCH',
    brand: '',
    url: '',
    keywords: [] as string[],
    keywordInput: '',
    locations: [] as string[],
    languages: ['en'],
    budgetDaily: 50,
    campaignNameSuffix: ''
  });

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { 
    dataUser, 
    setDataUser,    
    credits, 
    setCredits, 
    admin, 
    setAdmin,
    subsTplan, 
    setSubsTplan, 
    subsCancel, 
    setSubsCancel    
  } = context;

  const isPremiumUser = subsTplan === "STARTER" || subsTplan === "CREATOR";

  // Add fetchUserData function
  const fetchUserData = useCallback(async (email: string) => {
    try {
      const response = await fetch(`/api/getUser?email=${email}`);
      if (!response.ok) {
        const text = await response.text();
        console.error(`Response status: ${response.status}, text: ${text}`);
        throw new Error(`Network response was not ok. Status: ${response.status}`);
      }
      const userData = await response.json();
      if (userData.user) {
        setDataUser({
          id: userData.user.id,
          name: userData.user.name,
          email: userData.user.email
        });      
        setCredits(userData.user.credits);
        setAdmin(userData.user.admin);
        setSubsTplan(userData.user.subs_tplan);
        setSubsCancel(userData.user.subs_cancel);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  }, [setDataUser, setCredits, setAdmin, setSubsTplan, setSubsCancel]);

  // Add initPageData function
  const initPageData = useCallback(async () => {
    if (isLoaded && user) {
      const email = user.emailAddresses[0].emailAddress;
      if (email) {
        try {
          await fetchUserData(email);
          mixpanel.identify(email);
        } catch (error) {
          console.error("Error initializing page data:", error);
          if (process.env.NODE_ENV !== 'production') {
            console.warn("Failed to load user data. Please try refreshing the page.");
          }
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.warn("User email not available");
        }
      }
    } else if (isLoaded && !user) {
      // Reset user data when not signed in
      setSubsTplan(null);
      setSubsCancel(null);
      setCredits(null);
      setDataUser({
        id: '0',
        name: 'anonymous',
        email: 'anonymous@anonymous.com'
      });
      setAdmin(false);
    }
  }, [isLoaded, user, fetchUserData]);

  // Add useEffect to load user data
  useEffect(() => {
    initPageData();
  }, [isSignedIn, user, initPageData]);

  const steps = [
    'Campaign Basics',
    'Keywords',
    'Targeting',
    'Budget',
    'AI Copy',
    'Review & Launch'
  ];

  const handleKeywordAdd = () => {
    if (campaignData.keywordInput.trim() && !campaignData.keywords.includes(campaignData.keywordInput.trim())) {
      setCampaignData(prev => ({
        ...prev,
        keywords: [...prev.keywords, prev.keywordInput.trim()],
        keywordInput: ''
      }));
    }
  };

  const handleKeywordRemove = (keyword: string) => {
    setCampaignData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const generateAdCopy = async () => {
    if (!campaignData.keywords.length) {
      toast.error('Please add at least one keyword');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/google-ads/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: campaignData.keywords,
          brand: campaignData.brand,
          landingUrl: campaignData.url,
          campaignType: campaignData.type
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setGeneratedCopy(data);
        toast.success('Ad copy generated successfully!');
        setCurrentStep(5); // Move to review step
      } else {
        toast.error(data.error || 'Failed to generate ad copy');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong generating ad copy');
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!generatedCopy) {
      toast.error('Please generate ad copy first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/google-ads/create-campaign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': user?.emailAddresses[0]?.emailAddress || ''
        },
        body: JSON.stringify({
          ...campaignData,
          copy: generatedCopy
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Campaign created successfully! Check your Google Ads account.');
        console.log('Campaign created:', data);
        
        // Reset form
        setCurrentStep(0);
        setCampaignData({
          type: 'SEARCH',
          brand: '',
          url: '',
          keywords: [],
          keywordInput: '',
          locations: [],
          languages: ['en'],
          budgetDaily: 50,
          campaignNameSuffix: ''
        });
        setGeneratedCopy(null);
      } else {
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong creating campaign');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveToLocalStorage = () => {
    localStorage.setItem('adpilot-draft', JSON.stringify({
      campaignData,
      currentStep,
      generatedCopy
    }));
  };

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('adpilot-draft');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCampaignData(data.campaignData || campaignData);
        setCurrentStep(data.currentStep || 0);
        setGeneratedCopy(data.generatedCopy || null);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  };

  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  useEffect(() => {
    saveToLocalStorage();
  }, [campaignData, currentStep, generatedCopy]);

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Ad Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hidden form for checkout */}
      <form action="/api/checkout_sessions" method="POST" style={{ display: 'none' }}>
        <input type="hidden" name="tipo" value="STARTER" />
      </form>

      {/* <Header/> */}
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
                onClick={() => router.push('/ads_dashboard')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  router.pathname === '/ads_dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => router.push('/ads_bulk')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  router.pathname === '/ads_bulk' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                Bulk Edit
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
            <>
              <form action="/api/checkout_sessions" method="POST">
                <input type="hidden" name="tipo" value="STARTER" />
                <Button
                  className="bg-black cursor-pointer hover:bg-black/80 rounded-xl"
                  style={{ textTransform: "none" }}
                  sx={{
                    padding: { xs: "3px", sm: 1 },
                    display:
                      isSignedIn &&
                      (subsTplan === "STARTER" || subsTplan === "CREATOR")
                        ? "none"
                        : "block",
                  }}
                  type="submit"
                  variant="contained"
                  role="link"
                  onClick={(e) => {
                    e.preventDefault();
                    mixpanel.track("Become a Member Click", {
                      plan_subscription: 'STARTER',
                    });  
                    window.gtag && window.gtag('event', 'conversion', {
                      'send_to': '16510475658/ZCyECJS9tqYZEIq758A9',
                    });

                    const form = e.currentTarget.form;
                    if (form) {
                      form.submit();
                    } else {
                      console.error("Form not found");
                    }
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <DiamondIcon sx={{ mr: 0.2, fontSize: "1rem" }} />
                    Become a Member
                  </Box>
                </Button>
              </form>
              <UserButton userProfileUrl="/user" afterSignOutUrl="/" />
            </>
          ) : (
            <button
              onClick={() => openSignIn()}
              className="group relative bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 hover:bg-black/80 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-black/20 shadow-lg hover:shadow-xl"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <LoginIcon sx={{ fontSize: '1rem' }} />
                Sign in / up
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          )}
        </Box>

        <h1 className="text-2xl text-gray-900 mb-3 tracking-tight">
          AdPilot <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Campaign Wizard</span>
        </h1>

        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{ duration: 5000 }}
        />

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

        {/* Wizard Content */}
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-8">
            {currentStep === 0 && (
              <div className="space-y-6">
                <Typography variant="h5" className="text-gray-900 mb-4">Campaign Basics</Typography>
                
                <FormControl fullWidth>
                  <InputLabel>Campaign Type</InputLabel>
                  <Select
                    value={campaignData.type}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <MenuItem value="SEARCH">Search Campaign</MenuItem>
                    <MenuItem value="PMAX">Performance Max</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Brand Name"
                  value={campaignData.brand}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="e.g., My Company"
                />

                <TextField
                  fullWidth
                  label="Landing Page URL"
                  value={campaignData.url}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                />

                <TextField
                  fullWidth
                  label="Campaign Name Suffix (optional)"
                  value={campaignData.campaignNameSuffix}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, campaignNameSuffix: e.target.value }))}
                  placeholder="e.g., Q4 Sale"
                />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <Typography variant="h5" className="text-gray-900 mb-4">Keywords</Typography>
                
                <div className="flex space-x-2">
                  <TextField
                    fullWidth
                    label="Add Keyword"
                    value={campaignData.keywordInput}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, keywordInput: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleKeywordAdd())}
                    placeholder="e.g., best coffee shop"
                  />
                  <Button variant="contained" onClick={handleKeywordAdd}>Add</Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {campaignData.keywords.map((keyword) => (
                    <Chip
                      key={keyword}
                      label={keyword}
                      onDelete={() => handleKeywordRemove(keyword)}
                      color="primary"
                    />
                  ))}
                </div>

                {campaignData.keywords.length === 0 && (
                  <Typography variant="body2" color="textSecondary">
                    Add keywords that describe your product or service
                  </Typography>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <Typography variant="h5" className="text-gray-900 mb-4">Targeting</Typography>
                
                <FormControl fullWidth>
                  <InputLabel>Languages</InputLabel>
                  <Select
                    multiple
                    value={campaignData.languages}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, languages: e.target.value as string[] }))}
                    renderValue={(selected) => (selected as string[]).join(', ')}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                  </Select>
                </FormControl>

                <Typography variant="body2" color="textSecondary">
                  Location targeting will be set to "All locations" by default. Advanced location targeting can be configured in Google Ads after campaign creation.
                </Typography>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <Typography variant="h5" className="text-gray-900 mb-4">Budget</Typography>
                
                <TextField
                  fullWidth
                  type="number"
                  label="Daily Budget ($)"
                  value={campaignData.budgetDaily}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, budgetDaily: parseFloat(e.target.value) || 0 }))}
                  inputProps={{ min: 1, step: 1 }}
                />

                <Typography variant="body2" color="textSecondary">
                  Minimum daily budget is $1. Google Ads will automatically adjust your spend to stay within your monthly budget limit.
                </Typography>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <Typography variant="h5" className="text-gray-900 mb-4">Generate Ad Copy</Typography>
                
                <div className="text-center">
                  <Typography variant="body1" className="mb-4">
                    Ready to generate AI-powered ad copy for your {campaignData.type.toLowerCase()} campaign?
                  </Typography>
                  
                  <Button
                    variant="contained"
                    size="large"
                    onClick={generateAdCopy}
                    disabled={loading || !campaignData.keywords.length}
                    startIcon={loading ? <LoadingDots color="white" style="small" /> : null}
                  >
                    {loading ? 'Generating...' : 'Generate Ad Copy'}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <Typography variant="h5" className="text-gray-900 mb-4">Review & Launch</Typography>
                
                {generatedCopy ? (
                  <div className="space-y-4">
                    <div>
                      <Typography variant="h6">Headlines:</Typography>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {generatedCopy.headlines.map((headline: string, index: number) => (
                          <Chip key={index} label={headline} variant="outlined" />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Typography variant="h6">Descriptions:</Typography>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {generatedCopy.descriptions.map((desc: string, index: number) => (
                          <Chip key={index} label={desc} variant="outlined" />
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <Typography variant="h6" className="mb-2">Campaign Summary:</Typography>
                      <Typography variant="body2">
                        <strong>Type:</strong> {campaignData.type}<br/>
                        <strong>Brand:</strong> {campaignData.brand}<br/>
                        <strong>URL:</strong> {campaignData.url}<br/>
                        <strong>Keywords:</strong> {campaignData.keywords.length}<br/>
                        <strong>Daily Budget:</strong> ${campaignData.budgetDaily}
                      </Typography>
                    </div>

                    <div className="text-center">
                      <Button
                        variant="contained"
                        size="large"
                        onClick={createCampaign}
                        disabled={loading}
                        startIcon={loading ? <LoadingDots color="white" style="small" /> : null}
                      >
                        {loading ? 'Creating Campaign...' : 'Create Campaign'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Typography variant="body1" color="textSecondary">
                    Please generate ad copy first in the previous step.
                  </Typography>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                Previous
              </Button>

              {currentStep < 4 && (
                <Button
                  endIcon={<ArrowForwardIcon />}
                  onClick={nextStep}
                  variant="contained"
                  disabled={
                    (currentStep === 0 && (!campaignData.brand || !campaignData.url)) ||
                    (currentStep === 1 && campaignData.keywords.length === 0)
                  }
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdsPage;
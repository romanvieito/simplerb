import React, { useState, useRef, useContext, useEffect, useCallback } from 'react';
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useRouter } from 'next/router';
import { useUser } from "@clerk/nextjs";
import { Button, Box } from "@mui/material";
import DiamondIcon from '@mui/icons-material/Diamond';
import LoginIcon from '@mui/icons-material/Login';
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";
import mixpanel from "../utils/mixpanel-config";

const EmailPage = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, user, isSignedIn } = useUser();
  const [emailContent, setEmailContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);

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

  const sendInformationToBackend = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: emailContent,
          audience: targetAudience 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Email campaign created with ID:', data.campaignId);
        setEmailContent('');
        setTargetAudience('');
        
        toast(
          `Campaign #${data.campaignId} created! We'll craft your email content and notify you when it's ready.`,
          {
            icon: "✉️",
            duration: 6000,
            style: {
              border: "1px solid #000",
              padding: "16px",
              color: "#000",
            },
          }
        );
      } else {
        console.error('Failed to save email information');
        toast.error(data.error || 'Failed to create email campaign. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Email Marketing Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hidden form for checkout */}
      <form action="/api/checkout_sessions" method="POST" style={{ display: 'none' }}>
        <input type="hidden" name="tipo" value="STARTER" />
      </form>

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{ duration: 5000 }}
      />

      {/* <Header/> */}
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        <div className="absolute top-4 left-4 flex items-center space-x-3">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-gray-800 font-semibold text-lg">simplerB</span>
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
            <button className="px-3 py-1 bg-white rounded-md text-sm font-medium text-gray-800 shadow-sm">
              Email
            </button>
            <button 
              onClick={() => router.push('/ads')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Ads
            </button>
          </div>
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
          Email <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Generator</span>
        </h1>
        {/* Main Input Area - Mockup Style */}
        <div className="w-full max-w-4xl mx-auto mt-8">
          <form onSubmit={(e) => { e.preventDefault(); sendInformationToBackend(); }} className="space-y-6">
            {/* Integrated Input Area with Action Bar */}
            <div className="relative bg-white rounded-2xl border-2 border-gray-200 shadow-sm focus-within:border-blue-500 focus-within:ring-blue-500 transition-all duration-300">
              <div className="p-6 pb-20">
                {/* Target Audience */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                  <textarea
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border-2 border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 text-gray-700 resize-none transition-all duration-300"
                    placeholder="e.g., Tech enthusiasts aged 25-34 interested in software development"
                  />
                </div>

                {/* Email Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Content Brief</label>
                  <textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border-2 border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 text-gray-700 resize-none transition-all duration-300"
                    placeholder="Describe what you want to communicate in your email (e.g., Announcing a new course launch with early bird pricing)"
                  />
                </div>
              </div>
              
              {/* Integrated Action Bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gray-50 rounded-b-2xl p-4 border-t border-gray-100">
                <div className="flex items-center space-x-3">
                  {/* <button
                    type="button"
                    className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <span className="text-gray-600 text-sm">+</span>
                    <span className="text-gray-800 font-medium text-sm">Settings</span>
                  </button> */}
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={loading || !targetAudience.trim() || !emailContent.trim()}
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? (
                      <>
                        <LoadingDots color="white" style="small" />
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612l-3.96 4.158a.75.75 0 11-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158v10.638A.75.75 0 0110 17z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EmailPage;
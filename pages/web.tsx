import React, { useState, useContext, useRef, useEffect, useCallback } from "react";
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import Header from "../components/Header";
import mixpanel from "../utils/mixpanel-config";
import Image from "next/image";
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";
import { useClerk, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Dialog from '@mui/material/Dialog';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import DiamondIcon from '@mui/icons-material/Diamond';
import LoginIcon from '@mui/icons-material/Login';
import { useRouter } from 'next/router';
import DOMPurify from 'dompurify';
import { useUser } from "@clerk/nextjs";
import { Button, Box } from "@mui/material";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Add type for subscription plan
type SubscriptionPlan = 'CREATOR' | 'STARTER' | 'FREE';

const WebPage = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, user, isSignedIn } = useUser();
  const [loading, setLoading] = useState(false);
  const [textDescription, setTextDescription] = useState("");
  const [generatedSite, setGeneratedSite] = useState("");
  const [openWebSite, setOpenWebSite] = React.useState(false);
  const [previewViewport, setPreviewViewport] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // Use the same isPremiumUser logic as in domain.tsx
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

  // Auto-generate website when domain and description are provided via URL params
  useEffect(() => {
    const { domain, description, autoGenerate } = router.query;
    
    if (domain && description && autoGenerate === 'true' && isLoaded && isSignedIn && isPremiumUser) {
      setTextDescription(description as string);
      // Show a toast to inform user about auto-generation
      toast.success(`Generating website for ${domain}...`);
      // Small delay to ensure the form is ready
      setTimeout(() => {
        generateWeb({ preventDefault: () => {} });
      }, 500);
    } else if (domain && description && autoGenerate === 'true' && isLoaded && (!isSignedIn || !isPremiumUser)) {
      // If user is not signed in or not premium, show appropriate message
      setTextDescription(description as string);
      if (!isSignedIn) {
        toast.error("Please sign in to generate websites");
      } else if (!isPremiumUser) {
        toast.error("Premium subscription required to generate websites");
      }
    }
  }, [router.query, isLoaded, isSignedIn, isPremiumUser]);

  const getImageFromPexels = async (query: string) => {
    try {
      const response = await fetch(`/api/pexels?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch image from Pexels');
      }
      const data = await response.json();
      if (data.photos && data.photos.length > 0) {
        const photo = data.photos[0];
        return {
          url: photo.src.large,
          alt: photo.alt,
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching image from Pexels:', error);
      return null;
    }
  };

  const generateWeb = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isPremiumUser) {
        toast((t) => (
          <div className="flex flex-col items-center p-4">
            <div className="flex items-center mb-4">
              <DiamondIcon className="text-black mr-2" sx={{ fontSize: "1.5rem" }} />
              <h3 className="text-xl font-bold">Premium Feature</h3>
            </div>
            <p className="mb-4 text-gray-600 text-center">
              Create your website instantly!<br/>
              <span className="text-sm">Plus get access to all premium features.</span>
            </p>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  mixpanel.track("Become a Member Click", {
                    source: "Create Website",
                  });
                  const form = document.querySelector('form[action="/api/checkout_sessions"]');
                  if (form instanceof HTMLFormElement) {
                    form.submit();
                  }
                }}
                className="bg-black text-white font-medium px-6 py-2.5 rounded-xl hover:bg-black/80 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <DiamondIcon className="mr-2" />
                Become a Member
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="bg-gray-100 text-gray-600 font-medium px-6 py-2.5 rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                Maybe Later
              </button>
            </div>
          </div>
        ), {
          duration: 15000,
          position: 'top-center',
        });
        mixpanel.track("Free user try Create Website", {
          textDescription: textDescription,
        });
        setLoading(false);
        return;
      }

      /*
       * Website Generation Process - Two-Step Approach
       * 
       * Step 1: Design Planning (/api/anthropic)
       * - Generates the overall design structure and image requirements
       * - Returns a JSON structure with design specifications
       * - Uses fewer tokens (1000) for faster response
       * - Includes: reference website, design style, layout sections, and image queries
       */
      const designerPrompt = `Design minimal website for: ${textDescription}
      Return raw JSON without any markdown formatting or code blocks. Start with opening brace and end with closing brace:
      {
        "reference_website": "URL",
        "design_style": "5-word style description",
        "layout_sections": ["simple informative hero, features and pick just one more section"],
        "images": [
          {
            "type": "hero",
            "search_query": "2-3 word query",
            "alt_text": "3-word alt text"
          },
          {
            "type": "feature1",
            "search_query": "2-3 word query",
            "alt_text": "2-word alt text"
          },
          {
            "type": "feature2",
            "search_query": "2-3 word query",
            "alt_text": "2-word alt text"
          },
          {
            "type": "feature3",
            "search_query": "2-3 word query",
            "alt_text": "2-word alt text"
          }
        ]
      }`;

      // First API call - Design Planning
      const designerResponse = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: designerPrompt,
          max_tokens: 1000
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout for design phase
      });

      if (!designerResponse.ok) {
        throw new Error(`Designer API error: ${designerResponse.statusText}`);
      }

      const designerResult = await designerResponse.json();
      
      if (!designerResult?.data?.content?.[0]?.text) {
        throw new Error("Invalid designer response structure");
      }

      interface DesignImage {
        type: string;
        search_query: string;
        description: string;
        alt_text: string;
      }

      interface DesignPlan {
        reference_website: string;
        design_style: string;
        layout_sections: string[];
        images: DesignImage[];
      }

      // Parse the designer's JSON response
      let designPlan: DesignPlan;
      try {
        // Clean up the response by removing any markdown formatting
        const cleanJson = designerResult.data.content[0].text
          .replace(/^```json\s*/, '') // Remove opening ```json
          .replace(/```\s*$/, '')     // Remove closing ```
          .trim();                    // Remove any extra whitespace
        
        designPlan = JSON.parse(cleanJson) as DesignPlan;
      } catch (error) {
        console.error("JSON parsing error:", error);
        console.log("Raw response:", designerResult.data.content[0].text);
        throw new Error("Failed to parse design plan. Please try again.");
      }

      // Validate required properties
      if (!designPlan.images) {
        throw new Error("Designer response missing required properties");
      }

      // Fetch all images based on the designer's specifications
      const images = await Promise.all(
        designPlan.images.map(async (image: DesignImage) => {
          const pexelsResult = await getImageFromPexels(image.search_query);
          return {
            ...image,
            pexels: pexelsResult
          };
        })
      );

      /*
       * Step 2: Website Development (/api/anthropic-developer)
       * - Separate endpoint to handle the more complex HTML generation
       * - Takes the design plan and generates the actual website code
       * - Uses a dedicated endpoint to avoid timeout issues
       * - Processes: HTML structure, styling, and image integration
       * 
       * Note: Split into two endpoints because:
       * 1. HTML generation takes longer and needs more tokens
       * 2. Prevents timeout issues in serverless functions
       * 3. Better error handling for each step
       */
      const developerPrompt = `Create a minimal landing page.
      Ref: ${designPlan.reference_website}
      Style: ${designPlan.design_style}
      Sections: ${designPlan.layout_sections?.join(', ')}
      
      Images:
      ${images.map(img => `${img.type}: ${img.pexels?.url || 'https://via.placeholder.com/1920x1080'}`).join('\n')}

      Requirements:
      1. Single page only (no navigation)
      2. Mobile-first design
      
      Please return only the code, nothing else.`;

      // Second API call - Website Development
      const developerResponse = await fetch("/api/anthropic-developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: developerPrompt
        })
      });

      if (!developerResponse.ok) {
        throw new Error(`Developer API error: ${developerResponse.statusText}`);
      }

      const developerResult = await developerResponse.json();
      
      if (!developerResult?.data?.content?.[0]?.text) {
        throw new Error("Invalid developer response structure");
      }

      let finalWebsite = developerResult.data.content[0].text;

      // Sanitize the HTML before setting it
      const sanitizedWebsite = DOMPurify.sanitize(finalWebsite);

      if (process.env.NODE_ENV !== 'production') {
        console.log("Sanitized website:", sanitizedWebsite);
      }

      // Clean up any remaining markdown formatting
      const cleanedWebsite = sanitizedWebsite
        .replace(/^```html\n/, '')  // Remove opening ```html
        .replace(/```$/, '');       // Remove closing ```

      setGeneratedSite(cleanedWebsite);
      setOpenWebSite(true);

      mixpanel.track("Web Generated", {
        textDescription: textDescription,
        referenceWebsite: designPlan.reference_website
      });
    } catch (error) {
      console.error("Error generating website:", error);
      let errorMessage = "Failed to generate website. Please try again.";
      
      // Check for token limit errors
      if (error instanceof Error) {
        if (error.message.includes('token') || error.message.includes('capacity')) {
          errorMessage = "Text is too long. Please provide a shorter description.";
        }
        // Check for timeout errors
        else if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          errorMessage = "The request took too long. Please try again with a simpler description.";
        }
        // Check for other common API errors
        else if (error.message.includes('rate limit')) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getViewportWidth = () => {
    switch (previewViewport) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
    }
  };

  const handleIframeLoad = () => {
    setPreviewLoading(false);
    
    const iframeDoc = iframeRef.current?.contentDocument;
    if (iframeDoc) {
      // Only add link prevention if NOT in edit mode
      if (!isEditMode) {
        iframeDoc.body.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const link = target.closest('a');
          
          if (link) {
            toast.success("Links are disabled in preview mode, but they'll work on the live site!");
            e.preventDefault();
            e.stopPropagation();
          }
        }, true);

        const links = iframeDoc.getElementsByTagName('a');
        Array.from(links).forEach(link => {
          link.style.cursor = 'not-allowed';
          link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toast.success("Links are disabled in preview mode, but they'll work on the live site!");
          }, true);
        });
      }
    }
  };

  const downloadPreview = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedSite], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = `website-${Date.now()}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    mixpanel.track("Download Web Preview", {
      textDescription: textDescription,
      viewport: previewViewport
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedSite);
    toast.success("Code copied to clipboard!");
    mixpanel.track("Copy Web Code", {
      textDescription: textDescription
    });
  };

  const publishSite = async () => {
    if (!generatedSite) {
      toast.error('Please generate a site first');
      return;
    }

    if (!isSignedIn) {
      toast.error('Please sign in to publish your site');
      return;
    }

    if (!dataUser?.id) {
      console.error('No user ID available:', dataUser);
      toast.error('User data not loaded. Please refresh the page.');
      return;
    }

    setIsPublishing(true);
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Publishing site with data:', {
          contentLength: generatedSite.length,
          contentSnippet: generatedSite.substring(0, 200), // Log first 200 chars
          title: textDescription,
          userId: dataUser.id
        });
      }

      // Ensure generatedSite looks like HTML
      if (!generatedSite || !generatedSite.trim().startsWith('<')) {
          console.error('Error: generatedSite does not look like HTML before publishing:', generatedSite);
          toast.error('Internal error: Invalid site content before publishing.');
          setIsPublishing(false);
          return;
      }

      const response = await fetch('/api/publish-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generatedSite,
          title: textDescription || 'Untitled',
          userId: dataUser.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Publish failed:', data);
        throw new Error(data.error || data.details || 'Failed to publish site');
      }

      setPublishedUrl(data.url);
      
      toast.success('Site published successfully!');
      mixpanel.track('Site Published', {
        userId: dataUser.id,
        siteUrl: data.url
      });
    } catch (error) {
      console.error('Error publishing site:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish site');
    } finally {
      setIsPublishing(false);
    }
  };

  const PreviewToolbar = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setOpenWebSite(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Close</span>
          </button>
          <div className="border-l border-gray-200 pl-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewViewport('desktop')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  previewViewport === 'desktop'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Desktop</span>
              </button>
              <button
                onClick={() => setPreviewViewport('tablet')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  previewViewport === 'tablet'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Tablet</span>
              </button>
              <button
                onClick={() => setPreviewViewport('mobile')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  previewViewport === 'mobile'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Mobile</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
              isEditMode 
                ? 'bg-green-600 text-white shadow-md hover:bg-green-700' 
                : 'bg-gray-800 text-white hover:bg-gray-900'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>{isEditMode ? 'Save Changes' : 'Edit'}</span>
          </button>

          <button
            onClick={publishSite}
            disabled={isPublishing}
            className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
              isPublishing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="px-2 py-2 text-black rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {isMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200">
                <button
                  onClick={() => {
                    downloadPreview();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2 rounded-t-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    copyCode();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2 rounded-b-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copy Code</span>
                </button>
              </div>
            )}
          </div>

          {publishedUrl && (
            <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>View Live Site</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Modify useEffect to handle edit mode
  useEffect(() => {
    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc) return;

    // Function to make elements editable or non-editable
    const toggleEditMode = (editable: boolean) => {
      // Include 'a' in the selector for links
      const textElements = iframeDoc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a');
      
      textElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        htmlElement.contentEditable = editable.toString();
        
        if (editable) {
          htmlElement.style.cursor = 'text';
          htmlElement.style.outline = '1px dashed #ddd';
          
          // For links, prevent default behavior while in edit mode
          if (htmlElement.tagName.toLowerCase() === 'a') {
            htmlElement.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
            });
          }
        } else {
          htmlElement.style.cursor = '';
          htmlElement.style.outline = '';
          
          // Restore link behavior when exiting edit mode
          if (htmlElement.tagName.toLowerCase() === 'a') {
            htmlElement.style.cursor = 'not-allowed'; // Maintain the preview mode behavior for links
          }
        }
      });

      // Save changes when exiting edit mode
      if (!editable) {
        setGeneratedSite(iframeDoc.documentElement.outerHTML);
      }
    };

    toggleEditMode(isEditMode);

    // Show toast message when entering/exiting edit mode
    if (isEditMode) {
      toast.success("Edit mode enabled. Click elements to edit text.");
    } else if (generatedSite) {
      toast.success("Changes saved!");
    }
  }, [isEditMode]);

  return (
    <div className="flex max-w-6xl mx-auto flex-col items-center justify-center py-4 min-h-screen bg-white">
      <Toaster position="top-center" />
      <Head>
        <title>Website Creator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Add this form */}
      <form action="/api/checkout_sessions" method="POST" style={{ display: 'none' }}>
        <input type="hidden" name="tipo" value="STARTER" />
      </form>

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
            <button className="px-3 py-1 bg-white rounded-md text-sm font-medium text-gray-800 shadow-sm">
              Website
            </button>
            <button 
              onClick={() => router.push('/email')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
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
          Website <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Creator</span>
        </h1>

        {/* Main Input Area - Mockup Style */}
        <div className="w-full max-w-4xl mx-auto mt-8">
          <form onSubmit={generateWeb} className="space-y-6">
            {/* Integrated Input Area with Action Bar */}
            <div className="relative bg-white rounded-2xl border-2 border-gray-200 shadow-sm focus-within:border-blue-500 focus-within:ring-blue-500 transition-all duration-300">
              <textarea
                value={textDescription}
                onChange={(e) => setTextDescription(e.target.value)}
                maxLength={200}
                rows={4}
                className="w-full bg-transparent p-6 pb-20 text-gray-700 resize-none transition-all duration-300 text-lg placeholder-gray-400 rounded-2xl border-0 focus:outline-none focus:ring-0"
                placeholder="Describe your website... e.g. Modern coffee shop with industrial design, featuring specialty roasts and tasting events"
              />
              
              {/* Character Counter */}
              <div className="absolute top-4 right-4 text-sm text-gray-400">
                {textDescription.length}/200
              </div>
              
              {/* Integrated Action Bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gray-50 rounded-b-2xl p-4 border-t border-gray-100">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <span className="text-gray-600 text-sm">+</span>
                    <span className="text-gray-800 font-medium text-sm">Settings</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={loading || !textDescription.trim()}
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

        <div>
        <Dialog
          fullScreen
          open={openWebSite}
          onClose={() => setOpenWebSite(false)}
          TransitionComponent={Transition}
        >
          <PreviewToolbar />
          <div style={{
            marginTop: '60px',
            height: 'calc(100vh - 60px)',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem',
            overflow: 'auto'
          }}>
            <div style={{
              width: getViewportWidth(),
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.05)',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}>
              {previewLoading && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1
                }}>
                  <LoadingDots color="black" style="large" />
                </div>
              )}
                <iframe
                  ref={iframeRef}
                  srcDoc={generatedSite}
                  sandbox="allow-same-origin allow-scripts"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    opacity: previewLoading ? 0.5 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                  onLoad={handleIframeLoad}
                  title="Website Preview"
                />
            </div>
          </div>
        </Dialog>       
        </div>        
      </main>
    </div>
  );
};

export default WebPage;

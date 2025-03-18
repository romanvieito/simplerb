import React, { useState, useContext, useRef } from "react";
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import Header from "../components/Header";
import mixpanel from "../utils/mixpanel-config";
import Image from "next/image";
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import Dialog from '@mui/material/Dialog';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import DiamondIcon from '@mui/icons-material/Diamond';
import { useRouter } from 'next/router';
import DOMPurify from 'dompurify';

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
  const [loading, setLoading] = useState(false);
  const [textDescription, setTextDescription] = useState("");
  const [generatedSite, setGeneratedSite] = useState("");
  const [openWebSite, setOpenWebSite] = React.useState(false);
  const [previewViewport, setPreviewViewport] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { subsTplan } = context as { subsTplan: SubscriptionPlan };

  const generateWeb = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (subsTplan !== "CREATOR" && subsTplan !== "STARTER") {
        toast(
          "Premium plan required. Please become a member to generate websites.",
          {
            icon: "⏳",
            style: {
              border: "1px solid #FFA500",
              padding: "16px",
              color: "#FFA500",
            },  
            duration: 10000,
          }
        );
        mixpanel.track("Free user try Create Website", {
          textDescription: textDescription,
        });
        setLoading(false);
        return;
      }

      // Designer Agent - Optimized prompt with size constraints
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

      const designerResponse = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: designerPrompt,
          max_tokens: 1000 // Limit response size
        }),
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

      // Developer Agent - Optimized prompt with size constraints
      const developerPrompt = `Create a minimal landing page.
      Ref: ${designPlan.reference_website}
      Style: ${designPlan.design_style}
      Sections: ${designPlan.layout_sections?.join(', ')}
      
      Images:
      ${images.map(img => `${img.type}: ${img.pexels?.url || 'https://via.placeholder.com/1920x1080'}`).join('\n')}

      Requirements:
      1. Single page only
      2. Mobile-first design
      
      Please return only the code, nothing else.`;

      const developerResponse = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: developerPrompt,
          max_tokens: 4096 // Limit response size
        }),
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

      console.log("Sanitized website:", sanitizedWebsite);

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

  const handlePreviewLoad = () => {
    setPreviewLoading(false);
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

  const PreviewToolbar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      justifyContent: 'space-between',
      zIndex: 1000,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => setOpenWebSite(false)}
          className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-lg font-medium text-gray-900">
          {textDescription.length > 50 ? `${textDescription.substring(0, 50)}...` : textDescription}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Viewport Controls */}
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => setPreviewViewport('mobile')}
            className={`p-2 rounded ${previewViewport === 'mobile' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title="Mobile view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setPreviewViewport('tablet')}
            className={`p-2 rounded ${previewViewport === 'tablet' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title="Tablet view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm4 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setPreviewViewport('desktop')}
            className={`p-2 rounded ${previewViewport === 'desktop' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title="Desktop view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        <button
          onClick={copyCode}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Copy code"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
            <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </button>
        <button
          onClick={downloadPreview}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Download HTML"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Website Creator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 bg-gradient-to-b from-white to-gray-50">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 text-gray-600 hover:text-gray-900 font-medium py-2 px-4 rounded-lg inline-flex items-center transition-all duration-200 hover:bg-gray-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>

        <div className="flex justify-center items-center w-full max-w-xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Website <span className="text-black">Creator</span>
          </h1>
        </div>

        <div className="max-w-xl w-full mt-6">
          <div className="flex mb-4 items-center space-x-3 bg-white p-4 rounded-lg shadow-sm">
            <div className="bg-gray-100 rounded-full p-2">
              <Image
                src="/1-black.png"
                width={24}
                height={24}
                alt="1 icon"
                className="mb-0"
              />
            </div>
            <p className="text-left font-medium text-gray-800">Enter Your Website Description</p>
          </div>
          
          <textarea
            value={textDescription}
            onChange={(e) => setTextDescription(e.target.value)}
            maxLength={200}
            rows={4}
            className="w-full rounded-lg border-gray-200 shadow-sm focus:border-black focus:ring-black my-5 p-4 text-gray-700 resize-none transition-all duration-200"
            placeholder={"e.g., Modern coffee shop with industrial design, featuring specialty roasts and tasting events"}
          />
          <div className="text-right text-sm text-gray-500 mb-6">
            {textDescription.length}/200 characters
          </div>
          
          <SignedOut>  
            <button
              className="bg-black rounded-lg text-white font-medium px-6 py-3 sm:mt-6 mt-4 hover:bg-gray-900 w-full transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={() => openSignIn()}
            >
              Sign in to Create Website
            </button> 
          </SignedOut>
          <SignedIn>
          {!loading &&           
             <button
             className="bg-black text-white rounded-lg font-medium px-6 py-3 mt-2 hover:bg-gray-900 w-full transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
             onClick={generateWeb}
             disabled={loading}
           >
            <DiamondIcon className="mr-2" />
             Create Website
           </button>         
            }
            {loading && (
              <button
                className="bg-black rounded-lg text-white font-medium px-6 py-3 sm:mt-6 mt-4 w-full shadow-sm"
                disabled
              >
                <LoadingDots color="white" style="large" />
              </button>
            )}
          </SignedIn>
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
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    opacity: previewLoading ? 0.5 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                  onLoad={handlePreviewLoad}
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

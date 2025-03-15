import React, { useState, useRef } from 'react';
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from 'next/router';

const EmailPage = () => {
  const router = useRouter();
  const [emailContent, setEmailContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [loading, setLoading] = useState(false);

  const { openSignIn } = useClerk();

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

      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center"
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
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{ duration: 5000 }}
          />
          <h1 className="sm:text-2xl text-1xl max-w-[708px] font-bold text-slate-900">
            Create Your Email Campaign
          </h1>
          <div className="ml-auto w-8"></div>
        </div>
        <div className="max-w-xl w-full mt-6">
          <div className="flex mb-5 items-center space-x-3">
            <Image src="/1-black.png" width={30} height={30} alt="1 icon" />
            <p className="text-left font-medium">
              Define your target audience
            </p>
          </div>
          <textarea
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            rows={2}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder="e.g., Tech enthusiasts aged 25-34 interested in software development"
          />

          <div className="flex mb-5 items-center space-x-3">
            <Image src="/2-black.png" width={30} height={30} alt="2 icon" />
            <p className="text-left font-medium">Email content brief</p>
          </div>
          <textarea
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder="Describe what you want to communicate in your email (e.g., Announcing a new course launch with early bird pricing)"
          />

          <SignedOut>  
            <button
              className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={() => openSignIn()}
            >
              Sign Up
            </button> 
          </SignedOut>
          <SignedIn>        
            <button
              className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={sendInformationToBackend}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Email Campaign"}
            </button> 
          </SignedIn>                   
        </div>
      </main>
      <Footer/>      
    </div>
  );
};

export default EmailPage;
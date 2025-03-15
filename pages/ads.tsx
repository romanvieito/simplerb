import React, { useState, useRef } from 'react';
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from 'next/router';

const AdsPage = () => {
  const router = useRouter();
  const [adDescription, setAdDescription] = useState('');
  const [uploadedImage, setUploadedImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { openSignIn } = useClerk();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const sendInformationToBackend = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/save-ads-information', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: adDescription, image: uploadedImage }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Ad created with ID:', data.adId);
        setAdDescription('');
        setUploadedImage('');
        
        toast(
          `Ad #${data.adId} created! We'll craft your ad content and notify you when it's ready.`,
          {
            icon: "🎯",
            duration: 6000,
            style: {
              border: "1px solid #000",
              padding: "16px",
              color: "#000",
            },
          }
        );
      } else {
        console.error('Failed to save ad information');
        toast.error(data.error || 'Failed to create ad. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Ad Generator</title>
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
            Generate Your Google Ads
          </h1>
          <div className="ml-auto w-8"></div> {/* This empty div balances the layout */}
        </div>
        <div className="max-w-xl w-full mt-6">
          <div className="flex mb-5 items-center space-x-3">
            <Image src="/1-black.png" width={30} height={30} alt="1 icon" />
            <p className="text-left font-medium">
              Describe your ad campaign
            </p>
          </div>
          <textarea
            value={adDescription}
            onChange={(e) => setAdDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder="e.g., Summer sale for outdoor furniture, 20% off all items"
          />

          <div className="flex mb-5 items-center space-x-3">
            <Image src="/2-black.png" width={30} height={30} alt="2 icon" />
            <p className="text-left font-medium">Upload an image (optional)</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            className="bg-gray-200 rounded-md text-black font-medium px-4 py-2 hover:bg-gray-300"
            onClick={triggerFileInput}
          >
            {uploadedImage ? "Change image" : "Choose image"}
          </button>
          
          {uploadedImage && (
            <div className="mt-4">
              <Image src={uploadedImage} alt="Uploaded image" width={200} height={200} objectFit="contain" />
            </div>
          )}

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
              disabled={loading || isUploading}
            >
              {loading ? "Generating..." : "Generate Ad"}
            </button> 
          </SignedIn>                   
        </div>
      </main>
      <Footer/>      
    </div>
  );
};

export default AdsPage;
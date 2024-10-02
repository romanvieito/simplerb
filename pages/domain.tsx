import React, { useState, useContext, useEffect } from "react";
import Head from "next/head";
import { toast, Toaster } from "react-hot-toast";
import { DomainInfo, VibeType } from "../utils/Definitions";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import mixpanel from "../utils/mixpanel-config";
import { useRouter } from "next/router";
import { useClerk, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Button, Box } from "@mui/material";
import DiamondIcon from '@mui/icons-material/Diamond';
import SBRContext from "../context/SBRContext";

const DomainPage: React.FC = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, user, isSignedIn } = useUser();
  const [loading, setLoading] = useState(false);
  const [businessDescription, setBusinessDescription] = useState("");
  const [vibe, setVibe] = useState<VibeType>("Professional");
  const [generatedDomains, setGeneratedDomains] = useState<DomainInfo[]>([]);
  const [currentDomain, setCurrentDomain] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [filteredDomains, setFilteredDomains] = useState<DomainInfo[]>([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7); // Default value of 0.7

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error('SBRContext must be used within a SBRProvider');
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

  // Function to fetch user data by email
  const fetchUserData = async (email: string) => {
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
  };

  // Function to initialize page data
  const initPageData = async () => {
    if (isLoaded && user) {
      const email = user.emailAddresses[0].emailAddress;
      if (email) {
        try {
          await fetchUserData(email);
          mixpanel.identify(email);
        } catch (error) {
          console.error("Error initializing page data:", error);
          console.warn("Failed to load user data. Please try refreshing the page.");
        }
      } else {
        console.warn("User email not available");
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
  };

  useEffect(() => {
    initPageData();
  }, [isSignedIn, user]);

  useEffect(() => {
    if (availableOnly && isPremiumUser && !availabilityChecked && generatedDomains.length > 0) {
      checkAvailability();
      setAvailabilityChecked(true);
    } else {
      setFilteredDomains(generatedDomains);
    }
  }, [generatedDomains, isPremiumUser]);

  const checkAvailability = async () => {
    try {

      // Assuming 'generatedDomains' is an array of your domain objects
      const domainsToCheck = generatedDomains.map((domainInfo) => domainInfo.domain);
  
      if (process.env.NODE_ENV === 'development') {
      // Mock data for local development
      const mockAvailabilityResults = generatedDomains.map((domainInfo) => ({
        domain: domainInfo.domain,
        available: Math.random() < 0.7, // 70% chance of being available
      }));

      setGeneratedDomains(mockAvailabilityResults);
      setFilteredDomains(mockAvailabilityResults.filter((domain) => domain.available));
      return;
    }

      const response = await fetch('/api/check-availability-godaddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: domainsToCheck }),
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
  
      const availabilityResults = await response.json();
  
      // Map the availability results back to your generatedDomains
      const updatedDomains = generatedDomains.map((domainInfo) => {
        const availabilityInfo = availabilityResults.find(
          (result) => result.domain === domainInfo.domain
        );
        return {
          ...domainInfo,
          available: availabilityInfo ? availabilityInfo.available : undefined,
        };
      });
  
      // Update your state with the new domain information
      setGeneratedDomains(updatedDomains);
    } catch (error) {
      console.error('Error checking domain availability:', error);
    }
  };

  const generateDomains = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedDomains([]);
    setAvailabilityChecked(false);

    let generatedResults: DomainInfo[] = [];

    try {
      const prompt = `
        Role: You are Seth Godin.
        Objective: Generate 5 memorable, brief, and simple domain names based on the following input:
        Client's input: ${businessDescription}
        Vibe: ${vibe}
        
        Good Examples:
        - Apple.com: Easy to spell and pronounce.
        - JetBlue.com: Descriptive and easy to remember.
        - Amazon.com: Short, memorable, and now synonymous with online shopping.

        Bad Examples:
        - Axelon.com: Sounds like a common English word but isn't, leading to potential confusion.
        - Altus.com: Lacks immediate brandability.
        - Prius.com: Pronunciation challenges may hinder global brand recall.
        
        Return only the domain names, one per line.
      `;

      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ptemp: temperature, ptop: 1 }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = response.body;
      if (!data) return;

      const reader = data.getReader();
      const decoder = new TextDecoder();
      const parser = createParser(onParse);
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        parser.feed(chunkValue);
      }

      // After parsing is complete, get the final results
      generatedResults = generatedDomains;

    } catch (error) {
      console.error("An error occurred:", error);
      toast.error("An error occurred while generating domains. Please try again.");
    } finally {
      setLoading(false);
      
      // Track the event with the final results
      mixpanel.track("Generated Domains", {
        businessDescription,
        vibe,
        availableOnly,
        userId: dataUser?.id || "anonymous",
        results: generatedResults.map(domain => domain.domain),
      });
    }
  };

  const onParse = (event: ParsedEvent | ReconnectInterval) => {
    if (event.type === "event") {
      try {
        const text = JSON.parse(event.data).text ?? "";
        setCurrentDomain(prev => {
          const updatedDomain = prev + text;
          if (updatedDomain.includes("\n")) {
            const domains = updatedDomain.split("\n")
              .map(domain => domain.trim().replace(/^\d+\.\s*/, ""))
              .filter(domain => domain !== "")
              .flatMap(domain => domain.split(/\s+/));
            setGeneratedDomains(prev => [
              ...prev,
              ...domains.map(domain => ({ domain, available: undefined, favorite: false }))
            ]);
            return "";
          }
          return updatedDomain;
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCheckAvailability = (domain: string) => {
    const cleanDomainName = domain.replace(/^\d+\.\s*/, "");
    const namecheapUrl = `https://www.namecheap.com/domains/registration/results/?domain=${cleanDomainName}`;
    window.open(namecheapUrl, "_blank");

    mixpanel.track("Check Domain Availability", {
      domain: cleanDomainName,
      source: "domain-page",
    });

    toast.success(`Checking availability for ${cleanDomainName}`, {
      duration: 3000,
    });
  };

  const handleSubsStarterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    mixpanel.track("Become a Member Click", {
      plan_subscription: 'STARTER',
    });  
    window.gtag && window.gtag('event', 'conversion', {
      'send_to': '16510475658/ZCyECJS9tqYZEIq758A9',
    });

    const form = event.currentTarget.form;
    if (form) {
      form.submit();
    } else {
      console.error("Form not found");
    }
  };

  const handleAvailableOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Track the change in the "Available only" checkbox
    mixpanel.track("Available Only Checkbox Changed", {
      checked: e.target.checked,
      isPremiumUser: isPremiumUser
    });
    if (isPremiumUser) {
      setAvailableOnly(e.target.checked);
    } else {
    toast((t) => (
      <div className="flex flex-col items-center">
        <p className="mb-2">Premium feature. Please become a member.</p>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              mixpanel.track("Become a Member Click", {
                source: "Available Only Checkbox",
              });
              const form = document.querySelector('form[action="/api/checkout_sessions"]');
              if (form instanceof HTMLFormElement) {
                form.submit();
              }
            }}
            className="bg-black text-white font-medium px-4 py-2 rounded-xl hover:bg-black/80 flex items-center"
          >
            <DiamondIcon className="mr-2" />
            Become a Member
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-300 text-black font-medium px-4 py-2 rounded-xl hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    ), {
      duration: 15000,
      position: 'top-center',
    });
      
    }
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
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

        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Domain Generator
        </h1>

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
          <SignedIn>
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
                onClick={handleSubsStarterClick}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <DiamondIcon sx={{ mr: 0.2, fontSize: "1rem" }} />
                  Become a Member
                </Box>
              </Button>
            </form>
            <UserButton userProfileUrl="/user" afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Button
              onClick={() => openSignIn()}
              className="bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 hover:bg-black/80"
            >
              Sign in / up
            </Button>
          </SignedOut>
        </Box>

        <SignedIn>
          {/* Show this content when the user is signed in */}
          <form onSubmit={generateDomains} className="max-w-xl w-full">
            <div className="flex mt-10 items-center space-x-3">
              <p className="text-left font-medium">
                Describe your business or idea
              </p>
            </div>
            <textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
              placeholder="e.g. Boutique Coffee Shop"
            />

            <div className="flex mb-5 items-center space-x-3">
              <p className="text-left font-medium">Select the vibe</p>
            </div>
            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value as VibeType)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            >
              <option value="Professional">Professional</option>
              <option value="Friendly">Friendly</option>
              <option value="Creative">Creative</option>
              <option value="Sophisticated">Sophisticated</option>
            </select>

            <div className="flex items-center mt-6">
              <div className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={availableOnly}
                  onChange={handleAvailableOnlyChange}
                />
                <label
                  className={`text-left font-medium ${
                    !isPremiumUser ? "text-gray-400" : ""
                  }`}
                >
                  Available only
                </label>
                <DiamondIcon sx={{ fontSize: "1rem", color: "gold" }} />
              </div>
              <div className="flex justify-end ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedSettings(true);
                    mixpanel.track("Advanced Settings Opened", {
                      userId: dataUser?.id || "anonymous"
                    });
                  }}
                  className="text-sm text-gray-600 hover:text-black focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 inline-block mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </div>
            </div>

            {showAdvancedSettings && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <div className="mt-3 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Advanced Settings
                    </h3>
                    <div className="mt-2 px-7 py-3">
                      <div className="mb-4">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="temperature"
                        >
                          Temperature: {temperature}
                        </label>
                        <input
                          type="range"
                          id="temperature"
                          name="temperature"
                          min="0"
                          max="1"
                          step="0.1"
                          value={temperature}
                          onChange={(e) =>
                            setTemperature(parseFloat(e.target.value))
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="items-center px-4 py-3">
                      <button
                        onClick={() => setShowAdvancedSettings(false)}
                        className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate domains"}
            </button>
          </form>

          <div className="space-y-8 mt-10">
            {generatedDomains.length > 0 && (
              <h2 className="sm:text-4xl text-3xl font-bold text-slate-900 mx-auto">
                {isPremiumUser ? "Available Domains:" : "Generated Domains:"}
              </h2>
            )}
            <ul className="space-y-4">
              {(availableOnly && isPremiumUser
                ? filteredDomains
                : generatedDomains
              ).map((domain, index) => (
                <li
                  key={index}
                  className="text-xl flex items-center justify-between"
                >
                  <span>{domain.domain}</span>
                  {isPremiumUser && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          handleCheckAvailability(domain.domain);
                          mixpanel.track("Buy Domain Click", {
                            domain: domain.domain,
                            source: "domain-page",
                          });
                        }}
                        className="bg-black rounded-xl text-white font-medium px-4 py-2 mx-2 hover:bg-gray-300 hover:text-black"
                      >
                        <span className="flex items-center">Buy</span>
                      </button>
                      <button
                        onClick={() => {
                          window.open(
                            `/web?domain=${encodeURIComponent(domain.domain)}`,
                            "_blank"
                          );
                          mixpanel.track("Create Web Click", {
                            domain: domain.domain,
                            source: "domain-page",
                          });
                        }}
                        className="bg-green-600 rounded-xl text-white font-medium px-4 py-2 hover:bg-green-700"
                      >
                        Create Web
                      </button>
                      <button
                        onClick={() => {
                          window.open(
                            `/ads?domain=${encodeURIComponent(domain.domain)}`,
                            "_blank"
                          );
                          mixpanel.track("Create Ads Click", {
                            domain: domain.domain,
                            source: "domain-page",
                          });
                        }}
                        className="bg-purple-600 rounded-xl text-white font-medium px-4 py-2 hover:bg-purple-700"
                      >
                        Create Ads
                      </button>
                    </div>
                  )}
                  {!isPremiumUser ? (
                    <button
                      onClick={() => handleCheckAvailability(domain.domain)}
                      className="bg-blue-600 rounded-xl text-white font-medium px-4 py-2 mx-2 hover:bg-gray-300 hover:text-black"
                    >
                      <span className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Check Availability
                      </span>
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </SignedIn>

        <SignedOut>
          {/* Show this content when the user is signed out */}
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-5">
              Sign in to generate domains
            </h2>
            <button
              onClick={() => openSignIn()}
              className="bg-black rounded-xl text-white font-medium px-4 py-2 hover:bg-black/80"
            >
              Sign in
            </button>
          </div>
        </SignedOut>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{ duration: 2000 }}
        />
      </main>
    </div>
  );
};

export default DomainPage;
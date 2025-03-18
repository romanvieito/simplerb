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
import LoadingDots from "../components/LoadingDots";

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
  const [temperatureOption, setTemperatureOption] = useState("neutral");
  const [domainExtension, setDomainExtension] = useState('');

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
    let tempGeneratedDomains = "";

    try {
      const prompt = `
        Role: You are Seth Godin.
        Objective: Generate 5 memorable, brief, and simple domain names ${domainExtension !="" ? `(extension: ${domainExtension}) ` : ""}based on the following input:
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

      const temperatureMap = {
        imaginative: 0.9,
        neutral: 0.7,
        reliable: 0.5,
      };

      const temperature = temperatureMap[temperatureOption as keyof typeof temperatureMap];

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

      // Define onParse before using it
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          try {
            const text = JSON.parse(data).text ?? "";
            tempGeneratedDomains += text;
          } catch (e) {
            console.error(e);
          }
        }
      };

      const parser = createParser(onParse);
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        parser.feed(chunkValue);
      }

      // Process tempGeneratedDomains
      const tempDomainNamesText = tempGeneratedDomains
        .split("\n")
        .map((domain) => domain.replace(/^\d+\.\s*/, "").trim())
        .filter((domain) => domain !== "");

      // Build generatedResults
      generatedResults = tempDomainNamesText.map((domain) => ({
        domain,
        available: undefined,
        favorite: false,
      }));

      // Update state
      setGeneratedDomains(generatedResults);

      // Now track the event with the final results
      mixpanel.track("Generated Domains", {
        businessDescription,
        vibe,
        availableOnly,
        userId: dataUser?.id || "anonymous",
        results: generatedResults.map((domain) => domain.domain),
      });
    } catch (error) {
      console.error("An error occurred:", error);
      toast.error("An error occurred while generating domains. Please try again.");
    } finally {
      setLoading(false);
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

        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Domain <span className="text-black">Generator</span>
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
            <div className="flex items-center space-x-3 bg-white p-4">
              <div className="bg-black rounded-full p-2 w-8 h-8 flex items-center justify-center">
                <span className="text-lg font-bold text-white">1</span>
              </div>
              <p className="text-left font-medium text-gray-800">Describe your business or idea</p>
            </div>

            <textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border-gray-200 shadow-sm focus:border-black focus:ring-black my-5 p-4 text-gray-700 resize-none transition-all duration-200"
              placeholder="e.g. Boutique Coffee Shop"
            />

            <div className="flex items-center space-x-3 bg-white p-4">
              <div className="bg-black rounded-full p-2 w-8 h-8 flex items-center justify-center">
                <span className="text-lg font-bold text-white">2</span>
              </div>
              <p className="text-left font-medium text-gray-800">Select the vibe</p>
            </div>

            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value as VibeType)}
              className="w-full rounded-lg border-gray-200 shadow-sm focus:border-black focus:ring-black p-3 mb-6 transition-all duration-200"
            >
              <option value="Professional">Professional</option>
              <option value="Friendly">Friendly</option>
              <option value="Creative">Creative</option>
              <option value="Sophisticated">Sophisticated</option>
            </select>

            <div className="flex items-center justify-between bg-white p-4 mb-6">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black transition-all duration-200"
                  checked={availableOnly}
                  onChange={handleAvailableOnlyChange}
                />
                <label className={`text-left font-medium ${!isPremiumUser ? "text-gray-400" : "text-gray-800"}`}>
                  Available only
                </label>
                <DiamondIcon sx={{ fontSize: "1rem", color: "black" }} />
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedSettings(true)}
                className="text-gray-600 hover:text-black transition-all duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
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
                          htmlFor="temperatureOption"
                        >
                          Your domain names should be:
                        </label>
                        <div className="flex justify-between">
                          {["imaginative", "neutral", "reliable"].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setTemperatureOption(option);
                                mixpanel.track("Temperature Option Set", {
                                  userId: dataUser?.id || "anonymous",
                                  option: option
                                });
                              }}
                              className={`px-4 py-2 rounded-md ${
                                temperatureOption === option
                                  ? "bg-black text-white"
                                  : "bg-gray-200 text-gray-800"
                              } hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400`}
                            >
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center mb-3">
                      <label
                        className="block text-gray-700 text-sm font-bold mb-2 text-center"
                        htmlFor="domainExtension"
                      >
                        Extension:
                      </label>
                      <select
                        id="domainExtension"
                        value={domainExtension}
                        onChange={(e) => {
                          setDomainExtension(e.target.value);
                          mixpanel.track("Domain Extension Set", {
                            userId: dataUser?.id || "anonymous",
                            extension: e.target.value
                          });
                        }}
                        className="shadow appearance-none border rounded w-full max-w-[150px] py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      >
                        <option value="">--</option>
                        <option value=".com">.com</option>
                        <option value=".net">.net</option>
                        <option value=".org">.org</option>
                        <option value=".io">.io</option>
                        <option value=".ai">.ai</option>
                      </select>
                    </div>
                    
                    <div className="items-center px-4 py-3">
                      <button
                        onClick={() => setShowAdvancedSettings(false)}
                        className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              className="bg-black text-white rounded-lg font-medium px-6 py-3 w-full hover:bg-gray-900 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <LoadingDots color="white" style="large" />
              ) : (
                "Generate domains"
              )}
            </button>
          </form>

          <div className="space-y-8 mt-10">
            {generatedDomains.length > 0 && (
              <h2 className="text-3xl font-bold text-gray-900 mx-auto">
                {isPremiumUser ? "Available Domains:" : "Generated Domains:"}
              </h2>
            )}
            <ul className="space-y-4">
              {(availableOnly && isPremiumUser ? filteredDomains : generatedDomains).map((domain, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <span className="text-xl font-medium text-gray-800">{domain.domain}</span>
                  {isPremiumUser ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCheckAvailability(domain.domain)}
                        className="bg-black text-white rounded-lg px-4 py-2 hover:bg-gray-900 transition-all duration-200"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => {
                          window.open(`/web?domain=${encodeURIComponent(domain.domain)}`, "_blank");
                        }}
                        className="bg-black text-white rounded-lg px-4 py-2 hover:bg-gray-900 transition-all duration-200"
                      >
                        Create Web
                      </button>
                      <button
                        onClick={() => {
                          window.open(`/ads?domain=${encodeURIComponent(domain.domain)}`, "_blank");
                        }}
                        className="bg-black text-white rounded-lg px-4 py-2 hover:bg-gray-900 transition-all duration-200"
                      >
                        Create Ads
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckAvailability(domain.domain)}
                      className="bg-black text-white rounded-lg px-4 py-2 hover:bg-gray-900 transition-all duration-200 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                      Check Availability
                    </button>
                  )}
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
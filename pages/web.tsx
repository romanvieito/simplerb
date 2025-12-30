import React, { useState, useContext, useRef, useEffect, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
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
import { VibeType } from "../utils/Definitions";
import DomainPurchaseModal from "../components/DomainPurchaseModal";

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

const MIN_DESCRIPTION_LENGTH = 20;
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
  const [editingSite, setEditingSite] = useState<string | null>(null);
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [vibe, setVibe] = useState<VibeType>("Professional");
  const [audience, setAudience] = useState("");
  const [trustSignals, setTrustSignals] = useState("");
  const [leads, setLeads] = useState<Array<{ id: number; subdomain: string; name: string | null; email: string | null; message: string; created_at: string }>>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [isLeadsModalOpen, setIsLeadsModalOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [actionChipPos, setActionChipPos] = useState<{ top: number; left: number } | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [showDomainSuggestion, setShowDomainSuggestion] = useState(false);
  const [suggestedDomains, setSuggestedDomains] = useState<string[]>([]);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedDomainForPurchase, setSelectedDomainForPurchase] = useState("");
  const selectedElementRef = useRef<HTMLElement | null>(null);

  const toTitleCaseWord = (word: string): string =>
    word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word;

  const formatBrandFromDomain = (domain: string): string => {
    if (!domain) return '';
    const cleaned = domain
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .replace(/\.[a-z]{2,}$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (!cleaned) return '';
    return cleaned
      .split(/\s+/)
      .map(toTitleCaseWord)
      .join(' ');
  };

  const generateDomainSuggestions = (description: string): string[] => {
    const brandName = deriveBrandName(description);
    const cleanName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!cleanName || cleanName.length < 2) {
      return ['yourbrand', 'mybusiness', 'launchstudio'].map(name => `${name}.com`);
    }

    const suggestions = [
      `${cleanName}.com`,
      `${cleanName}pro.com`,
      `${cleanName}studio.com`,
      `${cleanName}hub.com`,
      `${cleanName}lab.com`
    ];

    return suggestions.slice(0, 3); // Return top 3 suggestions
  };

  const deriveBrandName = (description: string): string => {
    const fallback = 'Launch Studio';
    const cleaned = description
      .replace(/[\r\n]+/g, ' ')
      .replace(/[^a-zA-Z0-9\s&'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return fallback;

    const stopWords = new Set([
      'a',
      'an',
      'the',
      'my',
      'our',
      'your',
      'for',
      'and',
      'or',
      'with',
      'to',
      'of',
      'in',
      'site',
      'website',
      'business',
      'company',
      'brand',
      'agency',
      'store',
      'shop',
      'startup',
      'service',
      'services',
    ]);

    const words = cleaned.split(' ').filter(Boolean);
    const meaningful = words.filter((word) => !stopWords.has(word.toLowerCase()));
    const source = meaningful.length >= 2 ? meaningful : words;

    const brand = source
      .slice(0, 3)
      .map(toTitleCaseWord)
      .join(' ')
      .slice(0, 40)
      .trim();

    return brand.length >= 3 ? brand : fallback;
  };

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

  // Add function to load existing site for editing
  const loadSiteForEditing = useCallback(async (subdomain: string) => {
    if (!dataUser?.id) return;

    try {
      // Get the site content directly from the database
      const response = await fetch(`/api/get-site-content?subdomain=${subdomain}`, {
        headers: {
          'Authorization': `Bearer ${dataUser.id}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch site content');
      }

      const data = await response.json();
      
      if (data.success) {
        setGeneratedSite(data.html);
        setTextDescription(data.description);
        setEditingSite(subdomain);
        setCustomSubdomain(subdomain); // Set the current subdomain for editing
        setPublishedUrl(`https://${subdomain}.simplerb.com`);
        setOpenWebSite(true); // Open preview automatically when editing
        toast.success('Site loaded for editing');
      } else {
        toast.error('Site not found');
      }
    } catch (error) {
      console.error('Error loading site for editing:', error);
      toast.error('Failed to load site for editing');
    }
  }, [dataUser?.id]);

  // Add useEffect to load user data
  useEffect(() => {
    initPageData();
  }, [isSignedIn, user, initPageData]);

  // Fetch leads for signed-in user
  useEffect(() => {
    const loadLeads = async () => {
      if (!isSignedIn) return;
      setLeadsLoading(true);
      try {
        const resp = await fetch('/api/contact-leads');
        if (!resp.ok) {
          throw new Error('Failed to load leads');
        }
        const data = await resp.json();
        if (data?.success && Array.isArray(data.leads)) {
          setLeads(data.leads);
        }
      } catch (err) {
        console.error('Error loading leads', err);
      } finally {
        setLeadsLoading(false);
      }
    };
    loadLeads();
  }, [isSignedIn]);

  // Check for edit parameter in URL
  useEffect(() => {
    const { edit } = router.query;
    if (edit && typeof edit === 'string' && dataUser?.id) {
      loadSiteForEditing(edit);
    }
  }, [router.query, dataUser?.id, loadSiteForEditing]);

  // Auto-generate website when domain and description are provided via URL params
  useEffect(() => {
    const { domain, description, autoGenerate } = router.query;
    
    if (domain && description && autoGenerate === 'true' && isLoaded && isSignedIn && isPremiumUser) {
      setTextDescription(description as string);
      setSelectedDomain(domain as string);
      // Show a toast to inform user about auto-generation
      toast.success(`Generating website for ${domain}...`);
      // Small delay to ensure the form is ready
      setTimeout(() => {
        generateWeb({ preventDefault: () => {} });
      }, 500);
    } else if (domain && description && autoGenerate === 'true' && isLoaded && (!isSignedIn || !isPremiumUser)) {
      // If user is not signed in or not premium, show appropriate message
      setTextDescription(description as string);
      setSelectedDomain(domain as string);
      if (!isSignedIn) {
        toast.error("Please sign in to generate websites");
      } else if (!isPremiumUser) {
        toast.error("Premium subscription required to generate websites");
      }
    } else if (domain && isLoaded) {
      // Set domain from URL params even if not auto-generating
      setSelectedDomain(domain as string);
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
      const trimmedDescription = textDescription.trim();
      const trimmedAudience = audience.trim();
      const trimmedTrust = trustSignals.trim();
      if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
        toast.error(`Please provide at least ${MIN_DESCRIPTION_LENGTH} characters describing your site.`);
        setLoading(false);
        return;
      }

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
      const domainContext = selectedDomain ? ` for ${selectedDomain}` : "";
      const vibeContext = vibe !== "Professional" ? ` with a ${vibe.toLowerCase()} vibe` : "";
      const brandFromDomain = formatBrandFromDomain(selectedDomain);
      const brandName = brandFromDomain || deriveBrandName(trimmedDescription);
      
      const designerPrompt = `Design a single-page, mobile-first marketing site${domainContext}${vibeContext} for: ${trimmedDescription}
      Audience: ${trimmedAudience || 'General small business buyers; keep tone welcoming.'}
      Trust signals to use if provided: ${trimmedTrust || 'Use generic benefits and a simple satisfaction guarantee. Do not invent names, logos, or metrics.'}
      
      Return raw JSON only (no markdown, no code fences). Start with opening brace and end with closing brace:
      {
        "reference_website": "URL",
        "design_style": "5-word style description",
        "layout_sections": ["Hero with CTA", "3 feature highlights", "Offer or services", "Why choose us (generic benefits/guarantees)", "Simple contact/footer"],
        "color_palette": ["primary hex", "secondary hex", "accent hex"],
        "typography": "font pairing guidance",
        "cta": "short CTA text",
        "images": [
          {
            "type": "hero",
            "search_query": "2-3 word query",
            "alt_text": "3-word alt text describing the image"
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
          },
          {
            "type": "supporting",
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
        color_palette?: string[];
        typography?: string;
        cta?: string;
      }

      const validateDesignPlan = (plan: DesignPlan): { valid: boolean; error?: string } => {
        if (!plan || typeof plan !== 'object') return { valid: false, error: 'Design plan is missing.' };
        if (!plan.layout_sections || !Array.isArray(plan.layout_sections) || plan.layout_sections.length === 0) {
          return { valid: false, error: 'Design plan is missing layout sections.' };
        }
        if (!plan.images || !Array.isArray(plan.images) || plan.images.length === 0) {
          return { valid: false, error: 'Design plan is missing image guidance.' };
        }
        if (!plan.images.every(img => img?.type && img?.search_query)) {
          return { valid: false, error: 'Image entries require type and search query.' };
        }
        return { valid: true };
      };

      // Parse the designer's JSON response
      let designPlan: DesignPlan;
      try {
        // Clean up the response by removing any markdown formatting
        const cleanJson = designerResult.data.content[0].text
          .replace(/^```json\s*/, '') // Remove opening ```json
          .replace(/```\s*$/, '')     // Remove closing ```
          .replace(/^```\s*/, '')     // Remove generic ```
          .trim();                    // Remove any extra whitespace
        
        designPlan = JSON.parse(cleanJson) as DesignPlan;
      } catch (error) {
        console.error("JSON parsing error:", error);
        console.log("Raw response:", designerResult.data.content[0].text);
        throw new Error("Failed to parse design plan. Please try again.");
      }

      // Validate required properties
      const validationResult = validateDesignPlan(designPlan);
      if (!validationResult.valid) {
        throw new Error(validationResult.error || "Designer response missing required properties");
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
      const domainBranding = brandName
        ? `\n\nBranding: Use ${brandName} as the main brand/company name throughout the site.`
        : "";
      
      const developerPrompt = `Create a clean, single HTML landing page (no markdown, no code fences, no scripts).
      Brand name: ${brandName}.
      Reference: ${designPlan.reference_website}.
      Target audience: ${trimmedAudience || 'General small business buyers; keep it broadly appealing.'}
      Trust signals to include: ${trimmedTrust || 'Use generic benefits and a simple satisfaction guarantee; do not invent names, logos, or metrics.'}
      Style: ${designPlan.design_style}. Typography: ${designPlan.typography || 'system sans-serif'}.
      Palette: ${(designPlan.color_palette || ['#0f172a', '#2563eb', '#f43f5e']).join(', ')}.
      Sections (in this order): 
      1) Hero with H1 using the brand, a short subheadline, and a primary CTA button labeled "${designPlan.cta || 'Get Started'}" that links to #contact.
      2) 3 concise feature highlights with headings and one-line descriptions tailored to the audience.
      3) Services/offer section with bullets.
      4) "Why choose us" block with 3 short benefits; if trust signals provided, weave them in plainly. If none provided, use generic strengths and a simple guarantee without making up specifics.
      5) Secondary CTA + simple contact/footer.
      Contact: include a minimal contact section with id="contact" containing a form (name optional, email optional, message required) that posts to /api/contact-leads with method="POST" and includes a hidden subdomain field (if present). Avoid using href="#" anywhere; default CTA target should be #contact.
      Images (use <img> tags, include alt text, prefer Pexels URLs; use placeholders only if missing):
      ${images.map(img => `${img.type}: ${img.pexels?.url || 'https://via.placeholder.com/1920x1080'} (alt: ${img.alt_text || img.type})`).join('\n')}${domainBranding}

      Rules:
      - Never use placeholder brand names like "Your Business", "Company Name", or "Acme"; use ${brandName} consistently across headings, hero, and title.
      - Mobile-first responsive layout with max-width container, generous spacing, and readable line lengths.
      - Use semantic HTML5 (section, header, main, footer). Do not include nav menus.
      - Inline a <style> block with minimal, modern CSS; avoid external assets and heavy gradients.
      - Ensure contrast and accessible font sizes; buttons have hover/focus states.
      - Do not wrap output in markdown fences; return only the HTML document string.`;

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
        .replace(/^```html\n?/, '')  // Remove opening ```html
        .replace(/^```\n?/, '')      // Remove any generic opening fences
        .replace(/```$/, '')         // Remove closing ```
        .trim();

      if (!cleanedWebsite) {
        throw new Error("Generated site was empty. Please try again.");
      }

      // If the model omitted <html>/<body>, wrap it to keep the preview usable.
      const hasHtml = cleanedWebsite.toLowerCase().includes('<html');
      const hasBody = cleanedWebsite.toLowerCase().includes('<body');
      const safeTitle = brandName || selectedDomain || 'Landing Page';
      let finalHtml = hasHtml && hasBody
        ? cleanedWebsite
        : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safeTitle}</title></head><body>${cleanedWebsite}</body></html>`;

      const ensureContactSection = (html: string) => {
        const escapeAttr = (value: string) =>
          value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/'/g, '&#39;');

        const escapedSubdomain = selectedDomain ? escapeAttr(selectedDomain) : '';

        let updated = html.replace(/href="#"/g, 'href="#contact"');
        const hasContactId = /id=["']contact["']/.test(updated);
        const contactBlock = `
<section id="contact" style="padding:48px 20px; background:#f8fafc; border-top:1px solid #e5e7eb;">
  <div style="max-width:760px; margin:0 auto; text-align:center;">
    <h2 style="font-size:28px; margin-bottom:12px;">Request info</h2>
    <p style="color:#4b5563; margin-bottom:24px;">Tell us about your project. We’ll follow up soon.</p>
    <form action="/api/contact-leads" method="POST" style="display:grid; gap:12px; text-align:left;">
      ${escapedSubdomain ? `<input type="hidden" name="subdomain" value="${escapedSubdomain}" />` : ''}
      <input name="name" placeholder="Your name (optional)" style="padding:12px 14px; border:1px solid #e5e7eb; border-radius:8px;" />
      <input name="email" type="email" placeholder="Your email (optional)" style="padding:12px 14px; border:1px solid #e5e7eb; border-radius:8px;" />
      <textarea name="message" required rows="3" placeholder="Project details" style="padding:12px 14px; border:1px solid #e5e7eb; border-radius:8px; resize:vertical;"></textarea>
      <button type="submit" style="background:#2563eb; color:white; padding:12px 16px; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Send</button>
    </form>
    <div data-contact-status="true" style="margin-top:10px; font-size:14px; color:#2563eb; min-height:20px;"></div>
  </div>
</section>`;

        if (hasContactId) {
          // Ensure existing contact section has a status placeholder
          const contactStatusRegex = /data-contact-status=["']true["']/;
          if (!contactStatusRegex.test(updated)) {
            updated = updated.replace(
              /<\/form>/i,
              '</form><div data-contact-status="true" style="margin-top:10px; font-size:14px; color:#2563eb; min-height:20px;"></div>'
            );
          }
        } else {
          if (updated.includes('</body>')) {
            updated = updated.replace('</body>', `${contactBlock}</body>`);
          } else {
            updated = `${updated}${contactBlock}`;
          }
        }

        const contactScript = `
<script id="contact-leads-handler">
(function() {
  const bind = () => {
    const forms = Array.from(document.querySelectorAll('form[action*="/api/contact-leads"]'));
    if (!forms.length) return;
    forms.forEach((form) => {
      if (form.dataset.contactBound === 'true') return;
      form.dataset.contactBound = 'true';
      let statusEl = form.querySelector('[data-contact-status]');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.setAttribute('data-contact-status', 'true');
        statusEl.style.cssText = 'margin-top:10px; font-size:14px; color:#2563eb; min-height:20px;';
        form.insertAdjacentElement('afterend', statusEl);
      }

      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        statusEl.textContent = 'Sending...';
        statusEl.style.color = '#2563eb';

        const formData = new FormData(form);
        const urlEncoded = new URLSearchParams();
        formData.forEach((value, key) => {
          if (typeof value === 'string') {
            urlEncoded.append(key, value);
          }
        });

        try {
          const resp = await fetch(form.action || '/api/contact-leads', {
            method: form.method || 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlEncoded.toString()
          });
          if (resp.ok) {
            statusEl.textContent = 'Message sent! We will reply soon.';
            statusEl.style.color = '#16a34a';
            form.reset();
          } else {
            statusEl.textContent = 'Something went wrong. Please try again.';
            statusEl.style.color = '#dc2626';
          }
        } catch (err) {
          statusEl.textContent = 'Network error. Please try again.';
          statusEl.style.color = '#dc2626';
        }
      });
    });
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bind();
  } else {
    document.addEventListener('DOMContentLoaded', bind);
  }
})();
</script>`;

        if (!updated.includes('contact-leads-handler')) {
          if (updated.includes('</body>')) {
            updated = updated.replace('</body>', `${contactScript}</body>`);
          } else {
            updated = `${updated}${contactScript}`;
          }
        }

        return updated;
      };

      finalHtml = ensureContactSection(finalHtml);

      setGeneratedSite(finalHtml);
      setOpenWebSite(true);

      mixpanel.track("Web Generated", {
        textDescription: textDescription,
        referenceWebsite: designPlan.reference_website,
        selectedDomain: selectedDomain,
        vibe: vibe
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

  // Add this helper function near the top of the component
  const generateSubdomain = () => {
    // Generate a base from textDescription or use a default
    let base = textDescription
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-|-$/g, '') // Remove leading/trailing dashes
      .substring(0, 20);
    
    // If base is empty or too short, use a default
    if (!base || base.length < 2) {
      base = 'site';
    }
    
    const timestamp = Date.now().toString().slice(-4);
    const subdomain = `${base}-${timestamp}`;
    
    // Ensure subdomain meets requirements (3-50 chars, alphanumeric and dashes only)
    if (subdomain.length < 3) {
      return `site-${timestamp}`;
    }
    if (subdomain.length > 50) {
      return subdomain.substring(0, 46) + timestamp;
    }
    
    return subdomain;
  };

  // Validate subdomain format
  const validateSubdomain = (subdomain: string): { valid: boolean; error?: string } => {
    if (!subdomain || subdomain.trim().length === 0) {
      return { valid: false, error: 'Subdomain cannot be empty' };
    }
    
    if (subdomain.length < 3) {
      return { valid: false, error: 'Subdomain must be at least 3 characters' };
    }
    
    if (subdomain.length > 50) {
      return { valid: false, error: 'Subdomain must be 50 characters or less' };
    }
    
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return { valid: false, error: 'Subdomain can only contain lowercase letters, numbers, and dashes' };
    }
    
    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      return { valid: false, error: 'Subdomain cannot start or end with a dash' };
    }
    
    return { valid: true };
  };

  const clearSelection = () => {
    if (selectedElement) {
      selectedElement.style.outline = '';
    }
    selectedElementRef.current = null;
    setSelectedElement(null);
    setActionChipPos(null);
  };

  const updateActionChipPosition = (element: HTMLElement) => {
    if (!iframeRef.current) return;
    const elementRect = element.getBoundingClientRect();
    const iframeRect = iframeRef.current.getBoundingClientRect();
    setActionChipPos({
      top: iframeRect.top + elementRect.top + window.scrollY - 8,
      left: iframeRect.left + elementRect.right + window.scrollX - 80,
    });
  };

  const handleDeleteSelected = () => {
    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc || !selectedElement) return;

    const tag = selectedElement.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body' || tag === 'head') {
      toast.error('Cannot delete this element');
      return;
    }

    const snapshot = iframeDoc.documentElement.outerHTML;
    setUndoStack((prev) => {
      const next = [snapshot, ...prev];
      return next.slice(0, 5);
    });

    selectedElement.remove();
    clearSelection();
    const updatedHtml = iframeDoc.documentElement.outerHTML;
    setGeneratedSite(updatedHtml);
    toast.success('Element deleted');
  };

  const handleUndoDelete = () => {
    setUndoStack((prev) => {
      if (!prev.length) {
        toast.error('Nothing to undo');
        return prev;
      }
      const [latest, ...rest] = prev;
      setGeneratedSite(latest);
      clearSelection();
      return rest;
    });
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

      // Use custom subdomain if editing, otherwise generate new one
      let subdomain = editingSite ? customSubdomain : generateSubdomain();
      
      // If editing and customSubdomain is empty, use the editingSite as fallback
      if (editingSite && (!customSubdomain || customSubdomain.trim() === '')) {
        subdomain = editingSite;
      }
      
      // Validate subdomain before sending
      const validation = validateSubdomain(subdomain);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid subdomain format');
        setIsPublishing(false);
        return;
      }

      const response = await fetch('/api/publish-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          html: generatedSite,
          subdomain: subdomain,
          description: textDescription || 'Untitled',
          originalSubdomain: editingSite // Include original subdomain when editing
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('Publish failed:', data);
        const errorMessage = data?.message || data?.error || 'Failed to publish site';
        throw new Error(errorMessage);
      }

      // Handle both response formats: { url: ... } or { success: true, url: ... }
      const publishedUrl = data.url || (data.success && data.site ? `https://${data.site.subdomain}.simplerb.com` : null);
      
      if (!publishedUrl) {
        console.error('No URL in response:', data);
        throw new Error('Server did not return a valid URL');
      }

      setPublishedUrl(publishedUrl);

      const action = editingSite ? 'Site updated successfully!' : 'Site published successfully!';
      toast.success(action);

      mixpanel.track('Site Published', {
        userId: dataUser.id,
        siteUrl: data.url,
        isEdit: !!editingSite
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

          {publishedUrl && (
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  // Use the real AI domain generator from /domain page
                  const prompt = `
                    Role: You are Seth Godin.
                    Objective: Generate 3 memorable, brief, and simple domain names based on the following input:
                    Client's input: ${textDescription}
                    Vibe: Professional

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
                    body: JSON.stringify({ prompt, ptemp: 0.7, ptop: 1 }),
                  });

                  if (!response.ok) {
                    throw new Error('Failed to generate domains');
                  }

                  const data = await response.json();
                  const generatedDomains = data.result
                    .split('\n')
                    .map((domain: string) => domain.trim())
                    .filter((domain: string) => domain.length > 0)
                    .slice(0, 3)
                    .map((domain: string) => domain.replace(/^-+\s*/, '')); // Remove leading dashes

                  setSuggestedDomains(generatedDomains);
                  setShowDomainSuggestion(true);
                } catch (error) {
                  console.error('Error generating domains:', error);
                  // Fallback to simple suggestions if AI fails
                  const domains = generateDomainSuggestions(textDescription);
                  setSuggestedDomains(domains);
                  setShowDomainSuggestion(true);
                } finally {
                  setLoading(false);
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
              <span>{loading ? 'Generating...' : 'Buy Domain'}</span>
            </button>
          )}
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
        clearSelection();
        setGeneratedSite(iframeDoc.documentElement.outerHTML);
      }
    };

    toggleEditMode(isEditMode);
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
      clearSelection();
      return;
    }

    const iframeDoc = iframeRef.current?.contentDocument;
    const iframeWin = iframeRef.current?.contentWindow;
    if (!iframeDoc) return;

    const handleClick = (event: MouseEvent) => {
      if (!isEditMode) return;
      const target = event.target as HTMLElement;
      if (!target) return;

      if (target.tagName === 'HTML' || target.tagName === 'BODY' || target.tagName === 'HEAD') {
        clearSelection();
        return;
      }

      if (selectedElementRef.current && selectedElementRef.current !== target) {
        selectedElementRef.current.style.outline = '';
      }

      target.style.outline = '2px solid #2563eb';
      selectedElementRef.current = target;
      setSelectedElement(target);
      updateActionChipPosition(target);
    };

    const handleScrollOrResize = () => {
      const current = selectedElementRef.current;
      if (current) {
        updateActionChipPosition(current);
      }
    };

    iframeDoc.addEventListener('click', handleClick, true);
    iframeWin?.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      iframeDoc.removeEventListener('click', handleClick, true);
      iframeWin?.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      if (selectedElementRef.current) {
        selectedElementRef.current.style.outline = '';
      }
      clearSelection();
    };
  }, [isEditMode, generatedSite]);

  // Show toast message when entering/exiting edit mode
  useEffect(() => {
    if (isEditMode) {
      toast.success("Edit mode enabled. Click elements to edit text.");
    } else if (generatedSite) {
      toast.success("Changes saved!");
    }
  }, [isEditMode, generatedSite]);

  return (
    <DashboardLayout title="Website">
      <Toaster position="top-center" />

      {/* Add this form */}
      <form action="/api/checkout_sessions" method="POST" style={{ display: 'none' }}>
        <input type="hidden" name="tipo" value="STARTER" />
      </form>

      {/* Website Builder Content */}
      <div className="flex flex-1 w-full flex-col items-center justify-center text-center">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between px-2">
          <h1 className="text-2xl text-gray-900 my-3 tracking-tight">
            Website <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Creator</span>
          </h1>
         
        </div>

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
              
              
              {/* Integrated Action Bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gray-50 rounded-b-2xl p-4 border-t border-gray-100 overflow-visible">
                <div className="flex items-center space-x-3 overflow-visible">
                  {/* Vibe Dropdown */}
                  <div className="relative overflow-visible">
                    <select
                      value={vibe}
                      onChange={(e) => setVibe(e.target.value as VibeType)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500 shadow-sm appearance-none pr-8"
                    >
                      <option value="Professional">Professional</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Creative">Creative</option>
                      <option value="Sophisticated">Sophisticated</option>
                    </select>
                  </div>
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

            {/* Additional context fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 text-left mb-2">
                  Who is this for? (optional)
                </label>
                <textarea
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="e.g., Homeowners in suburbs, small business owners, busy parents"
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 text-left mb-2">
                  Trust signals (optional)
                </label>
                <textarea
                  value={trustSignals}
                  onChange={(e) => setTrustSignals(e.target.value)}
                  maxLength={280}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="e.g., 500+ projects, 24h response, licensed/insured, partner brands, satisfaction guarantee"
                />
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
          {isEditMode && selectedElement && actionChipPos && (
            <div
              style={{
                position: 'fixed',
                top: actionChipPos.top,
                left: actionChipPos.left,
                zIndex: 1300,
              }}
              className="flex items-center space-x-2 bg-white border border-gray-200 shadow-lg rounded-full px-3 py-1"
            >
              <span className="text-xs text-gray-600 truncate max-w-[120px]">
                {selectedElement.tagName.toLowerCase()}
              </span>
              <button
                onClick={handleDeleteSelected}
                className="text-xs bg-red-500 text-white px-2 py-1 rounded-full hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              {undoStack.length > 0 && (
                <button
                  onClick={handleUndoDelete}
                  className="text-xs bg-gray-800 text-white px-2 py-1 rounded-full hover:bg-gray-900 transition-colors"
                >
                  Undo
                </button>
              )}
            </div>
          )}
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
        {isSignedIn && (
          <Dialog
            open={isLeadsModalOpen}
            onClose={() => setIsLeadsModalOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Recent leads</h2>
                <button
                  onClick={() => setIsLeadsModalOpen(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              {leadsLoading && <p className="text-sm text-gray-500">Loading leads…</p>}
              {!leadsLoading && leads.length === 0 && (
                <p className="text-sm text-gray-500">
                  No leads yet — submissions from your published site's contact form will show up here once visitors start sending messages.
                </p>
              )}
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {leads.slice(0, 20).map((lead) => (
                  <div key={lead.id} className="py-3">
                    <div className="text-sm text-gray-900 font-medium">
                      {lead.subdomain || '—'}
                    </div>
                    <div className="text-sm text-gray-700">
                      {lead.message.slice(0, 160)}
                      {lead.message.length > 160 ? '…' : ''}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      {lead.name && <span>{lead.name}</span>}
                      {lead.email && <span>• {lead.email}</span>}
                      <span>• {new Date(lead.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Dialog>
        )}

        {/* Domain Purchase Modal */}
        <DomainPurchaseModal
          open={purchaseModalOpen}
          onClose={() => setPurchaseModalOpen(false)}
          domain={selectedDomainForPurchase}
          onSuccess={() => {
            setPurchaseModalOpen(false);
            setShowDomainSuggestion(false);
            toast.success(`Domain ${selectedDomainForPurchase} purchased successfully!`);
          }}
        />

        {/* Domain Suggestion Modal */}
        <Dialog
          open={showDomainSuggestion}
          onClose={() => setShowDomainSuggestion(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            style: {
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }
          }}
        >
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Get a Custom Domain</h2>
                  <p className="text-blue-600 font-medium">Upgrade your website</p>
                </div>
              </div>
              <button
                onClick={() => setShowDomainSuggestion(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors p-2 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-700 mb-6 leading-relaxed text-lg">
              Make your website more professional with a custom domain. Here are personalized suggestions based on your business:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {suggestedDomains.map((domain, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedDomainForPurchase(domain);
                          setPurchaseModalOpen(true);
                          // Don't close the suggestions modal - keep it open behind the purchase modal
                        }}
                  className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all duration-300 text-left group hover:scale-[1.02]"
                >
                  <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg mb-2">
                    {domain}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Check availability & buy
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center">
              <button
                onClick={() => {
                  window.open('/domain', '_blank');
                  setShowDomainSuggestion(false);
                }}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors px-6 py-3 rounded-lg hover:bg-blue-50"
              >
                <span>Browse all available domains</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default WebPage;
import Link from "next/link";
import { Button, Tooltip, Box } from "@mui/material";
import { useClerk, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import styles from "./Header.module.css";
import mixpanel from "mixpanel-browser";

interface HeaderProps {
  credits: number;
}

export default function Header({ credits }: HeaderProps): JSX.Element {
  const { openSignIn } = useClerk();

// Handler function to track the event when the button is clicked
const handleBuyCreditsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  // Prevent the form from submitting traditionally
  event.preventDefault();
  mixpanel.track("Buy Credits Click", {
    credits: credits,
  });
  
    // The Google Ads event snippet
    window.gtag && window.gtag('event', 'conversion', {
      'send_to': '16510475658/ZCyECJS9tqYZEIq758A9', // Your conversion ID and conversion label
  });

  // Safely access the form and submit it
  const form = event.currentTarget.form;
  if (form) {
    form.submit();
  } else {
    // Handle the case where for some reason the form isn't available
    console.error("Form not found");
  }
};

  return (
    <header className="flex justify-between items-center w-full mt-5 border-b-2 pb-7 sm:px-4 px-2">
      <Link href="/" className="flex space-x-1">
        <img
          alt="header text"
          src="/write.svg"
          className="sm:w-9 sm:h-9 w-8 h-8"
        />
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <h1 className="sm:text-3xl text-2xl font-bold ml-2 tracking-tight">
            simplerB
          </h1>
        </Box>
      </Link>
      <div className="flex space-x-3 space-xs-1 sm:pb-0">
        <SignedIn>
          <Tooltip title="Get 30 credits for $3.00, with each credit revealing 3 unique domain suggestions.">
            <p className="py-1 pl-1 sm:px-4 text-slate-500 text-sm my-2 hover:scale-105 transition duration-300 ease-in-out">
              Credits:<b>{credits}</b>{" "}
              <span className="cursor-pointer">&#x24D8;</span>
            </p>
          </Tooltip>
          <form action="/api/checkout_sessions" method="POST">
            <Button
              size="small"
              type="submit"
              variant="contained"
              role="link"
              onClick={handleBuyCreditsClick}
            >
              Buy Credits
            </Button>
          </form>
          <div className={styles.headerItem}>
            <UserButton userProfileUrl="/user" afterSignOutUrl="/" />
          </div>
        </SignedIn>
        <SignedOut>
          <div className={styles.headerItem} >
            <a onClick={() => openSignIn()} className="bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full">
              Sign in / up
            </a>
          </div>
        </SignedOut>
      </div>
    </header>
  );
}

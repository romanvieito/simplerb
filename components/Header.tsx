import Link from "next/link";
import { Button, Tooltip, Box } from "@mui/material";
import StarIcon from '@mui/icons-material/Star';
import { useClerk, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import styles from "./Header.module.css";
import mixpanel from "mixpanel-browser";

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import { useState, useEffect, useContext } from "react";
import SBRContext from "../context/SBRContext";

import {
  resetSearch,
} from "../utils/LocalStorage";

const pages = [
  { name: 'Domain Generator', link: '/domain' },
  // { name: 'Website Generator', link: '/web' },
  // { name: 'Google Ads Generator', link: '/ads' },
  { name: 'Pricing', link: '/pricing' }
];

interface HeaderProps {
  credits: number;
}

const theme = createTheme({
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'white',
          color: 'black',
          boxShadow: 'none'
        },
      },
    },
  },
});

const ButtonMenu = styled(Button)({
  textTransform: 'none',
});

export default function Header(): JSX.Element {

  const { openSignIn } = useClerk();
  const { isLoaded, user, isSignedIn } = useUser();

  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleSubsStarterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent the form from submitting traditionally
    event.preventDefault();
    mixpanel.track("Become a Member Click", {
      plan_subscription: 'STARTER',
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

  // Function to fetch user credits by email
  const fetchCredits = async (email: string) => {
    try {
      let userData = undefined;
      while(true) {
        const response = await fetch(`/api/getUser?email=${email}`);
        if (!response.ok) {
          throw new Error(
            "Network response was not ok. Failed to get user email"
          );
        }
        userData = await response.json();
        if (userData.user.rows.length > 0) break;
      }
      setDataUser({
        id: userData.user.rows[0].id,
        name: userData.user.rows[0].name,
        email: userData.user.rows[0].email
      });      
      setCredits(userData.user.rows[0].credits);
      setAdmin(userData.user.rows[0].admin);
      setSubsTplan(userData.user.rows[0].subs_tplan);
      setSubsCancel(userData.user.rows[0].subs_cancel);
    } catch (error) {
      console.error("Failed to fetch user credits:", error);
    } finally {
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchCredits(user.emailAddresses[0].emailAddress || "");
      // Set this to a unique identifier for the user performing the event.
      mixpanel.identify(user.emailAddresses[0].emailAddress);     
    } else {  
    }
  }, [user]);

  useEffect(() => {
    if (!isSignedIn && isSignedIn!==undefined) {
      setSubsTplan(null);
      setSubsCancel(null);
      setCredits(null);
      setDataUser({
        id: '0',
        name: 'anonymous',
        email: 'anonymous@anonymous.com'
      });
      setAdmin(false);
      resetSearch();
    }
  }, [isSignedIn]);

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* <Box
            component="img"
            alt="header text"
            src="/write.svg"
            sx={{
              display: { xs: 'none', md: 'flex' },
              width: { xs: '2rem', sm: '2.25rem' }, // Correspondiente a w-8 y sm:w-9
              height: { xs: '2rem', sm: '2.25rem' }, // Correspondiente a h-8 y sm:h-9
              mr: 2,
            }}
          /> */}
            <Typography
              variant="h6"
              noWrap
              component="a"
              href="/"
              sx={{
                display: { md: "flex" },
                fontWeight: 700,
              }}
            >
              <h1 className="sm:text-3xl text-2xl font-bold mr-2 tracking-tight">
                simplerB
              </h1>
            </Typography>
            <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
              <Button
                className={styles.toolsButton}
                style={{ textTransform: "none", color: "black" }}
                id="tools-button"
                aria-controls="basic-menu"
                aria-haspopup="true"
                aria-expanded="true"
                onClick={handleOpenNavMenu}
                endIcon={<KeyboardArrowDownIcon />}
              >
                Menu
              </Button>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: "block", md: "none" },
                }}
              >
                {pages.map((page) => (
                  <MenuItem key={page.name}>
                    <ButtonMenu
                      key={page.name}
                      href={page.link}
                      sx={{ my: 0.5, color: "black", display: "block" }}
                    >
                      {page.name}
                    </ButtonMenu>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
            {/* <Box
            component="img"
            alt="header text"
            src="/write.svg"
            sx={{
              display: { xs: 'flex', md: 'none' },
              width: { xs: '2rem', sm: '2.25rem' }, // Correspondiente a w-8 y sm:w-9
              height: { xs: '2rem', sm: '2.25rem' }, // Correspondiente a h-8 y sm:h-9
              mr: 2,
            }}
          />           */}
            <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
              {pages.map((page) => (
                <ButtonMenu
                  key={page.name}
                  href={page.link}
                  sx={{ my: 2.5, color: "black", display: "block" }}
                >
                  {page.name}
                </ButtonMenu>
              ))}
            </Box>
            <Box
              sx={{
                flexGrow: 0,
                display: "flex",
                flexDirection: { xs: "row", sm: "row" }, // En pantallas pequeñas (xs), los elementos estarán en columna; en pantallas medianas y más grandes (sm), en fila.
                gap: 1,
                alignItems: "center", // Opcional, para centrar los elementos en la columna
              }}
            >
              <SignedIn>
                <form action="/api/checkout_sessions" method="POST">
                  <input type="hidden" name="tipo" value="STARTER" />
                  <Button
                    style={{ textTransform: "none" }}
                    sx={{
                      "@media (max-width:600px)": {
                        padding: 1, // Padding for screens sm and smaller
                      },
                      "@media (max-width:450px)": {
                        padding: "3px", // Padding for screens sm and smaller
                      },
                      display:
                        subsTplan && subsTplan !== "FREE" ? "none" : "block",
                    }}
                    type="submit"
                    variant="contained"
                    role="link"
                    onClick={handleSubsStarterClick}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StarIcon sx={{ mr: 0.2, fontSize: '1rem' }} />
                      Become a Member
                    </Box>
                  </Button>
                </form>
                <Box>
                  <UserButton userProfileUrl="/user" afterSignOutUrl="/" />
                </Box>
              </SignedIn>
              <SignedOut>
                <Box>
                  <a
                    onClick={() => openSignIn()}
                    className="bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                  >
                    Sign in / up
                  </a>
                </Box>
              </SignedOut>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </ThemeProvider>
  );
}

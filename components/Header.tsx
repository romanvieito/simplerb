import Link from "next/link";
import { Button, Tooltip, Box } from "@mui/material";
import { useClerk, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import styles from "./Header.module.css";
import mixpanel from "mixpanel-browser";

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import { useState } from "react";

const pages = ['Website Generator', 'Ads Generator'];

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

export default function Header({ credits }: HeaderProps): JSX.Element {
  const { openSignIn } = useClerk();

  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

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
    <ThemeProvider theme={theme}>
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box
            component="img"
            alt="header text"
            src="/write.svg"
            sx={{
              display: { xs: 'none', md: 'flex' },
              width: { xs: '2rem', sm: '2.25rem' }, // Correspondiente a w-8 y sm:w-9
              height: { xs: '2rem', sm: '2.25rem' }, // Correspondiente a h-8 y sm:h-9
              mr: 2,
            }}
          />
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/"
            sx={{
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
              mr: 2,              
            }}
          >
            <h1 className="sm:text-3xl text-2xl font-bold ml-2 tracking-tight">
              simplerB
            </h1>
          </Typography>          
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <SignedIn>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                }}
              >
                {pages.map((page) => (
                  <MenuItem key={page} onClick={handleCloseNavMenu}>
                    <Typography textAlign="center">{page}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </SignedIn>
          </Box>          
          <Box
            component="img"
            alt="header text"
            src="/write.svg"
            sx={{
              display: { xs: 'flex', md: 'none' },
              width: { xs: '2rem', sm: '2.25rem' }, // Correspondiente a w-8 y sm:w-9
              height: { xs: '2rem', sm: '2.25rem' }, // Correspondiente a h-8 y sm:h-9
              mr: 2,
            }}
          />          
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            <SignedIn>
            {pages.map((page) => (
              <ButtonMenu
                key={page}
                onClick={handleCloseNavMenu}
                sx={{ my: 2, color: 'black', display: 'block' }}
              >
                {page}
              </ButtonMenu>
            ))}
            </SignedIn>
          </Box>          
          <Box       
            sx={{
              flexGrow: 0,
              display: 'flex',
              flexDirection: { xs: 'row', sm: 'row' }, // En pantallas pequeñas (xs), los elementos estarán en columna; en pantallas medianas y más grandes (sm), en fila.
              gap: 1,
              alignItems: 'center', // Opcional, para centrar los elementos en la columna
            }}>
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
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
    </ThemeProvider>    
  );
}

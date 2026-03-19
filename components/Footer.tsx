import Link from 'next/link';
import { Box } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { useState } from 'react';
import EmailModal from './EmailModal';
import { useUser } from '@clerk/nextjs';
import mixpanel from 'mixpanel-browser';

export default function Footer() {
  const { isLoaded, isSignedIn } = useUser();
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = () => {
    mixpanel.track('Feedback Click', {});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <footer className="border-t border-stone-200 bg-[#fbf8f0]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-8 text-stone-600 md:flex-row md:items-center md:justify-between">
        <Box>
          <div className="text-sm leading-7">
            <span className="font-semibold text-stone-900">simplerB</span> is built for teams that want more execution and less drag.
          </div>
        </Box>

        <Box className="flex items-center gap-3 text-sm">
          <Link href="/terms" className="underline decoration-stone-300 underline-offset-4 hover:text-stone-900">
            Terms
          </Link>
          <span>·</span>
          <Link href="/privacy" className="underline decoration-stone-300 underline-offset-4 hover:text-stone-900">
            Privacy
          </Link>
        </Box>

        <Box className="flex items-center gap-3">
          {isLoaded && isSignedIn ? (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-50"
              onClick={handleOpenModal}
            >
              <EmailIcon fontSize="small" />
              <span>Feedback</span>
            </button>
          ) : null}

          <EmailModal open={modalOpen} onClose={handleCloseModal} subjectType="feedback" />

          <Link
            href="https://www.linkedin.com/in/yaibolanos"
            className="text-sm underline decoration-stone-300 underline-offset-4 hover:text-stone-900"
            target="_blank"
            aria-label="Yai on Linkedin"
          >
            Linkedin
          </Link>
        </Box>
      </div>
    </footer>
  );
}

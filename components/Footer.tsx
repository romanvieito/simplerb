import Link from "next/link";
import EmailIcon from '@mui/icons-material/Email';
import { useState } from "react";
import EmailModal from "./EmailModal";
import { useUser } from "@clerk/nextjs";

export default function Footer() {

  const {isLoaded, user, isSignedIn } = useUser();
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <footer className="text-center w-full border-t flex flex-col sm:flex-row justify-between items-center p-4 space-y-4 sm:space-y-0">
      <div>
        Made with ♥️ by{" "}
        <a
          href="https://adaved.com/"
          target="_blank"
          rel="noreferrer"
          className="font-bold hover:underline transition underline-offset-2"
        >
          yai{" "}
        </a>
      </div>
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-center">
        {
          isLoaded && isSignedIn ? 
          <>
            <button
              className="bg-white border border-black rounded-xl text-black font-medium px-4 py-2 sm:mt-2 mt-2 hover:bg-gray-300 w-full"
              onClick={handleOpenModal}
            >
              <i className="fas fa-comment"></i>
              <EmailIcon />{" "}
              <span>Feedback</span>
            </button>
          </> : 
          null
        }
        <EmailModal open={modalOpen} onClose={handleCloseModal} userauth={user} />                
        {" "}
        <Link
          href="https://www.linkedin.com/in/yaibolanos"
          className="group"
          target="_blank"
          aria-label="Yai on Linkedin"
        >
          <svg
            aria-hidden="true"
            className="h-6 w-6 fill-slate-500 group-hover:fill-slate-700"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M20.447,20.452H16.883V14.884c0-1.328-0.027-3.037-1.852-3.037c-1.853,0-2.136,1.447-2.136,2.942v5.664H9.341V9.004h3.414v1.561
              h0.049c0.475-0.902,1.637-1.851,3.37-1.851c3.602,0,4.273,2.369,4.273,5.455v6.284 M5.337,7.433c-1.144,0-2.068-0.93-2.068-2.074
              c0-1.146,0.924-2.074,2.068-2.074s2.067,0.928,2.067,2.074C7.404,6.503,6.481,7.433,5.337,7.433 M7.119,20.452H3.554V9.004h3.565
              V20.452z M22.225,0H1.771C0.792,0,0,0.792,0,1.771v20.452c0,0.979,0.792,1.771,1.771,1.771h20.452c0.979,0,1.771-0.792,1.771-1.771
              V1.771C24,0.792,23.204,0,22.225,0"
            ></path>
          </svg>
        </Link>
      </div>
    </footer>
  );
}

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="text-center h-16 sm:h-20 w-full sm:pt-2 pt-4 border-t flex flex-row justify-between items-center px-3 space-y-3 sm:mb-0 mb-3">
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
        {/* and{' '}
        <a
          href="https://platform.openai.com/docs/models"
          target="_blank"
          rel="noreferrer"
          className="font-bold hover:underline transition underline-offset-2"
        >
          GPT-3.5
        </a> */}
      </div>
      <div className="flex space-x-4 pb-4 sm:pb-0">
        {/* <Link
          href="https://twitter.com/romanvieito"
          className="group"
          aria-label="Yai on Twitter"
        >
          <svg
            aria-hidden="true"
            className="h-6 w-6 fill-slate-500 group-hover:fill-slate-700"
          >
            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0 0 22 5.92a8.19 8.19 0 0 1-2.357.646 4.118 4.118 0 0 0 1.804-2.27 8.224 8.224 0 0 1-2.605.996 4.107 4.107 0 0 0-6.993 3.743 11.65 11.65 0 0 1-8.457-4.287 4.106 4.106 0 0 0 1.27 5.477A4.073 4.073 0 0 1 2.8 9.713v.052a4.105 4.105 0 0 0 3.292 4.022 4.093 4.093 0 0 1-1.853.07 4.108 4.108 0 0 0 3.834 2.85A8.233 8.233 0 0 1 2 18.407a11.615 11.615 0 0 0 6.29 1.84" />
          </svg>
        </Link> */}

        <Link
          href="https://www.linkedin.com/in/yainery-bolanos-515084132/"
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
            <path
              d="M20.447,20.452H16.883V14.884c0-1.328-0.027-3.037-1.852-3.037c-1.853,0-2.136,1.447-2.136,2.942v5.664H9.341V9.004h3.414v1.561
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

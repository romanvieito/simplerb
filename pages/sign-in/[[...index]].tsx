import { SignIn } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/router";

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      router.replace("/dashboard");
    }
  }, [router]);

  // In dev bypass, avoid rendering Clerk widget entirely to prevent missing-key errors
  if (DEV_BYPASS_AUTH) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Redirecting…</h1>
            <p className="text-gray-600">Dev bypass enabled — sending you to the dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account to continue</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-xl p-8">
          {DEV_BYPASS_AUTH && (
            <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 border border-blue-100">
              Dev bypass enabled — redirecting to dashboard.
            </div>
          )}
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none w-full",
                formButtonPrimary:
                  "bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200",
                formFieldInput:
                  "rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500",
                footerActionLink: "text-blue-600 hover:text-blue-700 font-medium",
                identityPreviewText: "text-gray-700",
                identityPreviewEditButton: "text-blue-600 hover:text-blue-700"
              },
            }}
            routing="path"
            path="/sign-in"
            redirectUrl="/dashboard"
            afterSignInUrl="/dashboard"
            signUpUrl="/sign-up"
          />
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return { props: {} };
}
import React from "react";
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CPricing from "../components/CPricing";
import { Container } from "@mui/material";
import CFAQ from "../components/CFAQ";

export default function PricingPage() {
  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <div>
          <section className="w-full bg-white py-16">
            <Container maxWidth="lg">
              <h1 className="text-3xl font-semibold mb-8 text-center">Terms of Service</h1>
              
              <div className="text-left">
                <p className="mb-6">Last updated: February 08, 2025</p>
                
                <p className="mb-6">Please read these terms and conditions carefully before using Our Service.</p>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
                  <p className="mb-4">
                    SimplerB ("SimplerB", "we", "us", "our") provides access to the SimplerB platform, including the website, APIs, and related services ("Services"). By using the Services, you agree to be bound by these Terms of Service ("Agreement"). If you are using the Services on behalf of a company, you must have the authority to bind that company to this Agreement.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Age and Eligibility</h2>
                  <p className="mb-4">
                    You must be at least 16 years old to use the Services. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Your Content</h2>
                  <p className="mb-4">
                    You are responsible for any content you upload or share on the Services. By posting content, you grant SimplerB a worldwide, non-exclusive, royalty-free license to use, modify, distribute, and display your content in connection with the Services. SimplerB reserves the right to remove any content at any time for any reason.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
                  <p className="mb-4">You must use the Services lawfully and refrain from:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Undermining security measures</li>
                    <li>Gaining unauthorized access to accounts or systems</li>
                    <li>Sending spam or other unsolicited communications</li>
                    <li>Misusing the Services in any way that violates laws or regulations</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Usage Restrictions</h2>
                  <p className="mb-4">You may not:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Sublicense, resell, or commercially exploit the Services</li>
                    <li>Reverse engineer or modify the Services</li>
                    <li>Violate any applicable laws while using the Services</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Free Plan</h2>
                  <p className="mb-4">
                    SimplerB offers a free plan but reserves the right to modify, limit, or discontinue it at any time. Projects hosted under the free plan may be subject to deletion without notice.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Fair Use</h2>
                  <p className="mb-4">
                    SimplerB provides reasonable bandwidth and storage for all plan levels but may restrict or terminate accounts that create an excessive burden on its infrastructure.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Security</h2>
                  <p className="mb-4">
                    We take measures to protect your content but are not liable for unauthorized access, data breaches, or data loss. You are responsible for safeguarding your account credentials.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Electronic Communications</h2>
                  <p className="mb-4">
                    By using the Services, you consent to receive electronic communications from SimplerB regarding updates, security notices, and service-related information.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Representations and Warranties</h2>
                  <p className="mb-4">
                    You represent that:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>You own or have the necessary rights to any content you upload</li>
                    <li>Your use of the Services complies with all applicable laws and SimplerB policies</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
                  <p className="mb-4">
                    You agree to indemnify and hold SimplerB harmless from any claims, damages, or legal expenses arising from your use of the Services or any content you submit.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Confidentiality</h2>
                  <p className="mb-4">
                    Both parties agree to protect each other's confidential information and only use it for the purposes related to the Services.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Payment of Fees</h2>
                  <p className="mb-4">
                    Services are provided according to the selected plan.
                  </p>
                  <p className="mb-4">
                    Fees for paid plans are billed in advance and are non-refundable.
                  </p>
                  <p className="mb-4">
                    If payment fails, your access to paid features may be suspended.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Term and Termination</h2>
                  <p className="mb-4">
                    This Agreement remains in effect as long as you use the Services.
                  </p>
                  <p className="mb-4">
                    Either party may terminate the Agreement with notice.
                  </p>
                  <p className="mb-4">
                    Upon termination, your access to the Services will be revoked, and your content may be deleted.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
                  <p className="mb-4">
                    The Services are provided "as is" and without warranties of any kind, express or implied.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
                  <p className="mb-4">
                    SimplerB's liability is limited to the greater of $100 or the total fees paid by you in the six months prior to the incident giving rise to liability. Certain limitations may not apply in some jurisdictions.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Miscellaneous</h2>
                  <p className="mb-4">
                    SimplerB may update these Terms with 30 days' notice.
                  </p>
                  <p className="mb-4">
                    If any provision is deemed unenforceable, it will be limited or removed while keeping the rest of the Agreement intact.
                  </p>
                  <p className="mb-4">
                    This Agreement constitutes the entire understanding between you and SimplerB.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Governing Law and Disputes</h2>
                  <p className="mb-4">
                    This Agreement is governed by the laws of [Your Jurisdiction].
                  </p>
                  <p className="mb-4">
                    Any disputes shall be resolved by binding arbitration, except for cases related to intellectual property rights.
                  </p>
                  <p className="mb-4">
                    Class action lawsuits are waived.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Privacy</h2>
                  <p className="mb-4">
                    Please refer to our Privacy Policy at https://simplerb.com/privacy for details on how SimplerB collects, uses, and protects personal data.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Translation Interpretation</h2>
                  <p className="mb-4">
                    If these Terms are translated into other languages, the original English version shall prevail in case of discrepancies.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Changes to These Terms and Conditions</h2>
                  <p className="mb-4">
                    We reserve the right to modify or replace these Terms at any time. If changes are significant, we will provide at least 30 days' notice before the new terms take effect. Your continued use of the Services after the changes take effect constitutes your acceptance of the new Terms.
                  </p>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                  <p className="mb-4">If you have any questions about these Terms and Conditions, you can contact us:</p>
                  <p>
                    By email: romanvieito@gmail.com<br />
                    By visiting our website: <a href="https://simplerb.com" className="text-blue-600 hover:underline">https://simplerb.com</a>
                  </p>
                </div>
              </div>
            </Container>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

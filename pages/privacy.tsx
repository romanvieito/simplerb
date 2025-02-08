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
          {/* FAQ Section */}
          <section className="w-full bg-white py-16">
            <Container maxWidth="lg">
              <h1 className="text-3xl font-semibold mb-8">Privacy Policy</h1>
              
              <div className="text-left">
                <p className="mb-6">Last updated: February 08, 2025</p>

                <p className="mb-6">
                  Welcome to SimplerB ("SimplerB", "we", "us", and/or "our"). SimplerB provides a platform for simplified project management and team collaboration services ("Services"). To provide our Site and Services (collectively, "Platform"), we collect personal data from our users ("Users"). We also host the personal data of our Users' end clients ("End Users") where applicable.
                </p>

                <p className="mb-8">
                  This Privacy Policy explains how we collect, use, share, and protect your personal data when you use our Platform, including any affiliated websites, software, or applications owned or operated by SimplerB where this Privacy Policy appears.
                </p>

                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">1. What Information Do We Collect?</h2>
                  <p className="mb-4">
                    The personal information we collect depends on how you interact with our Platform. Generally, we collect information:
                  </p>
                  <ul className="list-disc pl-6 mb-6">
                    <li>Directly from you when you provide it to us, such as when signing up for an account, subscribing to a service, or contacting support.</li>
                    <li>Indirectly through automated tracking technologies, such as cookies and analytics tools.</li>
                    <li>On behalf of our Users, when processing personal data of their End Users as part of our Services.</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">1.1 Information We Collect Directly From You</h3>
                  <p className="mb-4">
                    You can visit our website without providing personal information. However, if you request more information, sign up for our Services, or participate in activities such as surveys or promotions, we may collect:
                  </p>
                  <ul className="list-disc pl-6 mb-6">
                    <li>Account Information: When you register for an account, we collect your name, email address, username, and optionally, your company name and profile picture.</li>
                    <li>Payment Information: If you choose a paid plan, we collect billing details. Payments are processed by third-party, PCI-compliant providers, and we do not store full credit card details.</li>
                    <li>Customer Support: If you contact our support team, we may collect information about your issue and how to resolve it.</li>
                    <li>Event Registration: If you attend an event hosted or sponsored by SimplerB, we may collect your name, contact details, and other relevant event information.</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">1.2 Information We Collect Indirectly</h3>
                  <p className="mb-4">
                    We use tracking technologies to collect certain data automatically when you visit or use our Platform. This includes:
                  </p>
                  <ul className="list-disc pl-6 mb-6">
                    <li>Device Information: IP address, browser type, operating system, device ID, and screen resolution.</li>
                    <li>Usage Data: Activity logs, interaction history, and feature usage patterns to analyze trends and improve our Services.</li>
                    <li>Location Information: Approximate geographic location based on IP address.</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">2. How Do We Use Your Information?</h3>
                  <p className="mb-4">
                    We use the collected information for the following purposes:
                  </p>
                  <ul className="list-disc pl-6 mb-6">
                    <li>To provide and maintain the Services, including account management and technical support.</li>
                    <li>To personalize your experience by customizing content and features.</li>
                    <li>To process transactions and manage billing for paid services.</li>
                    <li>To improve our Platform, monitor performance, and troubleshoot issues.</li>
                    <li>To communicate with you, including service updates, security alerts, and marketing messages (if you opt-in).</li>
                    <li>To comply with legal obligations and enforce our terms of service.</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">3. How Do We Share Your Information?</h3>
                  <p className="mb-4">
                    We may share your information with:
                  </p>
                  <ul className="list-disc pl-6 mb-6">
                    <li>Service Providers – Third-party vendors who help us operate and improve the Platform (e.g., payment processors, analytics providers).</li>
                    <li>Legal Authorities – If required by law or to protect our rights and prevent fraud.</li>
                    <li>Business Transfers – In case of a merger, acquisition, or asset sale, your data may be transferred to a successor entity.</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">4. Data Security</h3>
                  <p className="mb-4">
                    We take reasonable technical and organizational measures to protect your personal data from unauthorized access, loss, or misuse. However, no system can be 100% secure. You are responsible for keeping your account credentials confidential.
                  </p>
                  <p className="mb-4">
                    If you suspect any security breach, please contact us immediately.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">5. Retention of Personal Data</h3>
                  <p className="mb-4">
                    We retain personal data only as long as necessary for the purposes outlined in this Privacy Policy. After that, data is securely deleted or anonymized unless required by law to be retained longer.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">6. Your Rights and Choices</h3>
                  <p className="mb-4">
                    Depending on your location, you may have the following rights regarding your personal data:
                  </p>
                  <ul className="list-disc pl-6 mb-6">
                    <li>Access & Portability: Request a copy of the data we hold about you.</li>
                    <li>Correction: Request corrections to inaccurate or incomplete data.</li>
                    <li>Deletion: Request that we delete your data (subject to legal or contractual obligations).</li>
                    <li>Objection: Object to data processing in certain circumstances.</li>
                    <li>Opt-out of Marketing: Unsubscribe from promotional emails at any time.</li>
                  </ul>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">7. International Data Transfers</h3>
                  <p className="mb-4">
                    If you are located outside [Your Operating Country], we may transfer your personal data to countries with different data protection laws. We take steps to ensure adequate protection through standard contractual clauses and other safeguards.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">8. Children's Privacy</h3>
                  <p className="mb-4">
                    Our Platform is not intended for children under 16, and we do not knowingly collect personal data from minors. If you believe a child has provided us with personal data, please contact us, and we will take appropriate action.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">9. Changes to This Privacy Policy</h3>
                  <p className="mb-4">
                    We may update this Privacy Policy from time to time. If changes are significant, we will notify you via email and/or a notice on our website before they take effect. The "Last updated" date will reflect the most recent revision.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">10. Contact Us</h3>
                  <p className="mb-4">If you have any questions about this Privacy Policy, you can contact us:</p>
                  <p>By email: romanvieito@gmail.com<br />
                  Website: https://simplerb.com</p>
                </div>

                <p className="mt-8">
                  By using our Services, you agree to this Privacy Policy. If you do not agree, please discontinue use of our Platform.
                </p>
              </div>
            </Container>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

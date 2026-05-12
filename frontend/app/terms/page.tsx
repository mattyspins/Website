"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, FileText, Calendar } from "lucide-react";

export default function TermsOfService() {
  const lastUpdated = "January 1, 2024";

  return (
    <div className="min-h-screen  p-4 pt-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Terms of Service
            </h1>
          </div>

          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <Calendar className="w-4 h-4" />
            <span>Last updated: {lastUpdated}</span>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 space-y-8"
        >
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing and using MattySpins ("the Platform"), you accept and
              agree to be bound by the terms and provision of this agreement. If
              you do not agree to abide by the above, please do not use this
              service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              2. Platform Description
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              MattySpins is a gaming community platform that provides:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>â€¢ Live streaming entertainment</li>
              <li>â€¢ Community leaderboards and competitions</li>
              <li>â€¢ Interactive gaming experiences</li>
              <li>â€¢ Points-based reward system</li>
              <li>â€¢ Community forums and social features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              3. User Accounts
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              To access certain features, you must create an account through
              Discord authentication. You are responsible for:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>â€¢ Maintaining the confidentiality of your account</li>
              <li>â€¢ All activities that occur under your account</li>
              <li>â€¢ Providing accurate and current information</li>
              <li>â€¢ Notifying us of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              4. Acceptable Use
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You agree not to use the Platform to:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>â€¢ Violate any applicable laws or regulations</li>
              <li>â€¢ Harass, abuse, or harm other users</li>
              <li>â€¢ Distribute spam, malware, or malicious content</li>
              <li>â€¢ Attempt to gain unauthorized access to systems</li>
              <li>â€¢ Engage in any form of cheating or exploitation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              5. Points and Rewards
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Points earned on the Platform have no monetary value and cannot be
              exchanged for cash. Points may be used to purchase virtual items
              or participate in platform activities. We reserve the right to
              modify the points system at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              6. Content and Intellectual Property
            </h2>
            <p className="text-gray-300 leading-relaxed">
              All content on the Platform, including but not limited to text,
              graphics, logos, and software, is the property of MattySpins or
              its licensors and is protected by copyright and other intellectual
              property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              7. Disclaimer of Warranties
            </h2>
            <p className="text-gray-300 leading-relaxed">
              The Platform is provided "as is" without any warranties, express
              or implied. We do not guarantee that the service will be
              uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-gray-300 leading-relaxed">
              MattySpins shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages resulting from your
              use of the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              9. Termination
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We may terminate or suspend your account at any time for
              violations of these terms. You may also terminate your account at
              any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              10. Changes to Terms
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify these terms at any time. Changes
              will be effective immediately upon posting. Continued use of the
              Platform constitutes acceptance of modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              11. Contact Information
            </h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about these Terms of Service, please
              contact us through our Discord community or email us at
              legal@mattyspins.com.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}


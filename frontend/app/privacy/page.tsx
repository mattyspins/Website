"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Shield, Calendar } from "lucide-react";

export default function PrivacyPolicy() {
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
            <Shield className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Privacy Policy
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
              1. Information We Collect
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We collect information you provide directly to us and information
              we obtain automatically when you use our Platform:
            </p>

            <h3 className="text-xl font-semibold text-white mb-3">
              Information You Provide:
            </h3>
            <ul className="text-gray-300 space-y-2 ml-6 mb-4">
              <li>â€¢ Discord account information (username, ID, avatar)</li>
              <li>â€¢ Kick.com username (if you choose to link it)</li>
              <li>â€¢ Communication preferences</li>
              <li>â€¢ Any content you submit to the Platform</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3">
              Information We Collect Automatically:
            </h3>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>â€¢ Usage data and analytics</li>
              <li>â€¢ Device and browser information</li>
              <li>â€¢ IP address and location data</li>
              <li>â€¢ Cookies and similar technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>â€¢ Provide and maintain our services</li>
              <li>â€¢ Process transactions and manage your account</li>
              <li>â€¢ Send you updates and promotional communications</li>
              <li>â€¢ Improve our Platform and user experience</li>
              <li>â€¢ Ensure security and prevent fraud</li>
              <li>â€¢ Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              3. Information Sharing
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We do not sell, trade, or rent your personal information to third
              parties. We may share your information in the following
              circumstances:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>â€¢ With your consent</li>
              <li>â€¢ To comply with legal requirements</li>
              <li>â€¢ To protect our rights and safety</li>
              <li>â€¢ With service providers who assist our operations</li>
              <li>â€¢ In connection with a business transfer</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              4. Data Security
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We implement appropriate technical and organizational measures to
              protect your personal information against unauthorized access,
              alteration, disclosure, or destruction. However, no method of
              transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              5. Data Retention
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your personal information for as long as necessary to
              provide our services and fulfill the purposes outlined in this
              policy, unless a longer retention period is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              6. Your Rights
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Depending on your location, you may have the following rights
              regarding your personal information:
            </p>
            <ul className="text-gray-300 space-y-2 ml-6">
              <li>â€¢ Access to your personal information</li>
              <li>â€¢ Correction of inaccurate information</li>
              <li>â€¢ Deletion of your personal information</li>
              <li>â€¢ Restriction of processing</li>
              <li>â€¢ Data portability</li>
              <li>â€¢ Objection to processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              7. Cookies and Tracking
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We use cookies and similar technologies to enhance your
              experience, analyze usage patterns, and provide personalized
              content. You can control cookie settings through your browser
              preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              8. Third-Party Services
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Our Platform may contain links to third-party websites or
              integrate with third-party services (Discord, Kick.com). We are
              not responsible for the privacy practices of these third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              9. Children's Privacy
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Our Platform is not intended for children under 13 years of age.
              We do not knowingly collect personal information from children
              under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              11. Contact Us
            </h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy or our data
              practices, please contact us at privacy@mattyspins.com or through
              our Discord community.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}


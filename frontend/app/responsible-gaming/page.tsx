"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Heart, ExternalLink, AlertTriangle } from "lucide-react";

export default function ResponsibleGaming() {
  const resources = [
    {
      name: "BeGambleAware",
      url: "https://www.begambleaware.org",
      description: "UK's leading charity for gambling harm prevention",
    },
    {
      name: "Gambling Therapy",
      url: "https://www.gamblingtherapy.org",
      description: "Free online support and counseling",
    },
    {
      name: "National Council on Problem Gambling",
      url: "https://www.ncpgambling.org",
      description: "US national helpline and resources",
    },
    {
      name: "GamCare",
      url: "https://www.gamcare.org.uk",
      description: "Free information, advice and support",
    },
  ];

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
            <Heart className="w-8 h-8 text-red-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Responsible Gaming
            </h1>
          </div>

          <p className="text-gray-400">
            Your wellbeing is our priority. Gaming should always be fun and
            entertaining.
          </p>
        </motion.div>

        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-yellow-300 font-semibold mb-2">
                Important Notice
              </h3>
              <p className="text-yellow-200 text-sm">
                If you or someone you know is struggling with gambling
                addiction, please seek help immediately. Gambling should never
                interfere with your responsibilities, relationships, or
                financial stability.
              </p>
            </div>
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
              Our Commitment
            </h2>
            <p className="text-gray-300 leading-relaxed">
              MattySpins is committed to promoting responsible gaming practices.
              While our platform provides entertainment and community features,
              we recognize that gambling can become problematic for some
              individuals. We encourage all users to gamble responsibly and seek
              help if needed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Warning Signs
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Be aware of these potential warning signs of problem gambling:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-red-300 font-semibold mb-3">
                  Behavioral Signs
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>â€¢ Gambling more than you can afford</li>
                  <li>â€¢ Chasing losses with bigger bets</li>
                  <li>â€¢ Lying about gambling activities</li>
                  <li>â€¢ Neglecting work, family, or responsibilities</li>
                  <li>â€¢ Borrowing money to gamble</li>
                </ul>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <h3 className="text-orange-300 font-semibold mb-3">
                  Emotional Signs
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>â€¢ Feeling anxious when not gambling</li>
                  <li>â€¢ Mood swings related to wins/losses</li>
                  <li>â€¢ Gambling to escape problems</li>
                  <li>â€¢ Feeling guilty or ashamed</li>
                  <li>â€¢ Loss of interest in other activities</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Responsible Gaming Tips
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h3 className="text-green-300 font-semibold mb-2">
                    Set Limits
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Decide on time and money limits before you start gambling
                    and stick to them.
                  </p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-blue-300 font-semibold mb-2">
                    Take Breaks
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Regular breaks help maintain perspective and prevent
                    impulsive decisions.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h3 className="text-purple-300 font-semibold mb-2">
                    Never Chase Losses
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Accept losses as part of the entertainment cost. Don't try
                    to win back money.
                  </p>
                </div>
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
                  <h3 className="text-pink-300 font-semibold mb-2">
                    Stay Balanced
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Maintain other interests and activities. Gambling should not
                    be your only hobby.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Self-Assessment
            </h2>
            <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-6">
              <p className="text-gray-300 mb-4">
                Ask yourself these questions honestly:
              </p>
              <ul className="text-gray-300 space-y-2">
                <li>â€¢ Do you gamble more than you originally intended?</li>
                <li>â€¢ Have you ever lied about your gambling activities?</li>
                <li>
                  â€¢ Do you feel restless or irritable when trying to cut down?
                </li>
                <li>
                  â€¢ Have you jeopardized relationships or opportunities because
                  of gambling?
                </li>
                <li>
                  â€¢ Do you gamble to escape from problems or negative feelings?
                </li>
              </ul>
              <p className="text-yellow-300 text-sm mt-4 font-semibold">
                If you answered "yes" to any of these questions, consider
                seeking professional help.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Get Help</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              If you're concerned about your gambling habits or need support,
              these organizations provide free, confidential help:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {resources.map((resource, index) => (
                <motion.a
                  key={resource.name}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 hover:bg-blue-500/20 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-blue-300 font-semibold mb-2 group-hover:text-blue-200">
                        {resource.name}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {resource.description}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0 ml-2" />
                  </div>
                </motion.a>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              Emergency Contacts
            </h2>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-red-300 font-semibold mb-4">
                Crisis Helplines
              </h3>
              <div className="space-y-3 text-gray-300">
                <div>
                  <strong>UK:</strong> National Gambling Helpline - 0808 8020
                  133
                </div>
                <div>
                  <strong>US:</strong> National Problem Gambling Helpline -
                  1-800-522-4700
                </div>
                <div>
                  <strong>International:</strong> Visit{" "}
                  <a
                    href="https://www.gamblingtherapy.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    GamblingTherapy.org
                  </a>{" "}
                  for local resources
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Our Support</h2>
            <p className="text-gray-300 leading-relaxed">
              If you need to take a break from our platform or have concerns
              about your gaming habits, please reach out to our support team
              through Discord. We're here to help and can provide information
              about self-exclusion options and additional resources.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}


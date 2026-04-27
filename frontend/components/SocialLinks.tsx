"use client";

import { motion } from "framer-motion";
import {
  ExternalLink,
  MessageCircle,
  Users,
  Bell,
  Play,
  Camera,
} from "lucide-react";

interface SocialLink {
  name: string;
  url: string;
  icon: any;
  color: string;
  bgColor: string;
  followers: string;
}

const socialLinks: SocialLink[] = [
  {
    name: "Discord",
    url: "#",
    icon: MessageCircle,
    color: "text-[#5865F2]",
    bgColor: "bg-[#5865F2]/20 hover:bg-[#5865F2]/30",
    followers: "8.2K members",
  },
  {
    name: "Kick",
    url: "https://kick.com/mattyspinsslots",
    icon: Users,
    color: "text-[#53FC18]",
    bgColor: "bg-[#53FC18]/20 hover:bg-[#53FC18]/30",
    followers: "12.5K followers",
  },
  {
    name: "YouTube",
    url: "#",
    icon: Play,
    color: "text-[#FF0000]",
    bgColor: "bg-[#FF0000]/20 hover:bg-[#FF0000]/30",
    followers: "45.2K subscribers",
  },
  {
    name: "Instagram",
    url: "#",
    icon: Camera,
    color: "text-[#E4405F]",
    bgColor: "bg-[#E4405F]/20 hover:bg-[#E4405F]/30",
    followers: "28.7K followers",
  },
  {
    name: "Twitter",
    url: "#",
    icon: Bell,
    color: "text-[#1DA1F2]",
    bgColor: "bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30",
    followers: "5.8K followers",
  },
];

export default function SocialLinks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="mt-20 text-center"
    >
      <h2 className="text-3xl font-bold mb-8 neon-text text-neon-gold">
        Join the Community
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
        {socialLinks.map((link, index) => (
          <motion.a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 + index * 0.1, duration: 0.4 }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className={`group glass rounded-xl p-6 transition-all duration-300 ${link.bgColor} border border-gray-700 hover:border-gray-600`}
          >
            <div className="flex flex-col items-center space-y-4">
              <div
                className={`p-4 rounded-full bg-gray-800/50 group-hover:bg-gray-800/70 transition-colors`}
              >
                <link.icon className={`w-8 h-8 ${link.color}`} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {link.name}
                </h3>
                <p className="text-gray-400 text-sm mb-3">{link.followers}</p>

                <div className="flex items-center space-x-2 text-gray-300 group-hover:text-white transition-colors">
                  <span className="text-sm font-semibold">Join Now</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="mt-12 p-6 glass rounded-xl max-w-2xl mx-auto"
      >
        <h3 className="text-xl font-bold mb-4 text-neon-pink">
          Stay Connected
        </h3>
        <p className="text-gray-300 mb-4">
          Get notified about live streams, exclusive giveaways, and community
          events. Join our growing community of gaming enthusiasts!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="btn-glow bg-gradient-to-r from-neon-blue to-blue-600 hover:from-blue-600 hover:to-neon-gold text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300">
            🔔 Enable Notifications
          </button>

          <button className="btn-glow glass border-2 border-neon-gold hover:bg-neon-gold/20 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300">
            📧 Newsletter Signup
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

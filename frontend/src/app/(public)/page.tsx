"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Building, Heart, Users, MapPin, Award, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import GallerySection from "@/components/home/GallerySection";

const stats = [
  { label: "Registered Members", value: "2,500+", icon: Users },
  { label: "Bhavan Bookings", value: "480+", icon: Building },
  { label: "Events Organized", value: "120+", icon: Calendar },
  { label: "Total Families", value: "850+", icon: Award },
];

const features = [
  {
    title: "Bhavan Booking",
    description: "Book spacious rooms, AC halls, and modern facilities online with transparent pricing and real-time availability check.",
    icon: Building,
    href: "/bhavan",
    actionText: "Book Hall",
    color: "from-amber-500 to-orange-600"
  },
  {
    title: "Community Events",
    description: "Get digital passes for cultural, religious, educational, and social events with automated QR ticketing and entry check-in.",
    icon: Calendar,
    href: "/events",
    actionText: "Explore Events",
    color: "from-rose-500 to-red-600"
  },
  {
    title: "Donation Schemes",
    description: "Contribute to various welfare schemes, education funds, and medical aids securely online. Download instant PDF receipts.",
    icon: Heart,
    href: "/donate",
    actionText: "Donate Now",
    color: "from-emerald-500 to-teal-600"
  }
];

export default function HomePage() {
  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-zinc-950/20 dark:via-zinc-900 dark:to-zinc-900">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
              <CheckCircle className="w-3.5 h-3.5" /> Digitize · Connect · Grow
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
              Welcome to the <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                Agrawal Samaj Portal
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-600 dark:text-zinc-300 leading-relaxed">
              A comprehensive digital home for the Agrawal Samaj community to manage family directories, event registrations, bhavan bookings, and real-time announcements.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-lg shadow-lg shadow-amber-500/25 hover:shadow-orange-600/30 transition-all hover:scale-[1.01]"
              >
                Join the Directory
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/about"
                className="flex items-center justify-center px-8 py-4 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-lg bg-white/50 dark:bg-zinc-900/50 backdrop-blur hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-zinc-50 dark:bg-zinc-950/40 py-16 border-y border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center space-y-2 group"
              >
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
            Core Portal Features
          </h2>
          <p className="max-w-2xl mx-auto text-zinc-600 dark:text-zinc-400">
            Easily manage all your interactions within the Samaj community from a single, beautiful dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
              className="flex flex-col justify-between p-8 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="space-y-6">
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.color} text-white shadow-md`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-amber-500 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
              <div className="pt-6">
                <Link
                  href={feature.href}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                >
                  {feature.actionText} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Gallery Section */}
      <GallerySection />

      {/* Banner/Maharaja Agrasen Quote */}
      <section className="bg-gradient-to-r from-amber-500/90 to-orange-600/90 text-white py-20 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6 z-10 relative">
          <blockquote className="text-2xl sm:text-3xl font-medium italic leading-relaxed">
            "A society can only progress when the welfare of every citizen is secured, and we support one another as a single family."
          </blockquote>
          <cite className="block text-lg font-semibold uppercase tracking-wider not-italic">
            — Maharaja Agrasen
          </cite>
        </div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-zinc-900 to-black z-0" />
      </section>
    </div>
  );
}

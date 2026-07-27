"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Building, Heart, Users, Award, CheckCircle } from "lucide-react";
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
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 z-0 animated-gradient-mesh opacity-70" />
        <div className="absolute inset-0 z-0">
          <motion.div
            className="absolute top-1/4 left-1/10 w-[30rem] h-[30rem] bg-amber-500/30 rounded-full blur-3xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6], x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/10 w-[30rem] h-[30rem] bg-rose-500/30 rounded-full blur-3xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6], x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24rem] h-[24rem] bg-orange-400/20 rounded-full blur-3xl"
            animate={{ scale: [1, 1.4, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="max-w-7xl mx-auto z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <motion.span
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white/60 text-amber-700 border border-white/80 glass-panel glow-pulse"
              whileHover={{ scale: 1.05 }}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Digitize · Connect · Grow
            </motion.span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-900 leading-none">
              Welcome to the <br className="hidden sm:inline" />
              <span className="text-gradient-vivid drop-shadow-sm">
                Agrawal Samaj Portal
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-700 leading-relaxed font-medium">
              A comprehensive digital home for the Agrawal Samaj community to manage family directories, event registrations, bhavan bookings, and real-time announcements.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="group relative flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white font-bold text-lg shadow-2xl shadow-orange-500/50 transition-all hover:scale-[1.05] active:scale-[0.97] glow-pulse overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative">Join the Directory</span>
                <ArrowRight className="w-5 h-5 relative transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/about"
                className="flex items-center justify-center px-8 py-4 rounded-full border border-white/80 text-zinc-800 font-bold text-lg glass-panel hover:bg-white/70 transition-all hover:scale-[1.05] active:scale-[0.97]"
              >
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 border-y border-white/40 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -6, scale: 1.03 }}
                className="text-center space-y-2 group glass-panel rounded-3xl py-6 px-3 shadow-xl"
              >
                <div className="inline-flex p-3 rounded-2xl bg-white/40 text-white group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-md">
                  {stat.value}
                </div>
                <div className="text-sm font-bold text-white/90">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-amber-50/40 to-white -z-10" />
        <div className="absolute top-1/3 left-0 w-72 h-72 bg-amber-300/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-rose-300/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-900">
              Core Portal <span className="text-gradient-vivid">Features</span>
            </h2>
            <p className="max-w-2xl mx-auto text-zinc-600 text-lg">
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
                whileHover={{ y: -10, scale: 1.02 }}
                className="relative flex flex-col justify-between p-8 rounded-[2rem] glass-panel shadow-lg hover:shadow-2xl transition-shadow duration-300 group overflow-hidden"
              >
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${feature.color} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-300`} />
                <div className="space-y-6 relative">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.color} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <div className="pt-6 relative">
                  <Link
                    href={feature.href}
                    className={`inline-flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}
                  >
                    {feature.actionText} <ArrowRight className="w-4 h-4 text-amber-600 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <GallerySection />

      {/* Banner/Maharaja Agrasen Quote */}
      <section className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 text-white py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <motion.div
          className="absolute -top-20 -left-20 w-96 h-96 bg-white/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto space-y-6 z-10 relative glass-panel-dark rounded-[2.5rem] p-10 sm:p-14 shadow-2xl"
        >
          <blockquote className="text-2xl sm:text-3xl font-medium italic leading-relaxed">
            "A society can only progress when the welfare of every citizen is secured, and we support one another as a single family."
          </blockquote>
          <cite className="block text-lg font-semibold uppercase tracking-wider not-italic">
            — Maharaja Agrasen
          </cite>
        </motion.div>
      </section>
    </div>
  );
}

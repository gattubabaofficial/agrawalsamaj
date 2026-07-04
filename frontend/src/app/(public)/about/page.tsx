"use client";

import { motion } from "framer-motion";
import { Users, Target, Award, ShieldCheck } from "lucide-react";

const team = [
  { name: "Shri Ramesh Agrawal", role: "President", image: "/team1.jpg" },
  { name: "Shri Suresh Agrawal", role: "General Secretary", image: "/team2.jpg" },
  { name: "Shri Mahesh Agrawal", role: "Treasurer", image: "/team3.jpg" },
];

export default function AboutPage() {
  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50">
      <div className="max-w-5xl mx-auto space-y-20">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 bg-clip-text text-transparent"
          >
            About Agrawal Samaj
          </motion.h1>
          <p className="max-w-2xl mx-auto text-zinc-600">
            Dedicated to community welfare, heritage preservation, and building a stronger network for the Agrawal family.
          </p>
        </div>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl border border-zinc-200/50 bg-white space-y-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 inline-block">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">Our Vision</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              To unite the Agrawal Samaj globally, facilitating social solidarity, educational growth, and sustainable support programs based on the principles of Maharaja Agrasen.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-zinc-200/50 bg-white space-y-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 inline-block">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">Our Mission</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              To build robust community infrastructures (Bhavans), organize meaningful events, digitize family linkages, and implement transparent online donation channels for community development.
            </p>
          </div>
        </div>

        {/* Committee */}
        <div className="space-y-10">
          <h2 className="text-3xl font-bold text-center text-zinc-900">Committee Board</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <div key={member.name} className="p-6 rounded-2xl border border-zinc-200/50 bg-white text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold border border-amber-500/20">
                  {member.name.split(" ").slice(1).map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{member.name}</h3>
                  <p className="text-xs text-amber-600 font-semibold mt-1">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

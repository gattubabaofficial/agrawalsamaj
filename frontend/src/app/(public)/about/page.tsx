"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Users, Target, Award, ShieldCheck } from "lucide-react";
import { LEADERS, photo } from "@/components/home/padadhikariRoster";

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
            About Agrawal Samaj Mansrovar Jaipur
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
              To unite the Agrawal Samaj Mansrovar Jaipur globally, facilitating social solidarity, educational growth, and sustainable support programs based on the principles of Maharaja Agrasen.
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

        {/* Core Covenant: 1 Rupee 1 Brick */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 border border-amber-200/60 space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-amber-500/20">
              १/१
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-900">The Legend of Agroha: &quot;One Rupee, One Brick&quot;</h2>
              <p className="text-sm text-zinc-600 leading-relaxed max-w-3xl">
                Founded on the timeless principle of Maharaja Agrasen, every newcomer to Agroha was welcomed with 1 Rupee and 1 Brick from each household. This ensured dignified settlement, economic empowerment, non-violence (Ahimsa), and mutual brotherhood across the community.
              </p>
            </div>
          </div>
        </div>

        {/* Community Pillars */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-zinc-900">Key Community Pillars &amp; Initiatives</h2>
            <p className="text-sm text-zinc-500 max-w-xl mx-auto">Core programs inspired by national Agrawal Samaj welfare initiatives.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-zinc-200/50 bg-white space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">🏛️</div>
              <h3 className="font-bold text-zinc-900">Sabha &amp; Directory</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Connecting local Sabhas, colony committees, and registered member households under a unified digital network.</p>
            </div>
            <div className="p-6 rounded-2xl border border-zinc-200/50 bg-white space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">🎓</div>
              <h3 className="font-bold text-zinc-900">Education &amp; Merit</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Scholarships, financial aid, and career counseling for deserving students of the community.</p>
            </div>
            <div className="p-6 rounded-2xl border border-zinc-200/50 bg-white space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">🏥</div>
              <h3 className="font-bold text-zinc-900">Health &amp; Welfare</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Free medical check-up camps, blood donation drives, and emergency assistance for families.</p>
            </div>
            <div className="p-6 rounded-2xl border border-zinc-200/50 bg-white space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">🏢</div>
              <h3 className="font-bold text-zinc-900">Bhavan Facilities</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Seamless booking of Agrasen Bhawan halls and rooms for weddings, festivals, and social gatherings.</p>
            </div>
          </div>
        </div>

        {/* Historical Literature & References */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-zinc-900">प्राचीन इतिहास एवं ऐतिहासिक शोध साहित्य</h2>
            <p className="text-sm text-zinc-500 max-w-xl mx-auto">अग्रवाल समाज के इतिहास, गोत्र परम्परा एवं सामाजिक विकास पर आधारित प्रमुख ग्रन्थ।</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500/5 via-white to-amber-500/10 space-y-4 relative overflow-hidden group hover:border-amber-400 transition-all shadow-sm">
              <div className="flex items-start justify-between">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold">
                  📖 ग्रन्थ १
                </span>
                <span className="text-xs text-zinc-400 font-semibold">डॉ. सत्यकेतु विद्यालंकार</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 leading-snug">
                अग्रवाल जाति का प्राचीन इतिहास
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                महाराजा अग्रसेन की सूर्यवंश परम्परा, अग्रोहा गणराज्य का निर्माण, १८ महायज्ञों से १८ गोत्रों की उत्पत्ति एवं &quot;१ रुपया १ ईंट&quot; के महान सामाजिक सिद्धान्त का प्रामाणिक ऐतिहासिक विवरण।
              </p>
              <div className="pt-2">
                <a
                  href="/history#granth-1"
                  className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-800 underline underline-offset-4"
                >
                  ग्रन्थ का विस्तारपूर्वक अध्ययन करें &rarr;
                </a>
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-500/5 via-white to-orange-500/10 space-y-4 relative overflow-hidden group hover:border-rose-400 transition-all shadow-sm">
              <div className="flex items-start justify-between">
                <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-bold">
                  📚 ग्रन्थ २
                </span>
                <span className="text-xs text-zinc-400 font-semibold">ऐतिहासिक अध्ययन</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 leading-snug">
                अग्रवाल जाति का विकास
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                अग्रवाल समाज का व्यापारिक उद्भव, मण्डियों एवं हवेलियों की स्थापना, दान-धर्म की परम्परा, धर्मशालाएँ, शिक्षण संस्थान एवं आधुनिक अग्रवाल सभाओं का क्रमिक विकास।
              </p>
              <div className="pt-2">
                <a
                  href="/history#granth-2"
                  className="inline-flex items-center gap-2 text-xs font-bold text-rose-700 hover:text-rose-800 underline underline-offset-4"
                >
                  ग्रन्थ का विस्तारपूर्वक अध्ययन करें &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Committee */}
        <div className="space-y-10">
          <h2 className="text-3xl font-bold text-center text-zinc-900">Committee Board</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {LEADERS.map((leader) => (
              <div key={leader.slug} className="p-6 rounded-2xl border border-zinc-200/50 bg-white text-center space-y-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden mx-auto border border-amber-500/20">
                  <Image
                    src={photo(leader.slug)}
                    alt={`${leader.latin} — ${leader.name}`}
                    fill
                    sizes="96px"
                    className="object-cover object-top"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{leader.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{leader.latin}</p>
                  <p className="text-xs text-amber-600 font-semibold mt-1">{leader.designationEn}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Users, Award, ShieldCheck, Heart } from "lucide-react";

export default function About() {
  const stats = [
    { label: "Active Members", value: "10,000+" },
    { label: "Families Registered", value: "2,400+" },
    { label: "Bhavans Operated", value: "3 Facilities" },
    { label: "Years of Heritage", value: "50+ Years" },
  ];

  const coreValues = [
    {
      icon: <Users className="w-6 h-6 text-bhagwa" />,
      title: "Unity & Brotherhood",
      description: "Bringing together all families of the Agrawal community under a single interactive digital umbrella.",
    },
    {
      icon: <Award className="w-6 h-6 text-bhagwa" />,
      title: "Heritage Preservation",
      description: "Preserving and promoting the rich cultural history and values laid down by Maharaja Agrasen.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-bhagwa" />,
      title: "Trust & Transparency",
      description: "Ensuring secure and fully transparent booking, donations, check-ins, and data protection policies.",
    },
    {
      icon: <Heart className="w-6 h-6 text-bhagwa" />,
      title: "Social Welfare",
      description: "Mobilizing resources for educational scholarships, healthcare drives, and charitable support.",
    },
  ];

  const boardMembers = [
    {
      name: "Ramesh Chand Agrawal",
      role: "President",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    },
    {
      name: "Suresh Kumar Agrawal",
      role: "Vice President",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    },
    {
      name: "Mahendra Agrawal",
      role: "General Secretary",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    },
    {
      name: "Dinesh Agrawal",
      role: "Treasurer",
      image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">
      <Header />

      {/* Main Container */}
      <main className="flex-grow">
        {/* Banner Section */}
        <section className="bg-gradient-to-b from-orange-50/50 to-white px-6 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">
              About <span className="text-bhagwa">Agrawal Samaj</span>
            </h1>
            <p className="text-lg text-gray-600 font-medium leading-relaxed">
              Discover our history, understand our mission, and meet the leadership driving community development and cultural integration.
            </p>
          </div>
        </section>

        {/* History Overview */}
        <section className="px-6 py-16 max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-5">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Our Legacy & Purpose</h2>
            <p className="text-gray-600 leading-relaxed font-medium">
              Established with the core tenets of Maharaja Agrasen, the Agrawal Samaj has been at the forefront of social service, cultural heritage, and commercial trust for generations. 
            </p>
            <p className="text-gray-600 leading-relaxed font-medium">
              Our digital platform is the next step in our evolution, enabling members to access Bhavan facilities, stay informed about historical events, register family details securely, and build long-lasting connections.
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-3xl p-8 md:p-10 flex flex-col gap-6">
            <h3 className="text-xl font-bold text-bhagwa">Maharaja Agrasen Principles</h3>
            <blockquote className="border-l-4 border-bhagwa pl-4 italic text-gray-700 font-medium">
              &quot;One brick and one rupee rule — everyone contributes a small token to help any new family settle into the community.&quot;
            </blockquote>
            <p className="text-sm text-muted-text font-medium">
              This timeless philosophy of mutual aid forms the foundation of all our digital booking schemes, welfare donations, and community-wide projects.
            </p>
          </div>
        </section>

        {/* Community Stats */}
        <section className="bg-gray-50 border-y border-gray-100 py-16 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center flex flex-col gap-1">
                <p className="text-3xl md:text-4xl font-black text-bhagwa">{stat.value}</p>
                <p className="text-xs font-bold text-muted-text uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Core Values */}
        <section className="px-6 py-20 max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16 flex flex-col gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight">Our Core Values</h2>
            <p className="text-muted-text font-medium">Guiding principles that steer our Samaj portal operations and community initiatives.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {coreValues.map((value, i) => (
              <div key={i} className="border border-light-border bg-white rounded-2xl p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                  {value.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{value.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Board Members */}
        <section className="bg-gray-50 border-t border-gray-100 py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-16 flex flex-col gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight">Samaj Board Members</h2>
              <p className="text-muted-text font-medium">Leading figures managing the administrative decisions and welfare policies of the Samaj.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
              {boardMembers.map((member, i) => (
                <div key={i} className="bg-white border border-light-border rounded-2xl p-6 text-center w-full max-w-xs hover:shadow-md transition-shadow flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-orange-100 border border-orange-200 overflow-hidden flex items-center justify-center text-bhagwa font-black text-2xl">
                    {member.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{member.name}</h3>
                    <p className="text-xs font-bold text-bhagwa uppercase tracking-wider mt-1">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

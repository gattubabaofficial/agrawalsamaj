"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { MapPin, Phone, Mail, Send, CheckCircle2 } from "lucide-react";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const contactCards = [
    {
      icon: <MapPin className="w-6 h-6 text-bhagwa" />,
      title: "Samaj Headquarters",
      details: ["Agrawal Samaj Bhavan", "Patrakar Colony Road, Mansarovar", "Jaipur, Rajasthan - 302020"],
    },
    {
      icon: <Phone className="w-6 h-6 text-bhagwa" />,
      title: "Phone Lines",
      details: ["Help Desk: +91 98765 43210", "Office Landline: +91 141 234567", "Mon - Sat: 9:00 AM to 6:00 PM"],
    },
    {
      icon: <Mail className="w-6 h-6 text-bhagwa" />,
      title: "Email Support",
      details: ["support.samaj@gmail.com", "info.agrawalsamaj@org", "Response within 24 hours"],
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      alert("Please fill in Name, Email, and Message.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col antialiased">
      <Header />

      <main className="flex-grow">
        {/* Banner Section */}
        <section className="bg-gradient-to-b from-orange-50/50 to-white px-6 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">
              Contact <span className="text-bhagwa">Our Board</span>
            </h1>
            <p className="text-lg text-gray-600 font-medium leading-relaxed">
              Have questions regarding membership registration, Bhavan room bookings, or charity schemes? Get in touch with our help desk.
            </p>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="px-6 py-12 max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {contactCards.map((card, i) => (
            <div
              key={i}
              className="border border-light-border bg-white rounded-2xl p-8 flex flex-col items-center text-center gap-4 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                {card.icon}
              </div>
              <h3 className="font-extrabold text-lg text-gray-900">{card.title}</h3>
              <div className="text-sm text-gray-600 font-semibold leading-relaxed flex flex-col gap-1">
                {card.details.map((detail, idx) => (
                  <p key={idx}>{detail}</p>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Form and Map Layout */}
        <section className="px-6 py-12 max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-stretch mb-12">
          {/* Inquiry Form */}
          <div className="bg-white border border-light-border rounded-3xl p-8 md:p-10 shadow-sm flex flex-col">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-grow justify-center">
                <h3 className="font-extrabold text-2xl text-gray-900 mb-2">Send an Inquiry Message</h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Agrawal"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bhagwa font-semibold text-black"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Your Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bhagwa font-semibold text-black"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Subject Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bhavan Booking Query"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bhagwa font-semibold text-black"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-text uppercase tracking-wider">Message Details</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your inquiry or question in detail here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-bhagwa font-semibold text-black resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-bhagwa hover:bg-bhagwa-hover text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-bhagwa/15 mt-2 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Inquiry
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center text-center justify-center gap-6 py-12 flex-grow">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-extrabold text-2xl text-gray-900">Message Submitted</h3>
                  <p className="text-sm text-gray-500 font-medium mt-1 leading-relaxed max-w-sm">
                    Thank you, {name}. Your inquiry has been received. Our support volunteers will contact you soon.
                  </p>
                </div>
                <button
                  onClick={() => setSubmitted(false)}
                  className="bg-black text-white hover:bg-gray-800 px-6 py-3 rounded-xl text-sm font-bold"
                >
                  Send Another Message
                </button>
              </div>
            )}
          </div>

          {/* Interactive Map Visual */}
          <div className="border border-light-border bg-gray-50 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-center items-center p-8 text-center text-muted-text min-h-[400px]">
            <MapPin className="w-14 h-14 text-bhagwa/80 mb-3 animate-pulse" />
            <h4 className="font-extrabold text-lg text-gray-900 mb-1">Office Location Map</h4>
            <p className="text-xs text-gray-500 font-medium max-w-xs mb-6 leading-relaxed">
              Mansarovar Patrakar Colony office location.
            </p>
            <div className="w-full h-48 bg-white border border-gray-200/80 rounded-2xl flex items-center justify-center shadow-inner">
              <span className="text-xs font-bold text-gray-400">Google Map Sandbox Preview</span>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { BookOpen, ShieldCheck, Scroll, Landmark, History as HistoryIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";

const GOTRAS = [
  { hindi: "गर्ग", rishi: "गर्ग ऋषि" },
  { hindi: "गोयल", rishi: "गोभिल ऋषि" },
  { hindi: "कुच्छल / गौतम", rishi: "गौतम ऋषि" },
  { hindi: "बंसल", rishi: "वत्स ऋषि" },
  { hindi: "मित्तल", rishi: "विश्वामित्र ऋषि" },
  { hindi: "सिंघल", rishi: "शाण्डिल्य ऋषि" },
  { hindi: "जिंदल", rishi: "जैमिनी ऋषि" },
  { hindi: "तिंगल", rishi: "ताण्ड्य ऋषि" },
  { hindi: "तायल", rishi: "त्रिपुर ऋषि" },
  { hindi: "बिंदल", rishi: "व्यास ऋषि" },
  { hindi: "धारण", rishi: "धौम्य ऋषि" },
  { hindi: "नागल", rishi: "नागदेव ऋषि" },
  { hindi: "ऐरण", rishi: "और्व ऋषि" },
  { hindi: "मधुर", rishi: "माण्डव्य ऋषि" },
  { hindi: "भंदल", rishi: "भरद्वाज ऋषि" },
  { hindi: "गोयन", rishi: "गौतम ऋषि" },
  { hindi: "मंगल", rishi: "मुद्गल ऋषि" },
  { hindi: "कांसल", rishi: "काश्यप ऋषि" },
];

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Navigation & Header */}
        <div className="space-y-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full transition-all mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> मुख्य पृष्ठ पर लौटें (Back to Home)
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm font-semibold mx-auto">
            <HistoryIcon className="w-4 h-4 text-amber-600" />
            ऐतिहासिक ग्रन्थ एवं शोध साहित्य
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
            अग्रवाल समाज का प्राचीन इतिहास एवं विकास
          </h1>
          <p className="max-w-2xl mx-auto text-zinc-600 text-sm sm:text-base leading-relaxed">
            महाराजा अग्रसेन की पावन धरा अग्रोहा, सूर्यवंशी परम्परा, १८ गोत्रों की रचना एवं सामाजिक स्वावलम्बन का ऐतिहासिक प्रामाणिक विवरण।
          </p>
        </div>

        {/* Banner: 1 Rupee 1 Brick Covenant */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 border border-amber-300/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-20 h-20 shrink-0 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-xl shadow-amber-500/20">
              १/१
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-zinc-950">अग्रोहा का अमर सन्देश: &quot;एक रुपया और एक ईंट&quot;</h2>
              <p className="text-sm text-zinc-700 leading-relaxed max-w-3xl">
                विश्व के इतिहास में सामाजिक समरसता और समाजवाद का सर्वोत्कृष्ट उदाहरण महाराजा अग्रसेन का यह नियम था— जब भी कोई नया व्यक्ति अग्रोहा में बसने आता, तो नगर का प्रत्येक निवासी उसे <strong>१ रुपया एवं १ ईंट</strong> भेंट करता। १ ईंट से उसका गृह बनता तथा १-१ रुपये की निधि से उसका व्यापार स्थापित होता था।
              </p>
            </div>
          </div>
        </div>

        {/* Grantha 1 Detailed Card */}
        <div id="granth-1" className="scroll-mt-24 p-8 sm:p-10 rounded-3xl bg-white border border-amber-200/80 shadow-md space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-6">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold">
                📖 ऐतिहासिक शोध ग्रन्थ १
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                अग्रवाल जाति का प्राचीन इतिहास
              </h2>
              <p className="text-xs text-amber-700 font-semibold">लेखक: डॉ. सत्यकेतु विद्यालंकार</p>
            </div>
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-600" /> प्रामाणिक शोध ग्रन्थ
            </div>
          </div>

          <div className="prose prose-zinc max-w-none text-sm leading-relaxed text-zinc-600 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">१. परिचय एवं प्रामाणिकता</h3>
              <p>
                सुप्रसिद्ध इतिहासकार <strong>डॉ. सत्यकेतु विद्यालंकार</strong> द्वारा रचित यह ग्रन्थ अग्रवाल समाज की प्राचीनता, सूर्यवंश परम्परा एवं अग्रोहा साम्राज्य का सर्वाधिक प्रामाणिक विवरण प्रस्तुत करता है। पौराणिक एवं पुरातात्विक प्रमाणों के आधार पर यह ग्रन्थ महाराजा अग्रसेन के लोक-कल्याणकारी शासन का उल्लेख करता है।
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">२. सूर्यवंश परम्परा एवं अहिंसा दर्शन</h3>
              <p>
                महाराजा अग्रसेन का जन्म प्रतापनगर के राजा वल्लभसेन के कुल में हुआ। उन्होंने यज्ञों में पशु-बलि की प्रथा पर पूर्ण विराम लगाकर सम्पूर्ण समाज को अहिंसा, व्यापार, गो-पालन एवं कृषि आधारित अर्थव्यवस्था से जोड़ा।
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-3">३. महाराजा अग्रसेन द्वारा स्थापित १८ गोत्र एवं उनके ऋषि</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {GOTRAS.map((g, idx) => (
                  <div key={g.hindi} className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-center space-y-1">
                    <p className="font-bold text-amber-900 text-sm">{g.hindi}</p>
                    <p className="text-[10px] text-amber-700 font-medium">{g.rishi}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">४. अग्रोहा से देशव्यापी प्रवास</h3>
              <p>
                विदेशी आक्रमणों के उपरान्त अग्रोहा के विनाश के पश्चात् अग्रवाल समाज राजस्थान (जयपुर, शेखावाटी, मारवाड़), मालवा, उत्तर प्रदेश और सम्पूर्ण भारत में स्थापित हुआ तथा सत्य, ईमानदारी व व्यापारिक साख से भारत की समृद्धि में योगदान दिया।
              </p>
            </div>
          </div>
        </div>

        {/* Grantha 2 Detailed Card */}
        <div id="granth-2" className="scroll-mt-24 p-8 sm:p-10 rounded-3xl bg-white border border-orange-200/80 shadow-md space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-6">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-700 text-xs font-bold">
                📚 ऐतिहासिक शोध ग्रन्थ २
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                अग्रवाल जाति का विकास
              </h2>
              <p className="text-xs text-orange-700 font-semibold">ऐतिहासिक एवं सामाजिक विकास अध्ययन</p>
            </div>
            <div className="px-4 py-2 bg-orange-50 border border-orange-200 rounded-2xl text-xs font-semibold text-orange-800 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-orange-600" /> सामाजिक विकास
            </div>
          </div>

          <div className="prose prose-zinc max-w-none text-sm leading-relaxed text-zinc-600 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">१. व्यापारिक उद्भव एवं मण्डियाँ</h3>
              <p>
                अग्रवाल समाज ने भारत के आर्थिक मानचित्र को रूप देने में महत्वपूर्ण भूमिका निभाई। जयपुर, जोधपुर, बीकानेर एवं शेखावाटी क्षेत्रों में व्यापारिक मण्डियों, हुंडी साख प्रणाली एवं भव्य हवेलियों की स्थापना में अग्रवाल श्रेष्ठियों का योगदान अविस्मरणीय है।
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">२. दान-धर्म एवं जन-कल्याण संस्थाएँ</h3>
              <p>
                अग्रवाल समाज की मुख्य पहचान दानशीलता रही है। भारत के हर नगर व तीर्थस्थल में अग्रवाल समाज द्वारा धर्मशालाएँ, अन्नक्षेत्र, गौशालाएँ, चिकित्सालय तथा महाराजा अग्रसेन भवनों का निर्माण कराया गया।
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">३. स्थानीय अग्रवाल सभाएँ एवं संगठन</h3>
              <p>
                अग्रवाल समाज की चेतना को संगठित करने के लिए अखिल भारतीय अग्रवाल सम्मेलन तथा स्थानीय स्तर पर मानसरोवर अग्रवाल समाज समिति जैसे संगठनों ने समाज बंधुओं को एकजुट किया।
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">४. आधुनिक भारत में अग्रवाल समाज</h3>
              <p>
                आज अग्रवाल समाज उद्योग, व्यापार, प्रशासनिक सेवाओं (IAS/IPS), चिकित्सा, इंजीनियरिंग एवं तकनीक में राष्ट्र निर्माण में अग्रणी भूमिका निभा रहा है।
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

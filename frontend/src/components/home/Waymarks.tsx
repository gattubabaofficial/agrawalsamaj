import Link from "next/link";
import { Heart, Calendar, Building, Info, Home, BookOpen, Users, History } from "lucide-react";
import { Eyebrow, Rule, Section } from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/motion";

/* A Hindi-language guide to the header navigation — for the visitor who
   reads the site in Hindi and wants to know what each button above does
   before clicking it. Mirrors navItems in components/layout/Navbar.tsx,
   icons included; keep the two in sync if a nav link is ever added,
   renamed, or removed.

   Note: Devanagari text never goes inside <Eyebrow> — that component
   uppercases and letter-spaces, which mangles the script (see the same
   warning in Padadhikari.tsx). Use .deva directly instead. */

const NAV_GUIDE = [
  { name: "होम", href: "/", icon: Home, description: "मुखपृष्ठ पर वापस लौटें — समाज की कहानी और ताज़ा जानकारी यहीं से शुरू होती है।" },
  { name: "भवन", href: "/bhavan", icon: Building, description: "अग्रसेन भवन में ठहरने की बुकिंग के लिए — कमरों की जानकारी, उपलब्धता और पूछताछ फ़ॉर्म।" },
  { name: "परिचय", href: "/about", icon: Info, description: "समाज का उद्देश्य, नेतृत्व और स्थापना की कहानी।" },
  { name: "इतिहास", href: "/history", icon: History, description: "समाज का प्रलेखित इतिहास और शोध सामग्री, हिंदी व अंग्रेज़ी दोनों में।" },
  { name: "सदस्य सूची", href: "/members", icon: Users, description: "नाम, फ़ोन नंबर या सदस्यता क्रमांक से किसी सदस्य को खोजें।" },
  { name: "कार्यक्रम", href: "/events", icon: Calendar, description: "आगामी आयोजनों की जानकारी और पास बुक करने की सुविधा।" },
  { name: "ब्लॉग", href: "/blog", icon: BookOpen, description: "समाज की कहानियाँ पढ़ें, या फ़ोन सत्यापन के बाद स्वयं लिखें।" },
  { name: "दान", href: "/donate", icon: Heart, description: "समाज के कार्यों में सीधे योगदान देने का माध्यम।" },
];

export default function Waymarks() {
  return (
    <Section className="bg-paper py-24 sm:py-32">
      <Reveal>
        <Rule />
      </Reveal>

      <div className="pt-14">
        <Reveal>
          <Eyebrow>Header navigation, in Hindi</Eyebrow>
        </Reveal>

        <Reveal delay={0.06} className="mt-5 max-w-2xl">
          <h2 className="deva text-3xl leading-tight text-ink sm:text-4xl">
            नेविगेशन बार की मार्गदर्शिका
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
            ऊपर मेनू में दिए गए हर बटन का संक्षिप्त परिचय — किसी भी कार्ड पर क्लिक करके सीधे उस पृष्ठ पर जाएँ।
          </p>
        </Reveal>

        <RevealGroup as="div" stagger={0.06} className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {NAV_GUIDE.map((item, i) => (
            <RevealItem key={item.href} distance={14} className="h-full">
              <Link
                href={item.href}
                title={item.description}
                className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-lg border border-rule bg-paper-2 p-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-vermilion hover:bg-paper hover:shadow-[0_18px_40px_-24px_rgba(22,17,14,0.35)]"
              >
                <span
                  aria-hidden
                  className="figure absolute right-4 top-3 text-[2.75rem] leading-none text-ink/[0.05] transition-colors duration-500 group-hover:text-vermilion/10"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-rule-strong text-ink-2 transition-colors duration-300 group-hover:border-vermilion group-hover:text-vermilion">
                  <item.icon className="h-5 w-5" strokeWidth={1.5} />
                </span>

                <div className="relative">
                  <p className="deva text-lg text-ink">{item.name}</p>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-2">
                    {item.description}
                  </p>
                </div>

                <span className="relative mt-auto inline-block w-fit bg-[linear-gradient(var(--color-vermilion),var(--color-vermilion))] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink-3 transition-[background-size,color] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[length:100%_1px] group-hover:text-vermilion">
                  खोलें
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </Section>
  );
}

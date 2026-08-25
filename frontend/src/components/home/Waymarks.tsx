import Link from "next/link";
import { Eyebrow, Rule, Section } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/motion";

/* A Hindi-language guide to the header navigation — for the visitor who
   reads the site in Hindi and wants to know what each button above does
   before clicking it. Mirrors navItems in components/layout/Navbar.tsx;
   keep the two in sync if a nav link is ever added, renamed, or removed. */

const NAV_GUIDE = [
  { name: "होम", href: "/", description: "मुखपृष्ठ पर वापस लौटें — समाज की कहानी और ताज़ा जानकारी यहीं से शुरू होती है।" },
  { name: "भवन", href: "/bhavan", description: "अग्रसेन भवन में ठहरने की बुकिंग के लिए — कमरों की जानकारी, उपलब्धता और पूछताछ फ़ॉर्म।" },
  { name: "परिचय", href: "/about", description: "समाज का उद्देश्य, नेतृत्व और स्थापना की कहानी।" },
  { name: "इतिहास", href: "/history", description: "समाज का प्रलेखित इतिहास और शोध सामग्री, हिंदी व अंग्रेज़ी दोनों में।" },
  { name: "सदस्य सूची", href: "/members", description: "नाम, फ़ोन नंबर या सदस्यता क्रमांक से किसी सदस्य को खोजें।" },
  { name: "कार्यक्रम", href: "/events", description: "आगामी आयोजनों की जानकारी और पास बुक करने की सुविधा।" },
  { name: "ब्लॉग", href: "/blog", description: "समाज की कहानियाँ पढ़ें, या फ़ोन सत्यापन के बाद स्वयं लिखें।" },
  { name: "दान", href: "/donate", description: "समाज के कार्यों में सीधे योगदान देने का माध्यम।" },
];

export default function Waymarks() {
  return (
    <Section className="bg-paper py-24 sm:py-32">
      <Reveal>
        <Rule />
      </Reveal>

      <div className="pt-14">
        <Reveal>
          <Eyebrow>ऊपर दिए गए बटनों का विवरण</Eyebrow>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="deva mt-4 text-2xl text-ink sm:text-3xl">
            नेविगेशन बार — मार्गदर्शिका
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <caption className="sr-only">वेबसाइट के शीर्ष नेविगेशन बार में मौजूद बटनों का विवरण</caption>
              <thead>
                <tr className="border-b border-rule-strong">
                  <th scope="col" className="deva w-40 py-3 pr-4 text-base font-normal text-ink">बटन</th>
                  <th scope="col" className="py-3 text-sm font-medium text-ink-2">विवरण</th>
                </tr>
              </thead>
              <tbody>
                {NAV_GUIDE.map((item) => (
                  <tr key={item.href} className="border-b border-rule">
                    <th scope="row" className="w-40 py-4 pr-4 align-top font-normal">
                      <Link
                        href={item.href}
                        title={item.description}
                        className="rule-grow deva inline-block pb-0.5 text-base text-ink transition-colors hover:text-vermilion"
                      >
                        {item.name}
                      </Link>
                    </th>
                    <td className="py-4 align-top text-[0.9375rem] leading-relaxed text-ink-2">
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

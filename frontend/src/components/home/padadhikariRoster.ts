/**
 * पदाधिकारी — office bearers of Agrawal Samaj Mansrovar Jaipur Samiti,
 * Jaipur, under the leadership of Ramgopal Singhal.
 *
 * Names and photographs are taken from the Maharaja Shri Agrasen Group
 * pamphlet. The pamphlet carries no designations and no biographies, so every
 * entry below holds the one role the pamphlet does support — a seat on the
 * कार्यकारिणी — rather than a title invented for a named, real person. Fill in
 * `designation` / `designationEn` per person as the real titles are confirmed;
 * the cards pick them up with no other change.
 *
 * `description` is optional by design. A card renders it only when it is
 * present, so an empty roster reads as complete rather than half-filled.
 */

export type Padadhikari = {
  /** Also the photograph's filename: `public/padadhikari/<slug>.jpg`. */
  slug: string;
  /** Name as printed on the pamphlet, in Devanagari. */
  name: string;
  /** Transliteration. Carries the name to alt text and to Latin-only readers. */
  latin: string;
  designation: string;
  designationEn: string;
  /** A line or two about their work for the samaj. Omitted from the card when absent. */
  description?: string;
};

/** The default seat, until the committee confirms individual portfolios. */
export const MEMBER_ROLE = "कार्यकारिणी सदस्य";
export const MEMBER_ROLE_EN = "Executive Committee Member";

/** The three leaders of the group. */
export const LEADERS: Padadhikari[] = [
  {
    slug: "ramgopal-singhal-lead",
    name: "रामगोपाल सिंघल",
    latin: "Ramgopal Singhal",
    designation: "अध्यक्ष",
    designationEn: "President",
    description: "अग्रवाल समाज समिति के सफल नेतृत्वकर्ता एवं समाज उत्थान के लिए समर्पित।",
  },
  {
    slug: "lakhmi-chand-singhal",
    name: "लखमी चन्द सिंघल",
    latin: "Lakhmi Chand Singhal",
    designation: "महामंत्री",
    designationEn: "General Secretary",
    description: "वरिष्ठ समाजसेवी एवं समाज के मार्गदर्शन मण्डल के सदस्य।",
  },
  {
    slug: "pramod-kumar-gupta",
    name: "प्रमोद कुमार गुप्ता",
    latin: "Pramod Kumar Gupta",
    designation: "कोषाध्यक्ष",
    designationEn: "Treasurer",
    description: "मूल निवासी भरतपुर। वर्तमान 10/506 कावेरी पथ मानसरोवर जयपुर। जन्म तिथि 04.10.1958। सेवा निवृत जिला श्रम कल्याण अधिकारी। वर्तमान में मीडियेटर राजस्थान उच्च न्यायालय जयपुर।",
  },
];

/** Backward-compatible alias — the first leader. */
export const LEAD = LEADERS[0];

const member = (slug: string, name: string, latin: string, description?: string): Padadhikari => ({
  slug,
  name,
  latin,
  designation: MEMBER_ROLE,
  designationEn: MEMBER_ROLE_EN,
  description: description || "समाज सेवा, संगठन सुदृढ़ीकरण एवं जनकल्याणकारी गतिविधियों में सक्रिय योगदान।",
});

export const PADADHIKARI: Padadhikari[] = [
  member("anand-gupta", "आनन्द गुप्ता", "Anand Gupta", "समाज कल्याण एवं सांस्कृतिक कार्यक्रमों के आयोजन में समर्पित सेवा।"),
  member("anil-kumar-dani", "अनिल कुमार दानी", "Anil Kumar Dani", "सामाजिक समरसता एवं युवा मार्गदर्शन अभियानों में सक्रिय।"),
  member("ankur-gupta", "अंकुर गुप्ता", "Ankur Gupta", "समाज के डिजिटल एवं तकनीकी विकास में निरन्तर प्रयासरत।"),
  member("dinesh-chand-goyal", "दिनेश चन्द गोयल", "Dinesh Chand Goyal", "धार्मिक एवं सामाजिक अनुष्ठानों के सुचारू संचालन में योगदान।"),
  member("ishwar-das-goyal", "ईश्वर दास गोयल", "Ishwar Das Goyal", "वरिष्ठ सलाहकार एवं सामाजिक परंपराओं के संरक्षण में अग्रणी।"),
  member("jugal-kishore-agrawal", "जुगल किशोर अग्रवाल", "Jugal Kishore Agrawal", "समाज भवन विकास एवं प्रबंधन समिति में समर्पित भूमिका।"),
  member("kalicharan-gupta", "कालीचरण गुप्ता", "Kalicharan Gupta", "भारतीय खाद्य निगम से प्रबंधक के पद से सेवानिवृत्त। मूल रूप से भरतपुर का निवासी। पिछले लगभग 38 वर्षों से मानसरोवर जयपुर में निवास। मानसरोवर अग्रवाल समाज समिति की कार्यकारिणी में पिछले 24 वर्षों से विभिन्न पदों पर सेवारत।"),
  member("kavita-mittal", "कविता मित्तल", "Kavita Mittal", "महिला मण्डल गतिविधियों एवं समर कैंप कार्यक्रमों की आयोजक।"),
  member("krishnavtar-mittal", "कृष्णावतार मित्तल", "Krishnavtar Mittal", "समाज सेवा एवं अन्न क्षेत्र गतिविधियों में निष्ठापूर्वक संलग्न।"),
  member("kunj-bihari-agrawal", "कुंजबिहारी अग्रवाल", "Kunj Bihari Agrawal", "शैक्षणिक सहायता एवं मेधावी छात्र प्रोत्साहन योजनाओं में सक्रिय।"),
  member("lakhmi-chand-singhal", "लखमी चन्द सिंघल", "Lakhmi Chand Singhal", "वरिष्ठ समाजसेवी एवं समाज के मार्गदर्शन मण्डल के सदस्य।"),
  member("mahesh-chand-goyal", "महेश चन्द गोयल", "Mahesh Chand Goyal", "बैंक ऑफ़ बड़ौदा से सीनियर मैनेजर रिटायर्ड। पता: 35/94 रजत पथ, मानसरोवर जयपुर। जन्मस्थान: खेरली, जिला अलवर, राजस्थान।"),
  member("manoj-kumar-gupta", "मनोज कुमार गुप्ता", "Manoj Kumar Gupta", "युवा ऊर्जा प्रोत्साहन एवं खेलकूद प्रतियोगिताओं के संयोजक।"),
  member("manoj-garg", "श्रीमती मनोज गर्ग", "Smt. Manoj Garg", "महिला सशक्तिकरण, हस्तकला एवं सांस्कृतिक विंग की सह-संयोजक।"),
  member("narendra-kumar-bansal", "नरेन्द्र कुमार बंसल", "Narendra Kumar Bansal", "सामाजिक सुरक्षा एवं आपातकालीन सहायता टीम के समर्पित सदस्य।"),
  member("prahlad-kumar-garg", "प्रहलाद कुमार गर्ग", "Prahlad Kumar Garg", "समाज भवन व्यवस्था एवं अतिथि सत्कार समिति में सक्रिय सेवा।"),
  member("pramod-kumar-gupta", "प्रमोद कुमार गुप्ता", "Pramod Kumar Gupta", "रक्तदान शिविर एवं चिकित्सा सहायता प्रकल्पों में अग्रणी भूमिका।"),
  member("praveen-kumar-gupta", "प्रवीण कुमार गुप्ता", "Praveen Kumar Gupta", "समाज प्रचार-प्रसार एवं सूचना तंत्र के सुचारू संचालन में योगदान।"),
  member("puneet-kumar-gupta", "पुनीत कुमार गुप्ता", "Puneet Kumar Gupta", "युवा विंग एवं नवीन सदस्य जोड़ो अभियान के सक्रिय कार्यकर्ता।"),
  member("purushottam-mangal", "पुरूषोत्तम मंगल", "Purushottam Mangal", "सांस्कृतिक संध्या एवं वार्षिकोत्सव आयोजनों के व्यवस्थापक।"),
  member("radha-raman-gupta", "राधारामण गुप्ता", "Radha Raman Gupta", "धार्मिक आयोजनों एवं भागवत कथा प्रबंधन में समर्पित।"),
  member("ram-bharosi-gupta", "रामभरोसी गुप्ता", "Ram Bharosi Gupta", "वरिष्ठ नागरिक सेवा एवं समाज कल्याण कार्यों में निष्ठावान।"),
  member("ramgopal-singhal", "रामगोपाल सिंघल", "Ramgopal Singhal", "समूह नेतृत्व एवं समाज के समग्र विकास हेतु मार्गदर्शक।"),
  member("ram-avtar-gupta", "रामअवतार गुप्ता", "Ram Avtar Gupta", "सामूहिक विवाह सम्मेलन एवं समाज एकता अभियानों में सक्रिय।"),
  member("seetu-gupta", "सीटू गुप्ता", "Seetu Gupta", "महिला मंडल आयोजनों एवं बाल विकास गतिविधियों में संलग्न।"),
  member("shyam-sunder-gupta", "श्याम सुन्दर गुप्ता", "Shyam Sunder Gupta", "पर्यावरण संरक्षण एवं पौधारोपण अभियानों के प्रमुख संयोजक।"),
  member("sunil-kumar-modi", "सुनील कुमार मोदी", "Sunil Kumar Modi", "समाज विकास योजनाओं एवं निर्माण कार्यों के पर्यवेक्षक।"),
  member("sunita-agrawal", "सुनीता अग्रवाल", "Sunita Agrawal", "महिला कल्याण, सिलाई एवं कला प्रशिक्षण कार्यक्रमों की संयोजिका।"),
  member("vikas-gupta", "विकास गुप्ता", "Vikas Gupta", "तकनीकी नवाचार एवं डिजिटल डायरेक्टरी प्रबंधन में सक्रिय।"),
  member("vinod-kumar-agrawal", "विनोद कुमार अग्रवाल", "Vinod Kumar Agrawal", "वित्तीय लेखा-जोखा एवं पारदर्शी प्रबंधन में विशेष भूमिका।"),
  member("vipul-mittal", "विपुल मित्तल", "Vipul Mittal", "युवा महोत्सव एवं समाज जोड़ो गतिविधियों में समर्पित कार्यकर्ता।"),
];

/** Leaders are shown separately above, so remove them from the grid. */
const LEADER_SLUGS = new Set(["ramgopal-singhal", "pramod-kumar-gupta", "lakhmi-chand-singhal"]);
export const COMMITTEE = PADADHIKARI.filter((p) => !LEADER_SLUGS.has(p.slug));

export function photo(slug: string) {
  return `/padadhikari/${slug}.jpg`;
}

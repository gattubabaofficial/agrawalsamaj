/**
 * पदाधिकारी — office bearers of Mansarovar Agrawal Samaj Samiti, Jaipur.
 *
 * Designations and contact numbers updated as per the official executive members list
 * (कार्यकारिणी सदस्यों की पदवार, मोबाईल नम्बर सहित सूची).
 */

export type Padadhikari = {
  /** Also the photograph's filename: `public/padadhikari/<slug>.jpg`. */
  slug: string;
  /** Name as printed on the official list, in Devanagari. */
  name: string;
  /** Transliteration for alt text and Latin readers. */
  latin: string;
  designation: string;
  designationEn: string;
  mobile?: string;
  /** A line or two about their work for the samaj. Omitted from the card when absent. */
  description?: string;
};

/** The default seat fallback, if ever needed. */
export const MEMBER_ROLE = "कार्यकारिणी सदस्य";
export const MEMBER_ROLE_EN = "Executive Committee Member";

/** The three core leaders of the group. */
export const LEADERS: Padadhikari[] = [
  {
    slug: "ramgopal-singhal-lead",
    name: "राम गोपाल सिंघल",
    latin: "Ramgopal Singhal",
    designation: "अध्यक्ष",
    designationEn: "President",
    mobile: "9314874859",
    description: "अग्रवाल समाज समिति के सफल नेतृत्वकर्ता एवं समाज के सर्वांगीण विकास हेतु समर्पित।",
  },
  {
    slug: "lakhmi-chand-singhal",
    name: "लखमी चन्द सिंघल",
    latin: "Lakhmi Chand Singhal",
    designation: "महामंत्री",
    designationEn: "General Secretary",
    mobile: "9829144284",
    description: "समिति के प्रशासनिक कार्यों, पत्राचार एवं संगठन संचालन के मुख्य उत्तरदायी महामंत्री।",
  },
  {
    slug: "pramod-kumar-gupta",
    name: "प्रमोद कुमार गुप्ता",
    latin: "Pramod Kumar Gupta",
    designation: "कोषाध्यक्ष",
    designationEn: "Treasurer",
    mobile: "9414375719",
    description: "सेवानिवृत्त जिला श्रम कल्याण अधिकारी। समिति के आय-व्यय एवं वित्तीय प्रबंधन के मुख्य उत्तरदायी कोषाध्यक्ष।",
  },
];

/** Backward-compatible alias — the first leader. */
export const LEAD = LEADERS[0];

export const PADADHIKARI: Padadhikari[] = [
  {
    slug: "ramgopal-singhal",
    name: "राम गोपाल सिंघल",
    latin: "Ramgopal Singhal",
    designation: "अध्यक्ष",
    designationEn: "President",
    mobile: "9314874859",
    description: "अग्रवाल समाज समिति के सफल नेतृत्वकर्ता एवं समाज के सर्वांगीण विकास हेतु समर्पित।",
  },
  {
    slug: "seetu-gupta",
    name: "सीटू गुप्ता",
    latin: "Seetu Gupta",
    designation: "उपाध्यक्ष",
    designationEn: "Vice President",
    mobile: "8559970390",
    description: "समाज की विभिन्न गतिविधियों एवं विकास योजनाओं के संचालन में उपाध्यक्ष के रूप में सेवारत।",
  },
  {
    slug: "ram-avtar-gupta",
    name: "राम अवतार गुप्ता",
    latin: "Ram Avtar Gupta",
    designation: "उपाध्यक्ष",
    designationEn: "Vice President",
    mobile: "9414710425",
    description: "समाज संगठन, सामाजिक सम्मेलनों एवं जनकल्याणकारी कार्यों में उपाध्यक्ष के रूप में सक्रिय।",
  },
  {
    slug: "ishwar-das-goyal",
    name: "ईश्वर दास गोयल",
    latin: "Ishwar Das Goyal",
    designation: "उपाध्यक्ष",
    designationEn: "Vice President",
    mobile: "9414780006",
    description: "वरिष्ठ सामाजिक सलाहकार एवं परंपराओं के संरक्षण हेतु उपाध्यक्ष पद पर सेवारत।",
  },
  {
    slug: "sunil-kumar-modi",
    name: "सुनील कुमार मोदी",
    latin: "Sunil Kumar Modi",
    designation: "उपाध्यक्ष",
    designationEn: "Vice President",
    mobile: "8952099999",
    description: "समाज विकास परियोजनाओं एवं भवन निर्माण कार्यों के उपाध्यक्ष के रूप में पर्यवेक्षक।",
  },
  {
    slug: "lakhmi-chand-singhal",
    name: "लखमी चन्द सिंघल",
    latin: "Lakhmi Chand Singhal",
    designation: "महामंत्री",
    designationEn: "General Secretary",
    mobile: "9829144284",
    description: "समिति के प्रशासनिक कार्यों, पत्राचार एवं संगठन संचालन के मुख्य उत्तरदायी महामंत्री।",
  },
  {
    slug: "kalicharan-gupta",
    name: "कालीचरण गुप्ता",
    latin: "Kalicharan Gupta",
    designation: "अतिरिक्त महामंत्री",
    designationEn: "Additional General Secretary",
    mobile: "9460407593",
    description: "भारतीय खाद्य निगम से प्रबंधक के पद से सेवानिवृत्त। मूल रूप से भरतपुर का निवासी। पिछले लगभग 38 वर्षों से मानसरोवर जयपुर में निवास। मानसरोवर अग्रवाल समाज समिति की कार्यकारिणी में पिछले 24 वर्षों से विभिन्न पदों पर सेवारत।",
  },
  {
    slug: "manoj-kumar-gupta",
    name: "मनोज कुमार गुप्ता",
    latin: "Manoj Kumar Gupta",
    designation: "अतिरिक्त महामंत्री",
    designationEn: "Additional General Secretary",
    mobile: "9636378121",
    description: "समिति के संगठनात्मक कार्यों, युवा गतिविधियों एवं प्रशासनिक समन्वय में अतिरिक्त महामंत्री।",
  },
  {
    slug: "pramod-kumar-gupta",
    name: "प्रमोद कुमार गुप्ता",
    latin: "Pramod Kumar Gupta",
    designation: "कोषाध्यक्ष",
    designationEn: "Treasurer",
    mobile: "9414375719",
    description: "सेवानिवृत्त जिला श्रम कल्याण अधिकारी। समिति के आय-व्यय एवं वित्तीय प्रबंधन के मुख्य उत्तरदायी कोषाध्यक्ष।",
  },
  {
    slug: "anil-kumar-dani",
    name: "अनिल कुमार दानी",
    latin: "Anil Kumar Dani",
    designation: "सह कोषाध्यक्ष",
    designationEn: "Co-Treasurer",
    mobile: "9414771361",
    description: "समिति के वित्तीय अभिलेखों एवं बजट प्रबंधन में सह कोषाध्यक्ष के रूप में सेवारत।",
  },
  {
    slug: "dinesh-chand-goyal",
    name: "दिनेश चन्द गोयल",
    latin: "Dinesh Chand Goyal",
    designation: "संयुक्त मंत्री",
    designationEn: "Joint Secretary",
    mobile: "9414795870",
    description: "समिति के पत्राचार, बैठकों के संचालन एवं प्रशासनिक कार्यों में संयुक्त मंत्री।",
  },
  {
    slug: "praveen-kumar-gupta",
    name: "प्रवीन कुमार गुप्ता",
    latin: "Praveen Kumar Gupta",
    designation: "सह संयुक्त मंत्री",
    designationEn: "Co-Joint Secretary",
    mobile: "9414335955",
    description: "समिति की सूचनाओं एवं प्रशासनिक व्यवस्थाओं के क्रियान्वयन में सह संयुक्त मंत्री।",
  },
  {
    slug: "jugal-kishore-agrawal",
    name: "जुगल किशोर अग्रवाल",
    latin: "Jugal Kishore Agrawal",
    designation: "सामाजिक सुधार एवं कल्याण मंत्री",
    designationEn: "Social Reform & Welfare Secretary",
    mobile: "9414054426",
    description: "कुरीति निवारण, सामाजिक कुप्रथाओं के उन्मूलन एवं जनकल्याणकारी योजनाओं के प्रभारी मंत्री।",
  },
  {
    slug: "ankur-gupta",
    name: "अंकुर गुप्ता",
    latin: "Ankur Gupta",
    designation: "सामाजिक सुधार एवं कल्याण सह मंत्री",
    designationEn: "Social Reform & Welfare Co-Secretary",
    mobile: "9828843456",
    description: "सामाजिक सुधार अभियानों एवं कल्याणकारी योजनाओं के क्रियान्वयन में सह मंत्री।",
  },
  {
    slug: "manoj-garg",
    name: "श्रीमती मनोज गर्ग",
    latin: "Smt. Manoj Garg",
    designation: "सांस्कृतिक मंत्री",
    designationEn: "Cultural Secretary",
    mobile: "9462809499",
    description: "समाज के सांस्कृतिक महोत्सवों, जयंतियों एवं साहित्यिक कार्यक्रमों की प्रभारी मंत्री।",
  },
  {
    slug: "krishnavtar-mittal",
    name: "कृष्ण अवतार मित्तल",
    latin: "Krishna Avtar Mittal",
    designation: "संगठन मंत्री",
    designationEn: "Organization Secretary",
    mobile: "7726996648",
    description: "समाज के सदस्यों को जोड़ने, संगठन सुदृढ़ीकरण एवं शाखा विस्तार के प्रभारी मंत्री।",
  },
  {
    slug: "vinod-kumar-agrawal",
    name: "विनोद कुमार अग्रवाल",
    latin: "Vinod Kumar Agrawal",
    designation: "आई टी, सूचना एवं प्रचार मंत्री",
    designationEn: "IT, Information & Publicity Secretary",
    mobile: "8003198003",
    description: "समाज की डिजिटल उपस्थिति, आईटी पहलों, वेबसाइट एवं सूचना-प्रचार के प्रभारी मंत्री।",
  },
  {
    slug: "shyam-sunder-gupta",
    name: "श्याम सुन्दर गुप्ता",
    latin: "Shyam Sunder Gupta",
    designation: "वैवाहिक गतिविधि एवं परिचय सम्मेलन संयोजक",
    designationEn: "Matrimonial Activity & Introduction Meet Convener",
    mobile: "9414778967",
    description: "युवक-युवती परिचय सम्मेलन एवं वैवाहिक सहायता गतिविधियों के प्रमुख संयोजक।",
  },
  {
    slug: "sunita-agrawal",
    name: "श्रीमती सुनीता अग्रवाल",
    latin: "Smt. Sunita Agrawal",
    designation: "महिला प्रकोष्ठ संयोजक",
    designationEn: "Women Cell Convener",
    mobile: "9462085127",
    description: "महिला सशक्तिकरण, स्वावलंबन एवं महिला मंडल की गतिविधियों की प्रमुख संयोजिका।",
  },
  {
    slug: "kavita-mittal",
    name: "श्रीमती कविता मित्तल",
    latin: "Smt. Kavita Mittal",
    designation: "महिला प्रकोष्ठ सह संयोजक",
    designationEn: "Women Cell Co-Convener",
    mobile: "7014696469",
    description: "महिला प्रकोष्ठ के आयोजनों, कार्यशालाओं एवं कल्याणकारी कार्यक्रमों की सह संयोजिका।",
  },
  {
    slug: "narendra-kumar-bansal",
    name: "नरेन्द्र कुमार बंसल",
    latin: "Narendra Kumar Bansal",
    designation: "युवा प्रकोष्ठ संयोजक",
    designationEn: "Youth Cell Convener",
    mobile: "8561022097",
    description: "युवाओं को समाज सेवा से जोड़ने, युवा सम्मेलनों एवं आयोजनों के प्रमुख संयोजक।",
  },
  {
    slug: "vipul-mittal",
    name: "विपुल मित्तल",
    latin: "Vipul Mittal",
    designation: "युवा प्रकोष्ठ सह संयोजक",
    designationEn: "Youth Cell Co-Convener",
    mobile: "9950002999",
    description: "युवा प्रकोष्ठ की गतिविधियों, स्पोर्ट्स एवं सांस्कृतिक सहभागिता के सह संयोजक।",
  },
  {
    slug: "prahlad-kumar-garg",
    name: "प्रहलाद कुमार गर्ग",
    latin: "Prahlad Kumar Garg",
    designation: "खेलकूद गतिविधि संयोजक",
    designationEn: "Sports Activity Convener",
    mobile: "9414712065",
    description: "समाज की खेलकूद प्रतियोगिताओं, स्पोर्ट्स मीट एवं युवा फिटनेस आयोजनों के संयोजक।",
  },
  {
    slug: "radha-raman-gupta",
    name: "राधा रमन गुप्ता",
    latin: "Radha Raman Gupta",
    designation: "विधि प्रकोष्ठ संयोजक",
    designationEn: "Legal Cell Convener",
    mobile: "8947837630",
    description: "समिति के विधिक मामलों, नियम-उपनियमों एवं कानूनी परामर्श के प्रमुख संयोजक।",
  },
  {
    slug: "mahesh-chand-goyal",
    name: "महेश चन्द गोयल",
    latin: "Mahesh Chand Goyal",
    designation: "क्षेत्रीय उप समिति समन्वयक संयोजक",
    designationEn: "Regional Sub-Committee Coordinator Convener",
    mobile: "9887566400",
    description: "बैंक ऑफ़ बड़ौदा से सेवानिवृत्त सीनियर मैनेजर। मानसरोवर के विभिन्न सेक्टरों की क्षेत्रीय उप समितियों के मुख्य समन्वयक।",
  },
  {
    slug: "vikas-gupta",
    name: "विकास गुप्ता",
    latin: "Vikas Gupta",
    designation: "पर्यावरण संयोजक",
    designationEn: "Environment Convener",
    mobile: "9772391222",
    description: "पर्यावरण संरक्षण, पौधारोपण अभियानों एवं हरित समाज पहल के प्रमुख संयोजक।",
  },
  {
    slug: "ram-bharosi-gupta",
    name: "राम भरोसे गुप्ता",
    latin: "Ram Bharosi Gupta",
    designation: "चिकित्सा शिविर सह संयोजक",
    designationEn: "Medical Camp Co-Convener",
    mobile: "9414073960",
    description: "निःशुल्क स्वास्थ्य जाँच, रक्तदान शिविर एवं चिकित्सा सहायता प्रकल्पों के सह संयोजक।",
  },
  {
    slug: "puneet-kumar-gupta",
    name: "पुनीत कुमार गुप्ता",
    latin: "Puneet Kumar Gupta",
    designation: "सदस्यता अभियान सह संयोजक",
    designationEn: "Membership Campaign Co-Convener",
    mobile: "9309303920",
    description: "समाज के नवीन परिवारों को जोड़ने एवं सदस्यता अभियान के सह संयोजक।",
  },
  {
    slug: "kunj-bihari-agrawal",
    name: "कुंज बिहारी अग्रवाल",
    latin: "Kunj Bihari Agrawal",
    designation: "सनातन संरक्षण सह संयोजक",
    designationEn: "Sanatan Preservation Co-Convener",
    mobile: "9314873494",
    description: "धार्मिक आयोजनों, संवर्धन एवं सनातन संस्कृति संरक्षण अभियानों के सह संयोजक।",
  },
  {
    slug: "purushottam-mangal",
    name: "पुरुषोत्तम मंगल",
    latin: "Purushottam Mangal",
    designation: "भवन अनु-संरक्षण सह संयोजक",
    designationEn: "Bhavan Preservation Co-Convener",
    mobile: "9982366915",
    description: "अग्रवाल समाज भवन के रख-रखाव, सौंदर्यीकरण एवं अनु-संरक्षण के सह संयोजक।",
  },
  {
    slug: "anand-gupta",
    name: "आनंद गुप्ता",
    latin: "Anand Gupta",
    designation: "अग्रवाल समाज त्वरित सहायता प्रकोष्ठ सह संयोजक",
    designationEn: "Agrawal Samaj Quick Assistance Cell Co-Convener",
    mobile: "9667758519",
    description: "आपात्कालीन परिस्थितियों में समाज बंधुओं को त्वरित सहायता पहुँचाने वाले प्रकोष्ठ के सह संयोजक।",
  },
];

/** Leaders are shown separately above, so remove them from the grid. */
const LEADER_SLUGS = new Set(["ramgopal-singhal", "pramod-kumar-gupta", "lakhmi-chand-singhal"]);
export const COMMITTEE = PADADHIKARI.filter((p) => !LEADER_SLUGS.has(p.slug));

const JPEG_SLUGS = new Set(["seetu-gupta", "kavita-mittal"]);

export function photo(slug: string) {
  const ext = JPEG_SLUGS.has(slug) ? "jpeg" : "jpg";
  return `/padadhikari/${slug}.${ext}`;
}



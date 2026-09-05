export interface MockEvent {
  event_id: string;
  title: string;
  description: string;
  banner_url: string;
  venue: string;
  category: string;
  start_datetime: string;
  end_datetime?: string;
  pass_price: number;
  total_passes?: number;
  passes_sold?: number;
  max_per_user?: number;
  status: string;
  visibility: string;
  pricing_type?: string;
  timeline?: Array<{
    time: string;
    title: string;
    description: string;
  }>;
}

export const mockEvents: MockEvent[] = [
  {
    event_id: "06eb74adc8744fca9fd6b812ecf84596",
    title: "Maharaja Agrasen Jayanti Mahotsav 2026",
    description: "Annual grand celebration of Maharaja Agrasen Jayanti with cultural programs, awards, and food.",
    banner_url: "",
    venue: "Agrasen Bhawan Main Hall",
    category: "cultural",
    start_datetime: "2026-10-15T10:00:00Z",
    end_datetime: "2026-10-15T22:00:00Z",
    pass_price: 150,
    total_passes: 500,
    passes_sold: 45,
    max_per_user: 5,
    status: "upcoming",
    visibility: "open_to_all",
    pricing_type: "paid",
    timeline: [
      { time: "10:00 AM", title: "Flag Hoisting & Pooja", description: "Traditional pooja by Samaj elders" },
      { time: "01:00 PM", title: "Maha Prasad & Lunch", description: "Pure vegetarian community feast" },
      { time: "04:00 PM", title: "Cultural Performance & Awards", description: "Performances by community youth" },
    ]
  },
  {
    event_id: "0fbbe5b2addf48cdbc5bb8e8f2b49c8e",
    title: "Shri Krishna Janmashtami Pooja",
    description: "Divine pooja, bhajans, and kids Jhanki competition followed by Maha Prasad.",
    banner_url: "",
    venue: "Bhavan Temple Ground",
    category: "religious",
    start_datetime: "2026-08-28T18:00:00Z",
    end_datetime: "2026-08-28T23:30:00Z",
    pass_price: 0,
    total_passes: 1000,
    passes_sold: 120,
    max_per_user: 5,
    status: "upcoming",
    visibility: "open_to_all",
    pricing_type: "free",
    timeline: [
      { time: "06:00 PM", title: "Bhajan Sandhya", description: "Live devotional music" },
      { time: "10:00 PM", title: "Kids Jhanki Competition", description: "Costume and fancy dress contest" },
      { time: "12:00 AM", title: "Midnight Aarti & Maha Prasad", description: "Birth celebration of Lord Krishna" },
    ]
  },
  {
    event_id: "85ab391e784f421eb7687db150b0dce6",
    title: "Free Eye Check-up & Medical Camp",
    description: "Free eye checkup, blood pressure, sugar testing & consultation for all samaj members.",
    banner_url: "",
    venue: "Samaj Medical Center",
    category: "social",
    start_datetime: "2026-11-05T08:00:00Z",
    end_datetime: "2026-11-05T14:00:00Z",
    pass_price: 0,
    total_passes: 200,
    passes_sold: 30,
    max_per_user: 4,
    status: "upcoming",
    visibility: "open_to_all",
    pricing_type: "free",
    timeline: [
      { time: "08:00 AM", title: "Registration & Token Distribution", description: "Token counter opens" },
      { time: "09:00 AM", title: "Doctor Consultations", description: "General physician and ophthalmologist checks" },
    ]
  }
];

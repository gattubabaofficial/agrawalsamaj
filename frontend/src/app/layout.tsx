import type { Metadata } from "next";
import { Geist_Mono, Inter, Lora, Noto_Sans_Devanagari, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";

/* Typefaces are chosen for a readership roughly 25 to 70 years old, much of
   it reading on a mid-range phone in daylight. That rules out hairline
   weights, extreme stroke contrast and decorative quirk: everything here has
   open counters, sturdy stems and a large x-height. */

// Body and interface. Inter was drawn for screens and holds up at small
// sizes and on low-density displays better than a geometric sans.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Headings. Lora carries the warmth the samaj's character calls for while
// staying comfortable to read at 600 — unlike a high-contrast display serif,
// whose thin strokes disappear for older eyes.
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// Devanagari Sans.
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-deva",
  subsets: ["devanagari", "latin"],
  display: "swap",
});

// Devanagari Serif. Tapered strokes ensure top matras and anusvara dots (e.g. ईंट) stand out clearly without clashing into character hooks.
const notoSerifDevanagari = Noto_Serif_Devanagari({
  variable: "--font-noto-serif-deva",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Agrawal Samaj Mansrovar Jaipur — One brick, one rupee",
    template: "%s · Agrawal Samaj Mansrovar Jaipur",
  },
  description:
    "The community portal for Agrawal Samaj Mansrovar Jaipur. Book the Bhavan, register for gatherings, find a household in the directory, and support the welfare schemes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      style={{ colorScheme: "light" }}
      className={`${inter.variable} ${lora.variable} ${notoDevanagari.variable} ${notoSerifDevanagari.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink" suppressHydrationWarning>
        {/* Standard practice: let keyboard and screen-reader users jump the
            navigation. Visible only once focused. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-200 focus:rounded focus:bg-vermilion focus:px-5 focus:py-3 focus:text-base focus:font-semibold focus:text-paper"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}

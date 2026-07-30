"use client";

import { useState } from "react";
import Image from "next/image";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/motion";
import { Eyebrow, Rule } from "@/components/ui/primitives";
import {
  COMMITTEE,
  LEAD,
  LEADERS,
  MEMBER_ROLE,
  MEMBER_ROLE_EN,
  photo,
  type Padadhikari as Person,
} from "./padadhikariRoster";

/* HD portrait photographs of each committee member. Each photo is displayed
   in a portrait 3:4 aspect ratio at 112px wide, which keeps the layout compact
   while showing faces clearly.

   Type note: .deva, .figure and .eyebrow are unlayered rules in globals.css and
   beat Tailwind's utility layer. Size them with text-*, never re-weight them.
   .eyebrow also uppercases and letterspaces, which mangles Devanagari — it is
   used on Latin text only. */

/** Photograph mounted on a paper plate, with initials standing in if the file
 *  is ever missing. */
function Plate({
  person,
  className = "",
  sizes,
}: {
  person: Person;
  className?: string;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = person.latin
    .replace(/^Smt\.\s*/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-rule bg-paper-3 ${className}`}
    >
      {failed ? (
        <div className="flex h-full w-full items-center justify-center">
          <span aria-hidden className="figure text-xl text-ink-3/70">
            {initials}
          </span>
        </div>
      ) : (
        <Image
          src={photo(person.slug)}
          alt={`${person.latin} — ${person.name}`}
          fill
          sizes={sizes}
          onError={() => setFailed(true)}
          className="object-cover object-top"
        />
      )}
    </div>
  );
}

function MemberRow({ person }: { person: Person }) {
  return (
    <RevealItem as="li" distance={14}>
      <article className="flex items-start gap-4 border-b border-rule pb-5">
        <Plate person={person} sizes="112px" className="aspect-[3/4] w-28" />
        <div className="min-w-0 pt-0.5">
          <h4 className="deva text-[0.9375rem] leading-snug text-ink">{person.name}</h4>
          <p className="mt-0.5 text-xs leading-tight text-ink-3">{person.latin}</p>
          {/* Quiet, not vermilion: today every member carries the same seat, and
              thirty identical red lines read as alarm rather than information.
              Accent is spent on the lead's role, which is the one that differs. */}
          <p className="deva mt-1.5 text-xs leading-tight text-ink-2">
            {person.designation}
          </p>
          {person.description && (
            <p className="deva mt-2 text-[0.8125rem] leading-relaxed text-ink-2">
              {person.description}
            </p>
          )}
        </div>
      </article>
    </RevealItem>
  );
}

export default function Padadhikari() {
  return (
    <section
      id="padadhikari"
      aria-labelledby="padadhikari-heading"
      className="grain relative border-y border-rule bg-paper-2 py-24 sm:py-32"
    >
      {/* Same container as the Section primitive, written out because this one
          also needs aria-labelledby. Padding matches Ledger and the rest of the
          home page so the sections keep one vertical rhythm. */}
      <div className="mx-auto max-w-[78rem] px-5 sm:px-8 lg:px-12">
        {/* ── Masthead ─────────────────────────────────────────────── */}
        <Reveal>
          <Eyebrow tone="accent">Agrawal Samaj Mansrovar Jaipur Samiti</Eyebrow>
        </Reveal>

        <Reveal className="mt-5 max-w-2xl">
          <h2 id="padadhikari-heading" className="deva text-4xl leading-tight text-ink sm:text-5xl">
            पदाधिकारी
          </h2>
          <p className="mt-2 text-lg text-ink-3">Office bearers</p>
          <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-ink-2">
            The members serving on the executive committee of Mansarovar
            Agrawal Samaj Mansrovar Jaipur Samiti.
          </p>
        </Reveal>

        {/* ── The three leaders ─────────────────────────────────────── */}
        <RevealGroup as="div" stagger={0.08} className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LEADERS.map((leader) => (
            <RevealItem key={leader.slug} distance={14}>
              <figure className="flex flex-col items-center gap-4 rounded-lg border border-rule bg-paper p-6 text-center">
                <Plate person={leader} sizes="160px" className="aspect-[3/4] w-40" />
                <figcaption>
                  <p className="eyebrow text-vermilion">{leader.designationEn}</p>
                  <p className="deva mt-2 text-lg leading-snug text-ink">{leader.name}</p>
                  <p className="mt-0.5 text-xs text-ink-3">{leader.latin}</p>
                  <p className="deva mt-2 text-sm leading-tight text-vermilion">
                    {leader.designation}
                  </p>
                  {leader.description && (
                    <p className="deva mt-3 text-[0.8125rem] leading-relaxed text-ink-2">
                      {leader.description}
                    </p>
                  )}
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* ── The committee ────────────────────────────────────────── */}
        <Reveal className="mt-14">
          <Rule />
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-5">
            <div>
              <h3 className="deva text-xl leading-snug text-ink">{MEMBER_ROLE}</h3>
              <p className="eyebrow mt-1">{MEMBER_ROLE_EN}</p>
            </div>
            <p className="flex items-baseline gap-2">
              <span className="figure text-3xl text-ink">{COMMITTEE.length}</span>
              <span className="text-sm text-ink-3">members</span>
            </p>
          </div>
          <Rule />
        </Reveal>

        <RevealGroup as="div" stagger={0.03} className="mt-10">
          <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {COMMITTEE.map((p) => (
              <MemberRow key={p.slug} person={p} />
            ))}
          </ul>
        </RevealGroup>
      </div>
    </section>
  );
}

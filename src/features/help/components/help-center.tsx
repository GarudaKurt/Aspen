"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { helpCategories, helpQuestions, helpTopics, type HelpCategory } from "../data/help-content";

const topicIcons = {
  Bookings: CalendarDays,
  "Finding services": MapPin,
  Account: UserRound,
  Messages: MessageCircle,
  Notifications: CheckCircle2,
  Reviews: Star,
  "Getting started": ShieldCheck,
} satisfies Record<HelpCategory, typeof CalendarDays>;

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<HelpCategory | "All">("All");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredQuestions = useMemo(() => helpQuestions.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesQuery = !normalizedQuery || `${item.question} ${item.answer} ${item.category}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  }), [activeCategory, normalizedQuery]);

  const chooseTopic = (category: HelpCategory) => {
    setActiveCategory(category);
    setQuery("");
    document.getElementById("help-faq")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#fafcfb] text-[#171817]">
      <section className="border-b border-[#dfe8e2] bg-[#eef6f1]">
        <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c5714e]">Aspen Help Center</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#315447] sm:text-5xl">Hi, how can we help you?</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#64746b] sm:text-base">
              Find clear answers about appointments, accounts, services, messages, and everything you need to book with confidence.
            </p>
          </div>
          <label className="relative mt-8 block max-w-2xl">
            <span className="sr-only">Search help articles</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#6f8278]" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for answers..."
              className="h-14 rounded-2xl border-[#d3e0d7] bg-white pl-12 pr-4 text-base shadow-sm focus-visible:border-[#3c6355] focus-visible:ring-[#3c6355]/20"
            />
          </label>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
        <section aria-labelledby="popular-topics-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5714e]">Start here</p>
              <h2 id="popular-topics-heading" className="mt-2 text-2xl font-bold text-[#315447]">Popular topics</h2>
            </div>
            {activeCategory !== "All" && (
              <Button type="button" variant="ghost" onClick={() => setActiveCategory("All")} className="text-[#3c6355]">View all topics</Button>
            )}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {helpTopics.map((topic) => {
              const Icon = topicIcons[topic.category];
              return (
                <button
                  key={topic.title}
                  type="button"
                  onClick={() => chooseTopic(topic.category)}
                  className="group rounded-2xl border border-[#e1e8e3] bg-white p-5 text-left shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-[#b9cfc0] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#3c6355]/40"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-[#eaf3ed] text-[#3c6355] transition-colors group-hover:bg-[#3c6355] group-hover:text-white">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="mt-4 flex items-center justify-between gap-3">
                    <span className="font-semibold text-[#28362f]">{topic.title}</span>
                    <ArrowRight className="size-4 shrink-0 text-[#8aa093] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                  <span className="mt-2 block text-sm leading-5 text-[#748078]">{topic.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section id="help-faq" className="scroll-mt-24 pt-12" aria-labelledby="faq-heading">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c5714e]">Answers at a glance</p>
              <h2 id="faq-heading" className="mt-2 text-2xl font-bold text-[#315447]">Frequently asked questions</h2>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Filter help topics">
              <Button type="button" variant="outline" onClick={() => setActiveCategory("All")} className={`rounded-full border-[#d8e3db] ${activeCategory === "All" ? "bg-[#3c6355] text-white hover:bg-[#315447] hover:text-white" : "text-[#51645a]"}`}>All</Button>
              {helpCategories.map((category) => (
                <Button key={category} type="button" variant="outline" onClick={() => setActiveCategory(category)} className={`rounded-full border-[#d8e3db] ${activeCategory === category ? "bg-[#3c6355] text-white hover:bg-[#315447] hover:text-white" : "text-[#51645a]"}`}>{category}</Button>
              ))}
            </div>
          </div>

          <Card className="mt-6 border-[#e1e8e3] bg-white p-5 shadow-sm sm:p-7">
            {filteredQuestions.length ? (
              <Accordion multiple defaultValue={[filteredQuestions[0]?.question]}>
                {filteredQuestions.map((item) => (
                  <AccordionItem key={item.question} value={item.question}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="px-4 py-12 text-center">
                <CircleHelp className="mx-auto size-9 text-[#3c6355]" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-[#28362f]">No answers found</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#748078]">Try a different search term or browse all topics to find what you need.</p>
                <Button type="button" variant="outline" onClick={() => { setQuery(""); setActiveCategory("All"); }} className="mt-5 rounded-full border-[#cbdacf] text-[#3c6355]">Clear search</Button>
              </div>
            )}
          </Card>
        </section>

        <section className="pt-12" aria-labelledby="support-heading">
          <Card className="border-[#d7e5db] bg-[#eef6f1] p-6 shadow-none sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#3c6355] shadow-sm"><CircleHelp className="size-5" aria-hidden="true" /></span>
                <div>
                  <h2 id="support-heading" className="text-xl font-bold text-[#315447]">Still need help?</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#64746b]">Start with the area related to your question. A dedicated support-ticket form is not connected yet, so Aspen does not collect a message that cannot be delivered.</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href="/bookings" className={buttonVariants({ variant: "outline", className: "rounded-full border-[#c8d9cc] bg-white text-[#3c6355] hover:bg-[#f7fbf8]" })}>My Bookings</Link>
                <Link href="/chats" className={buttonVariants({ className: "rounded-full bg-[#3c6355] text-white hover:bg-[#315447]" })}>Messages <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
            </div>
          </Card>
        </section>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#8a978f]">
          <Heart className="size-3.5 text-[#c5714e]" aria-hidden="true" />
          <span>Here to make pet care feel a little easier.</span>
        </div>
      </div>
    </main>
  );
}

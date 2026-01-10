'use client';

import { ArrowRight } from 'lucide-react';

export default function CareersPage() {
  const jobs = [
    {
      title: 'Senior React Developer',
      type: 'Full-time',
      location: 'Baghdad / Remote',
      dept: 'Engineering',
    },
    {
      title: 'Content Manager (Arabic)',
      type: 'Full-time',
      location: 'Baghdad',
      dept: 'Marketing',
    },
    {
      title: 'Logistics Coordinator',
      type: 'Shift-based',
      location: 'Basra',
      dept: 'Operations',
    },
  ];

  return (
    <div className="min-h-screen bg-white pt-20">
      <section className="bg-brand-yellow py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-brand-dark mb-4">
          Join The Revolution
        </h1>
        <p className="text-brand-dark/80 text-lg max-w-2xl mx-auto">
          We are building the future of the Iraqi digital economy. We need
          dreamers, doers, and creators.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-bold text-brand-dark mb-8">
          Open Positions
        </h2>

        <div className="space-y-4">
          {jobs.map((job, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              key={i}
              className="group bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center hover:border-brand-pink hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="mb-4 md:mb-0 text-center md:text-left">
                <h3 className="text-xl font-bold text-brand-dark group-hover:text-brand-pink transition-colors">
                  {job.title}
                </h3>
                <div className="flex gap-3 justify-center md:justify-start mt-2 text-sm text-slate-500">
                  <span>{job.dept}</span>
                  <span>•</span>
                  <span>{job.location}</span>
                  <span>•</span>
                  <span>{job.type}</span>
                </div>
              </div>
              <button
                type="button"
                className="px-6 py-2 rounded-full bg-slate-50 text-brand-dark font-medium group-hover:bg-brand-pink group-hover:text-white transition-colors flex items-center gap-2"
              >
                Apply Now <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

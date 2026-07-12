import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Self-serve handbook for team members running the admin console. Deliberately
 * short: only the tasks people actually do and the questions they actually
 * hit. If a new question comes up twice, add it here — nowhere else.
 */

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald/10 text-label font-bold text-emerald">{n}</span>
      <span className="text-small text-fg-2">{children}</span>
    </li>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-white p-4 shadow-card sm:p-5">
      <h2 className="text-h3 text-fg">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AdminGuide() {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <p className="eyebrow text-emerald">How this works</p>
        <h1 className="mt-1 text-h2 text-fg">Guide</h1>
        <p className="mt-1 text-label text-fg-3">
          Everything you need to run the course day-to-day. Each day = one video + its PDFs. Days unlock
          for learners automatically at <strong className="text-fg-2">4:00 AM IST</strong> - you never unlock anything by hand.
        </p>
      </div>

      <Card title="What each section does">
        <ul className="space-y-2 text-small text-fg-2">
          <li><strong className="text-fg">Content</strong> - the course itself: every day&apos;s title, YouTube video, and text.</li>
          <li><strong className="text-fg">Resources</strong> - the PDFs and links learners get, attached to a specific day.</li>
          <li><strong className="text-fg">Schedule</strong> - the cohort&apos;s start date. Day 1 opens on this date; everything follows from it.</li>
          <li><strong className="text-fg">Progress</strong> - who has completed what, learner by learner, day by day.</li>
        </ul>
      </Card>

      <Card title="Put up today's video">
        <ol className="space-y-2.5">
          <Step n={1}>Upload the video to the Elyst YouTube channel as <strong className="text-fg">Unlisted</strong> (never Public).</Step>
          <Step n={2}>Copy the link from the address bar.</Step>
          <Step n={3}>Go to <Link className="font-bold text-emerald underline-offset-4 hover:underline" href="/admin/content">Content</Link> → open the course → click the day.</Step>
          <Step n={4}>Paste the link into <strong className="text-fg">YouTube link or video ID</strong> and hit Save. That&apos;s it - the ID is extracted automatically.</Step>
        </ol>
      </Card>

      <Card title="Add the day's PDF">
        <ol className="space-y-2.5">
          <Step n={1}>Go to <Link className="font-bold text-emerald underline-offset-4 hover:underline" href="/admin/content/resources">Resources</Link> → open <strong className="text-fg">+ Add a resource</strong>.</Step>
          <Step n={2}>Give it a clear title (learners see it), then <strong className="text-fg">upload the PDF from your computer</strong> - no link needed.</Step>
          <Step n={3}>Under <strong className="text-fg">Day it belongs to</strong>, pick the day&apos;s lesson. This is what makes it appear on that day&apos;s page.</Step>
          <Step n={4}>Add resource. Done - it shows under the day&apos;s Materials and in the learner vault.</Step>
        </ol>
      </Card>

      <Card title="Running late with content? Relax.">
        <p className="text-small text-fg-2">
          If a day unlocks before the video or PDFs are up, learners do <strong className="text-fg">not</strong> see a broken or empty
          page. They see a friendly &ldquo;today&apos;s video is being prepared - check back later today&rdquo; message.
          Upload whenever it&apos;s ready and the page fixes itself. No announcement needed.
        </p>
      </Card>

      <Card title="Quick answers">
        <ul className="space-y-3 text-small text-fg-2">
          <li>
            <strong className="text-fg">When exactly does a day unlock?</strong><br />
            4:00 AM IST (2:30 AM in the Gulf). Day 1 = the start date on the Schedule page, day 2 the next morning, and so on.
          </li>
          <li>
            <strong className="text-fg">The video isn&apos;t showing for learners.</strong><br />
            Open the day in Content and re-paste the YouTube link. Check on YouTube that the video is Unlisted, not Private - Private videos won&apos;t play for anyone else.
          </li>
          <li>
            <strong className="text-fg">Can I fix a typo after a day is live?</strong><br />
            Yes. Edit and save - learners see the fix on their next page load. Same for swapping a PDF or video.
          </li>
          <li>
            <strong className="text-fg">Should I change the Schedule date mid-cohort?</strong><br />
            No, unless the founders say so - it shifts every remaining day for every learner at once.
          </li>
          <li>
            <strong className="text-fg">Is deleting safe?</strong><br />
            Delete asks for confirmation and cannot be undone. Renaming and editing are always safe.
          </li>
          <li>
            <strong className="text-fg">I get a 404 on /admin.</strong><br />
            Your email isn&apos;t on the admin list - only pre-approved accounts can even see this console. Ask Nihal to add you.
          </li>
          <li>
            <strong className="text-fg">Want to see what learners see?</strong><br />
            Use <strong className="text-fg">View as learner</strong> at the bottom of the sidebar (needs an enrolled account).
          </li>
        </ul>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/learn/markdown";
import { MarkDoneBar } from "@/components/learn/mark-done-button";
import { SubmissionForm } from "@/components/learn/submission-form";
import { VideoEmbed } from "@/components/learn/video-embed";
import { requireEnrollment } from "@/lib/lms/auth";
import { isUnlocked } from "@/lib/lms/drip";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent } from "@/lib/logging";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const IST_DATETIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const TYPE_LABEL: Record<string, string> = { video: "Video", text: "Lesson", task: "Task" };

export default async function LessonView({
  params,
}: {
  params: Promise<{ courseSlug: string; id: string }>;
}) {
  const { courseSlug, id } = await params;
  const { user, enrollment, batch, course } = await requireEnrollment(courseSlug);
  const now = new Date();

  const supabase = await createServerSupabaseClient();
  // Full ordered course list in one query: powers this lesson + prev/next.
  const { data: courseLessons } = await supabase
    .schema("app")
    .from("lessons")
    .select(
      "id, title, content_type, unlock_day_offset, position, is_preview, bunny_video_id, body_richtext, task_instructions, live_link, live_starts_at, modules!inner(course_id)"
    )
    .eq("modules.course_id", course.id)
    .order("unlock_day_offset", { ascending: true })
    .order("position", { ascending: true });

  const index = (courseLessons ?? []).findIndex((l) => l.id === id);
  if (index === -1) notFound();
  const lesson = courseLessons![index];

  const unlockedNow = (l: NonNullable<typeof courseLessons>[number]) =>
    l.is_preview || isUnlocked(l.unlock_day_offset, batch.starts_on, now);

  // Server-side drip enforcement: direct URL to a locked lesson 404s (T3 AC).
  if (!unlockedNow(lesson)) notFound();

  const prev = courseLessons!.slice(0, index).reverse().find(unlockedNow) ?? null;
  const next = courseLessons!.slice(index + 1).find(unlockedNow) ?? null;

  const [{ data: progressRow }, { data: submission }] = await Promise.all([
    supabase
      .schema("app")
      .from("lesson_progress")
      .select("id")
      .eq("enrollment_id", enrollment.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle(),
    lesson.content_type === "task"
      ? supabase
          .schema("app")
          .from("submissions")
          .select("url, note, storage_path")
          .eq("enrollment_id", enrollment.id)
          .eq("lesson_id", lesson.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  void logEvent({
    event: LMS_EVENTS.learner.lesson.viewed,
    profileId: user.id,
    payload: { lessonId: lesson.id, enrollmentId: enrollment.id, contentType: lesson.content_type },
  });

  const embedUrl =
    lesson.content_type === "video" && lesson.bunny_video_id
      ? `https://iframe.mediadelivery.net/embed/${process.env.BUNNY_STREAM_LIBRARY_ID}/${lesson.bunny_video_id}`
      : null;

  const dayHref = `/learn/${course.slug}/day/${lesson.unlock_day_offset}`;

  return (
    <article className="space-y-5 pb-2">
      {/* header */}
      <div className="rise" style={{ ["--stagger-i" as string]: 0 }}>
        <div className="flex items-center justify-between">
          <Link href={dayHref} className="text-label text-fg-3 hover:text-emerald">
            ← Day {lesson.unlock_day_offset + 1}
          </Link>
          <span className="rounded-pill bg-emerald/10 px-2.5 py-1 text-micro font-bold uppercase tracking-wide text-emerald">
            {TYPE_LABEL[lesson.content_type] ?? lesson.content_type}
          </span>
        </div>
        <h1 className="mt-2 font-display text-h3 font-bold tracking-display text-fg">
          {lesson.title}
        </h1>
      </div>

      {/* video: full-bleed cinema strip on mobile */}
      {embedUrl && (
        <div className="rise -mx-4 bg-ink sm:mx-0 sm:overflow-hidden sm:rounded-card sm:shadow-card" style={{ ["--stagger-i" as string]: 1 }}>
          <VideoEmbed lessonId={lesson.id} embedUrl={embedUrl} />
        </div>
      )}

      {/* live session */}
      {lesson.live_link && (
        <div className="surface-dark-hero rise rounded-card p-5" style={{ ["--stagger-i" as string]: 1 }}>
          <div className="flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-pill bg-green" />
            <p className="text-label font-semibold uppercase tracking-wide text-green">Live session</p>
          </div>
          {lesson.live_starts_at && (
            <p className="mt-2 text-small text-fg-muted-dark">
              {IST_DATETIME.format(new Date(lesson.live_starts_at))} IST
            </p>
          )}
          <a
            href={lesson.live_link}
            target="_blank"
            rel="noreferrer"
            className="pressable mt-4 inline-flex min-h-[48px] items-center justify-center rounded-md bg-green px-6 font-bold text-ink"
          >
            Join live class
          </a>
        </div>
      )}

      {lesson.body_richtext && (
        <div className="rise" style={{ ["--stagger-i" as string]: 2 }}>
          <Markdown>{lesson.body_richtext}</Markdown>
        </div>
      )}

      {lesson.content_type === "task" && (
        <>
          {lesson.task_instructions && (
            <div className="rise rounded-card border-l-4 border-green bg-white p-5 shadow-card" style={{ ["--stagger-i" as string]: 2 }}>
              <p className="mb-2 text-label font-bold uppercase tracking-wide text-emerald">✏️ Your task</p>
              <Markdown>{lesson.task_instructions}</Markdown>
            </div>
          )}
          <div className="rise" style={{ ["--stagger-i" as string]: 3 }}>
            <SubmissionForm
              lessonId={lesson.id}
              existing={
                submission
                  ? {
                      url: submission.url,
                      note: submission.note,
                      hasScreenshot: Boolean(submission.storage_path),
                    }
                  : null
              }
            />
          </div>
          {!submission && !progressRow && (
            <p className="text-label text-fg-3">
              Tip: submit your work before marking this done — it helps us give you feedback.
            </p>
          )}
        </>
      )}

      {/* prev/next continuity */}
      <nav className="flex items-center justify-between gap-4 border-t border-border pt-4 text-label">
        {prev ? (
          <Link href={`/learn/${course.slug}/lesson/${prev.id}`} className="min-w-0 text-fg-3 hover:text-emerald">
            ← <span className="font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/learn/${course.slug}/lesson/${next.id}`}
            className="min-w-0 text-right text-fg-3 hover:text-emerald"
          >
            <span className="font-medium">{next.title}</span> →
          </Link>
        )}
      </nav>

      <MarkDoneBar
        lessonId={lesson.id}
        initialCompleted={Boolean(progressRow)}
        nextHref={next ? `/learn/${course.slug}/lesson/${next.id}` : null}
        backHref={dayHref}
      />
    </article>
  );
}

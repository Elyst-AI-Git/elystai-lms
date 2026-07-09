import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/learn/markdown";
import { MarkDoneButton } from "@/components/learn/mark-done-button";
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

export default async function LessonView({
  params,
}: {
  params: Promise<{ courseSlug: string; id: string }>;
}) {
  const { courseSlug, id } = await params;
  const { user, enrollment, batch, course } = await requireEnrollment(courseSlug);

  const supabase = await createServerSupabaseClient();
  const { data: lesson } = await supabase
    .schema("app")
    .from("lessons")
    .select(
      "id, title, content_type, unlock_day_offset, is_preview, bunny_video_id, body_richtext, task_instructions, live_link, live_starts_at, modules!inner(course_id)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!lesson) notFound();
  const moduleRow = Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules;
  if (moduleRow.course_id !== course.id) notFound();

  // Server-side drip enforcement: a direct URL to a locked lesson 404s
  // (spec T3 AC). RLS already guaranteed enrollment; this is pacing.
  if (!lesson.is_preview && !isUnlocked(lesson.unlock_day_offset, batch.starts_on, new Date())) {
    notFound();
  }

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

  return (
    <article className="space-y-5">
      <div>
        <Link
          href={`/learn/${course.slug}/day/${lesson.unlock_day_offset}`}
          className="text-label text-fg-3 hover:text-emerald"
        >
          ← Day {lesson.unlock_day_offset + 1}
        </Link>
        <h1 className="mt-1 font-display text-h3 font-bold tracking-display text-fg">
          {lesson.title}
        </h1>
      </div>

      {lesson.live_link && (
        <div className="rounded-card border border-emerald/20 bg-emerald/5 p-5">
          <p className="text-label font-semibold uppercase tracking-wide text-emerald">Live session</p>
          {lesson.live_starts_at && (
            <p className="mt-1 text-small text-fg-2">
              {IST_DATETIME.format(new Date(lesson.live_starts_at))} IST
            </p>
          )}
          <a
            href={lesson.live_link}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-[48px] items-center justify-center rounded-md bg-emerald px-6 font-bold text-fg-on-dark transition-colors hover:bg-emerald-light"
          >
            Join live class
          </a>
        </div>
      )}

      {embedUrl && <VideoEmbed lessonId={lesson.id} embedUrl={embedUrl} />}

      {lesson.body_richtext && <Markdown>{lesson.body_richtext}</Markdown>}

      {lesson.content_type === "task" && (
        <>
          {lesson.task_instructions && (
            <div className="rounded-card bg-white p-5 shadow-card">
              <h2 className="mb-2 font-semibold text-fg">Your task</h2>
              <Markdown>{lesson.task_instructions}</Markdown>
            </div>
          )}
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
          {!submission && !progressRow && (
            <p className="text-label text-fg-3">
              Tip: submit your work before marking this done — it helps us give you feedback.
            </p>
          )}
        </>
      )}

      <MarkDoneButton lessonId={lesson.id} initialCompleted={Boolean(progressRow)} />
    </article>
  );
}

import {
  ClipboardList,
  FileText,
  Link2,
  Lock,
  Paperclip,
  PencilLine,
  Play,
  Video,
} from "lucide-react";

/**
 * SVG icon language for the LMS (no emoji as structural icons — one icon
 * family, consistent stroke). Lesson content types + vault resource kinds.
 */
export function LessonTypeIcon({
  type,
  className = "h-4 w-4",
}: {
  type: string;
  className?: string;
}) {
  const props = { className, strokeWidth: 2, "aria-hidden": true as const };
  switch (type) {
    case "video":
      return <Play {...props} />;
    case "task":
      return <PencilLine {...props} />;
    default:
      return <FileText {...props} />;
  }
}

export function ResourceKindIcon({
  kind,
  className = "h-4 w-4",
}: {
  kind: string;
  className?: string;
}) {
  const props = { className, strokeWidth: 2, "aria-hidden": true as const };
  switch (kind) {
    case "video":
      return <Video {...props} />;
    case "template":
      return <ClipboardList {...props} />;
    case "file":
      return <Paperclip {...props} />;
    case "doc":
      return <FileText {...props} />;
    default:
      return <Link2 {...props} />;
  }
}

export function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <Lock className={className} strokeWidth={2} aria-hidden />;
}

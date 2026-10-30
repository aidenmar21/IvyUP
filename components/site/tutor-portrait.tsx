import { BlurImage } from "@/components/shared/blur-image";
import { initials, photoUrl } from "@/lib/format";
import type { TutorDisplay } from "@/lib/types";

type Props = Pick<TutorDisplay, "name" | "title" | "school" | "description" | "fun_fact" | "photo_path" | "photo_blurhash"> & {
  /** For the admin live preview, which works with a local object URL. */
  previewSrc?: string | null;
};

export function TutorPortrait({ name, title, school, description, fun_fact, photo_path, photo_blurhash, previewSrc }: Props) {
  const src = previewSrc ?? photoUrl(photo_path);
  return (
    <article className="group flex flex-col gap-4">
      {src ? (
        <BlurImage
          src={src}
          alt={`Portrait of ${name}`}
          blurhash={photo_blurhash}
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
          className="aspect-[4/5] rounded-xl"
        />
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-ivy-100 font-display text-5xl text-ivy-700">
          {initials(name || "IvyUp")}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-display text-2xl text-ink-900">{name || "Tutor name"}</h3>
          {school && <p className="eyebrow text-brass-700">{school}</p>}
        </div>
        <p className="text-sm font-semibold text-ivy-700">{title || "Tutor"}</p>
      </div>
      <p className="text-base text-ink-600">{description || "A short description appears here."}</p>
      {fun_fact && (
        <p className="border-t border-line pt-4 text-sm text-ink-600">
          <span className="font-semibold text-ink-900">Fun fact · </span>
          {fun_fact}
        </p>
      )}
    </article>
  );
}

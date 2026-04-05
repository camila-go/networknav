import { CommunityGalleryWall } from "@/components/gallery/community-gallery-wall";

export const metadata = {
  title: "Gallery | GS26",
  description: "Community activity wall — shared interests and photos",
};

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-6xl px-3 py-6 text-white sm:px-4">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-sans text-2xl font-bold leading-snug tracking-tight text-balance text-white sm:text-3xl">
          <span className="inline-block overflow-visible px-0.5">
            Community gallery
          </span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
          See what attendees are into outside of work — photos cluster by
          activity, with a share of the cohort who named each interest (survey
          or photo label).
        </p>
      </header>
      <div className="mt-10">
        <CommunityGalleryWall />
      </div>
    </div>
  );
}

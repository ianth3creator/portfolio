import { CldImage } from "@/components/ui/cld-image";
import { wideImage } from "@/lib/project-utils";
import type { Project } from "@/lib/types";

/** Media shown on a project card. No server imports, so the strip's fallback row can use it too. */
type CardProject = Pick<Project, "cover" | "webShots" | "appShots">;

/** Cover or first web screenshot; for app-only projects, up to three phone screens side by side. */
export function CardMedia({ project, wide }: { project: CardProject; wide: boolean }) {
  const image = wideImage(project);
  if (image) {
    return (
      <div className="overflow-hidden rounded-[16px]">
        <CldImage
          src={image.publicId}
          width={image.width}
          height={image.height}
          crop="fill"
          gravity="north"
          sizes={wide ? "(min-width: 1024px) 1000px, 100vw" : "(min-width: 640px) 50vw, 100vw"}
          alt=""
          className="aspect-[16/10] w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      </div>
    );
  }
  const phones = project.appShots.filter((a) => a.resourceType === "image").slice(0, 3);
  if (!phones.length) return null;
  return (
    <div className="flex aspect-[16/10] items-end justify-center gap-[4%] overflow-hidden rounded-[16px] bg-paper-2 px-[8%] pt-[6%]">
      {phones.map((a, i) => (
        <CldImage
          key={a.publicId}
          src={a.publicId}
          width={a.width}
          height={a.height}
          sizes="(min-width: 640px) 15vw, 30vw"
          alt=""
          className={`w-[28%] rounded-t-[14px] shadow-[0_10px_24px_-14px_oklch(0.2_0.02_60/0.5)] transition-transform duration-500 ease-out ${
            i === 1 ? "-translate-y-[6%] group-hover:-translate-y-[9%]" : "group-hover:-translate-y-[2%]"
          }`}
        />
      ))}
    </div>
  );
}

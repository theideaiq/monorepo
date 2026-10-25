import Image from "next/image";
import { reviewImage } from "@/lib/images";

/** A review's photos as small square thumbnails, each opening full size. */
export const ReviewPhotos = ({
  label,
  photos,
}: {
  /** Alt text for every photo, e.g. "Photo from Sara's review". */
  readonly label: string;
  readonly photos: readonly string[];
}) =>
  photos.length > 0 ? (
    <ul className="flex flex-wrap gap-2">
      {photos.map((photo) => (
        <li key={photo}>
          <a
            className="relative block size-20 overflow-hidden rounded-md bg-surface-sunken"
            href={reviewImage(photo)}
            rel="noopener"
            target="_blank"
          >
            <Image
              alt={label}
              className="object-cover"
              fill
              sizes="80px"
              src={reviewImage(photo)}
            />
          </a>
        </li>
      ))}
    </ul>
  ) : null;

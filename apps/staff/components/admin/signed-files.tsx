export interface SignedFile {
  path: string;
  url: string | null;
}

/** Signs each path, keeping the ones that fail as missing (null). */
export const signAll = (
  paths: readonly string[],
  sign: (path: string) => Promise<string>
): Promise<SignedFile[]> =>
  Promise.all(
    paths.map(async (path) => ({
      path,
      url: await sign(path).catch(() => null),
    }))
  );

/** Signed links to a request's files: images inline, PDFs as links. */
export const SignedFiles = ({
  files,
  imageAlt,
  missingLabel,
  openLabel,
}: {
  readonly files: readonly SignedFile[];
  readonly imageAlt: string;
  readonly missingLabel: string;
  readonly openLabel: string;
}) => (
  <div className="flex flex-wrap gap-2">
    {files.map(({ path, url }) => {
      if (!url) {
        return (
          <p className="text-muted-foreground text-sm" key={path}>
            {missingLabel}
          </p>
        );
      }
      return (
        <a href={url} key={path} rel="noreferrer" target="_blank">
          {path.toLowerCase().endsWith(".pdf") ? (
            <span className="text-sm underline">{openLabel}</span>
          ) : (
            // biome-ignore lint/performance/noImgElement: a short-lived signed link
            <img
              alt={imageAlt}
              className="max-h-40 w-48 rounded object-contain"
              height={160}
              src={url}
              width={192}
            />
          )}
        </a>
      );
    })}
  </div>
);

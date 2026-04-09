export function PageIntro({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {children ? (
        <div className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {children}
        </div>
      ) : null}
    </div>
  );
}

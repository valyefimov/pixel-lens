/** Minimal 1.5px-stroke icon set, drawn on a 20×20 grid. */
const paths = {
  inspect: "M4 4l5 12 2-5 5-2L4 4z",
  measure: "M3 10h14M3 7v6M17 7v6M7 9v2M10 9v2M13 9v2",
  ruler: "M3 14L14 3l3 3L6 17l-3-3zM6 11l1.5 1.5M8.5 8.5l1.5 1.5M11 6l1.5 1.5",
  color: "M13.5 3.5l3 3-8 8H5.5v-3l8-8zM11.5 5.5l3 3M4 17h12",
  edit: "M4 16h3l8.5-8.5-3-3L4 13v3zM11 6l3 3",
  grid: "M3 3h14v14H3zM8 3v14M12 3v14",
  xray: "M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z",
  design: "M3 5h10v10H3zM7 3h10v10",
  colors: "M10 3a7 7 0 100 14c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.3-1-2.3 0-.8.7-1.2 1.5-1.2H14a3 3 0 003-3c0-3.3-3.1-6-7-6zM6.5 9.5h.01M8.5 6.5h.01M12 6.5h.01",
  fonts: "M4 16l4.5-12h1L14 16M6 12h6M14 9h3v7h-3",
  assets: "M3 4h14v12H3zM3 13l4-4 3 3 2-2 5 5M13 8h.01",
  audit: "M10 3l6 3v4c0 3.5-2.5 6.3-6 7-3.5-.7-6-3.5-6-7V6l6-3zM7.5 10l2 2 3.5-4",
  page: "M5 3h7l3 3v11H5zM12 3v3h3M8 10h4M8 13h4",
  edits: "M6 4v8M6 12a2 2 0 100 4 2 2 0 000-4zM14 8a2 2 0 100-4 2 2 0 000 4zM14 8c0 4-8 2-8 4",
  settings: "M10 7a3 3 0 100 6 3 3 0 000-6zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4",
  close: "M5 5l10 10M15 5L5 15",
  help: "M10 17a7 7 0 100-14 7 7 0 000 14zM8 8a2 2 0 113 1.7c-.6.4-1 .8-1 1.3v.5M10 14h.01",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

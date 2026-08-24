/*
 * ProBusinessCloud logo.
 *
 * The mark is a rounded square carrying a knocked-out P — the same shape the
 * product already draws for its own app rail, made official. It is authored as
 * geometry (a handful of arcs), not traced from a bitmap, so it stays crisp at
 * any size and can be recoloured by changing one value.
 *
 * Three lockups:
 *   "mark"   — the monogram alone (favicon, app rail, tight spaces)
 *   "lockup" — mark + wordmark side by side (navigation, footers)
 *   "full"   — mark above wordmark (stacked, for narrow spaces)
 *
 * Pass `mono` to render in a single ink that inherits `currentColor`, which is
 * what makes it work on dark grounds without a brightness/invert filter. In
 * mono the P is a hole punched through the square rather than a second colour,
 * so the ground shows through and the whole logo is one flat ink.
 *
 * `mark` is a bare <svg> so it can be exported or inlined as a favicon.
 * `lockup` and `full` compose that <svg> with real text rather than outlining
 * the wordmark: the type is then selectable and searchable, it renders with the
 * font's own hinting at every size, and the mark and wordmark align optically
 * through flexbox instead of through baseline metrics baked into a viewBox.
 */

const BRAND = '#2C6BF5';
const INK = '#0A0A12';

/* Type stack mirrors --font-display in the public site's design system. */
const WORDMARK_FONT = "'Outfit', 'Inter', system-ui, -apple-system, sans-serif";

/* The rounded square, as a path so the mono version can punch the P through it
   with a single even-odd fill. Corner radius 15 of 64. */
const SQUIRCLE =
  'M15 0h34a15 15 0 0 1 15 15v34a15 15 0 0 1-15 15H15A15 15 0 0 1 0 49V15A15 15 0 0 1 15 0Z';

/* The P: stem 8 wide, bowl radius 11.5, counter radius 3.5. The second subpath
   is the counter, which even-odd fill returns to the square's colour. */
const GLYPH_P = 'M20 15h13.5a11.5 11.5 0 0 1 0 23H28v11h-8V15Zm8 8v7h5.5a3.5 3.5 0 0 0 0-7H28Z';

function Mark({ mono, size, style, children, ...rest }) {
  return (
    <svg
      viewBox="0 0 64 64"
      style={{ height: size, width: size, display: 'block', flexShrink: 0, ...style }}
      {...rest}
    >
      {children}
      {mono ? (
        /* One ink. Square filled, P punched out, counter filled back in. */
        <path fill="currentColor" fillRule="evenodd" d={`${SQUIRCLE} ${GLYPH_P}`} />
      ) : (
        <>
          <path fill={BRAND} d={SQUIRCLE} />
          <path fill="#FFFFFF" fillRule="evenodd" d={GLYPH_P} />
        </>
      )}
    </svg>
  );
}

/* "Pro" and "Cloud" carry the weight; the middle drops back so the name reads
   as three parts rather than one long word. */
function Wordmark({ mono, fontSize }) {
  return (
    <span
      style={{
        fontFamily: WORDMARK_FONT,
        fontSize,
        fontWeight: 600,
        letterSpacing: '-0.025em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: mono ? 'currentColor' : INK,
      }}
    >
      Pro<span style={{ fontWeight: 300 }}>Business</span>Cloud
    </span>
  );
}

export default function Logo({
  variant = 'lockup',
  mono = false,
  height = 32,
  title = 'ProBusinessCloud',
  decorative = false,
  style,
  className,
  ...rest
}) {
  const a11y = decorative
    ? { 'aria-hidden': 'true', focusable: 'false' }
    : { role: 'img', 'aria-label': title };

  if (variant === 'mark') {
    return (
      <Mark mono={mono} size={height} className={className} style={style} {...a11y} {...rest}>
        {!decorative && <title>{title}</title>}
      </Mark>
    );
  }

  const stacked = variant === 'full';

  /* `height` is the height of the whole logo. Stacked, that has to cover the
     mark, the gap and the wordmark; side by side, the mark alone sets it. */
  const markSize = stacked ? height * 0.6 : height;
  const fontSize = stacked ? height * 0.22 : height * 0.58;
  const gap = stacked ? height * 0.14 : height * 0.34;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        ...style,
      }}
      {...a11y}
      {...rest}
    >
      <Mark mono={mono} size={markSize} aria-hidden="true" focusable="false" />
      <Wordmark mono={mono} fontSize={fontSize} />
    </span>
  );
}

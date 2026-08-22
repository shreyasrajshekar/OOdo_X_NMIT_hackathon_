const CONTOURS = [0, 74, 148, 222, 296, 370, 444, 518];

/** Canvas the light-side lines are drawn on. Twice as wide as the pane so a
 *  -50% translate lands on an identical phase and the loop is seamless. */
const LINE_W = 2880;
const LINE_H = 620;

/**
 * One periodic wave line. `seg` is a half-period, so the pattern repeats every
 * `2 * seg`; every value used below divides 720, which is what makes the -50%
 * shift seamless.
 */
function line(baseline: number, amp: number, seg: number) {
  const count = Math.ceil(LINE_W / seg);
  let d = `M0,${baseline} q${seg / 2},${-amp} ${seg},0`;
  for (let i = 1; i < count; i++) d += ` t${seg},0`;
  return d;
}

type LineLayer = {
  d: string;
  opacity: number;
  width: number;
  duration: string;
  reverse?: boolean;
};

/** Five hairlines, no fills. Different periods and speeds, so they drift
 *  through each other instead of moving as a block. */
const LIGHT_LINES: LineLayer[] = [
  { d: line(150, 40, 480), opacity: 0.16, width: 1.1, duration: "17s" },
  { d: line(258, 62, 720), opacity: 0.22, width: 1.4, duration: "13s", reverse: true },
  { d: line(360, 34, 360), opacity: 0.13, width: 1, duration: "20s" },
  { d: line(452, 56, 720), opacity: 0.2, width: 1.3, duration: "15s", reverse: true },
  { d: line(536, 30, 480), opacity: 0.12, width: 1, duration: "11s" },
];

/**
 * Wave fields for the auth screens.
 *
 * `tone="plum"` is the left panel: paper-coloured contour lines over the deep
 * plum ground, easing back and forth.
 *
 * `tone="paper"` is the form side — the same idea in reverse, drawn as plum
 * hairlines on paper that flow continuously rather than rock, each at its own
 * period and speed.
 */
export function AuthWaves({ tone = "plum" }: { tone?: "plum" | "paper" }) {
  if (tone === "paper") return <LightWaves />;
  return <PlumWaves />;
}

function LightWaves() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* One slow bloom behind the card, so the middle of the pane still
          breathes where the lines are sparse. */}
      <div
        className="wave-bloom absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(135,90,123,0.09) 0%, rgba(135,90,123,0.03) 46%, transparent 70%)",
        }}
      />

      {LIGHT_LINES.map((layer, i) => (
        <svg
          key={i}
          className={`${layer.reverse ? "wave-flow-reverse" : "wave-flow"} absolute inset-y-0 left-0 h-full w-[200%]`}
          style={{ animationDuration: layer.duration }}
          viewBox={`0 0 ${LINE_W} ${LINE_H}`}
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d={layer.d}
            stroke="#875A7B"
            strokeOpacity={layer.opacity}
            strokeWidth={layer.width}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </div>
  );
}

function PlumWaves() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Contour lines. Drawn wider than the panel so the drift never
          exposes an end. */}
      <svg
        className="wave-drift absolute inset-0 h-full w-[130%]"
        viewBox="0 0 900 620"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="wave-contour-plum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBF9FB" stopOpacity="0.30" />
            <stop offset="55%" stopColor="#FBF9FB" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#FBF9FB" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {CONTOURS.map((offset, i) => (
          <path
            key={offset}
            d={`M-60,${46 + offset} C110,${-6 + offset} 250,${112 + offset} 430,${58 + offset} S740,${-2 + offset} 960,${74 + offset}`}
            stroke="url(#wave-contour-plum)"
            strokeWidth={i % 2 === 0 ? 1.6 : 1}
          />
        ))}
      </svg>

      {/* Swells along the bottom edge. */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[42%] w-full"
        viewBox="0 0 1440 380"
        preserveAspectRatio="none"
      >
        <path
          d="M0,186 C220,248 430,118 700,158 C940,194 1180,288 1440,226 L1440,380 L0,380 Z"
          fill="#875A7B"
          fillOpacity="0.40"
        />
        <path
          d="M0,248 C260,300 470,188 720,224 C980,262 1200,330 1440,284 L1440,380 L0,380 Z"
          fill="#875A7B"
          fillOpacity="0.55"
        />
        <path
          d="M0,306 C240,346 500,268 760,300 C1010,330 1220,362 1440,330 L1440,380 L0,380 Z"
          fill="#201A1E"
          fillOpacity="0.22"
        />
      </svg>
    </div>
  );
}

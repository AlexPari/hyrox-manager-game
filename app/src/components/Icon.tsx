import Svg, { Circle, Path, Rect } from "react-native-svg";

// Line icons from the design system (24 x 24, stroke 2, round caps).
const paths = {
  back: [<Path key="p" d="M15 6l-6 6 6 6" />],
  chevron: [<Path key="p" d="M9 6l6 6-6 6" />],
  bolt: [<Path key="p" d="M13 2L4 14h7l-1 8 9-12h-7z" />],
  coin: [<Circle key="c" cx={12} cy={12} r={8} />, <Path key="p" d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />],
  gem: [<Path key="a" d="M6 3h12l4 6-10 12L2 9z" />, <Path key="b" d="M2 9h20M9 3l3 18 3-18" />],
  plus: [<Path key="p" d="M12 5v14M5 12h14" />],
  check: [<Path key="p" d="M5 12l5 5L20 7" />],
  close: [<Path key="p" d="M6 6l12 12M18 6L6 18" />],
  play: [<Path key="p" d="M7 5l12 7-12 7z" />],
  pulse: [<Path key="p" d="M3 12h4l3-7 4 14 3-7h4" />],
  train: [<Path key="p" d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12" />],
  rank: [<Path key="p" d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8" />],
  season: [<Rect key="r" x={3} y={5} width={18} height={16} rx={2} />, <Path key="p" d="M3 10h18M8 3v4M16 3v4" />],
  athlete: [<Circle key="c" cx={12} cy={8} r={4} />, <Path key="p" d="M4 21c0-4 4-6 8-6s8 2 8 6" />],
  badge: [<Circle key="c" cx={12} cy={9} r={6} />, <Path key="p" d="M8.5 14L7 22l5-3 5 3-1.5-8" />],
  pass: [
    <Path key="a" d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z" />,
    <Path key="b" d="M14 5v14" strokeDasharray="2 2" />,
  ],
  bag: [<Path key="p" d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2" />],
  snow: [<Path key="p" d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10M9 4l3 2 3-2M9 20l3-2 3 2" />],
  lock: [<Rect key="r" x={5} y={11} width={14} height={10} rx={2} />, <Path key="p" d="M8 11V7a4 4 0 0 1 8 0v4" />],
  info: [<Circle key="c" cx={12} cy={12} r={9} />, <Path key="p" d="M12 11v6M12 7.5v.5" />],
  clock: [<Circle key="c" cx={12} cy={12} r={9} />, <Path key="p" d="M12 7v5l3 2" />],
  skip: [<Path key="p" d="M5 5l8 7-8 7zM15 5v14" />],
  tv: [<Rect key="r" x={3} y={6} width={18} height={12} rx={2} />, <Path key="p" d="M10 9.5l4 2.5-4 2.5z" />],
  replay: [<Path key="p" d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />],
  home: [<Path key="p" d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />],
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 20,
  color = "#F2F4F7",
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </Svg>
  );
}

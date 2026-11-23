import Svg, { Circle, Path, Rect } from "react-native-svg";

// Line icons from the design system (24 x 24, stroke 2, round caps).
const paths = {
  back: [<Path key="p" d="M15 6l-6 6 6 6" />],
  bolt: [<Path key="p" d="M13 2L4 14h7l-1 8 9-12h-7z" />],
  coin: [<Circle key="c" cx={12} cy={12} r={8} />, <Path key="p" d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />],
  gem: [<Path key="a" d="M6 3h12l4 6-10 12L2 9z" />, <Path key="b" d="M2 9h20M9 3l3 18 3-18" />],
  plus: [<Path key="p" d="M12 5v14M5 12h14" />],
  check: [<Path key="p" d="M5 12l5 5L20 7" />],
  play: [<Path key="p" d="M7 5l12 7-12 7z" />],
  pulse: [<Path key="p" d="M3 12h4l3-7 4 14 3-7h4" />],
  train: [<Path key="p" d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12" />],
  rank: [<Path key="p" d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8" />],
  season: [<Rect key="r" x={3} y={5} width={18} height={16} rx={2} />, <Path key="p" d="M3 10h18M8 3v4M16 3v4" />],
  clock: [<Circle key="c" cx={12} cy={12} r={9} />, <Path key="p" d="M12 7v5l3 2" />],
  skip: [<Path key="p" d="M5 5l8 7-8 7zM15 5v14" />],
  tv: [<Rect key="r" x={3} y={6} width={18} height={12} rx={2} />, <Path key="p" d="M10 9.5l4 2.5-4 2.5z" />],
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

import {look, type Pose} from '../../../observatory/office-motion.ts';

// An original little blob with a hat. Decoration only (aria-hidden): the card's words carry every fact.
const BODY = ['M6 28 C4 12 14 4 20 4 C26 4 36 12 34 28 Z', 'M5 28 C5 14 12 6 20 6 C28 6 35 14 35 28 Z', 'M8 28 C2 18 10 3 20 3 C30 3 38 18 32 28 Z', 'M4 28 C6 10 15 5 20 5 C25 5 34 10 36 28 Z'];
const HAT = ['M10 9 L20 -2 L30 9 Z', 'M9 8 H31 V3 H9 Z M14 3 V-3 H26 V3 Z', 'M8 9 C10 -1 30 -1 32 9 Z', 'M12 8 L28 8 L20 1 Z M18 1 L22 1 L20 -4 Z'];

export function Character({project, pose, animate}: {project: string; pose: Pose; animate: boolean}) {
  const {hue, body, hat} = look(project), fill = `hsl(${hue} 55% 62%)`, dark = `hsl(${hue} 45% 32%)`;
  return (
    <svg className={`ob-char${animate && pose !== 'quiet' ? ' ob-bob' : ''}`} viewBox="0 -6 40 40" width="36" height="36" aria-hidden="true" focusable="false">
      <path d={BODY[body]} fill={fill} stroke={dark} strokeWidth="1.5" />
      <path d={HAT[hat]} fill={dark} />
      <circle cx="15" cy="19" r="2" fill="#222" /><circle cx="25" cy="19" r="2" fill="#222" />
      {pose === 'waiting' ? <text x="29" y="8" fontSize="14" fontWeight="700" fill="#b45309">!</text> : null}
      {pose === 'typing' ? <path d="M12 26 H28" stroke="#222" strokeWidth="2" strokeDasharray="3 3" /> : null}
      {pose === 'checking' ? <><circle cx="29" cy="24" r="4" fill="none" stroke="#6d28d9" strokeWidth="1.5" /><path d="M32 27 L36 31" stroke="#6d28d9" strokeWidth="1.5" /></> : null}
      {pose === 'passed' ? <path d="M13 25 L18 29 L28 23" fill="none" stroke="#166534" strokeWidth="2.5" /> : null}
      {pose === 'stuck' ? <path d="M13 26 Q20 22 27 26" fill="none" stroke="#b91c1c" strokeWidth="2" /> : null}
      {pose === 'quiet' ? <path d="M13 26 H27" stroke="#555" strokeWidth="2" /> : null}
    </svg>
  );
}

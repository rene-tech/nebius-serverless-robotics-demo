const svg = ({ label, subtitle, body }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="floor" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6f8fb"/>
      <stop offset="1" stop-color="#dfe7f0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#192332" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="640" height="420" fill="url(#floor)"/>
  <rect x="32" y="34" width="576" height="352" rx="22" fill="#ffffff" stroke="#b9c5d4"/>
  <text x="52" y="68" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#1b2533">${label}</text>
  <text x="52" y="94" font-family="Inter, Arial, sans-serif" font-size="13" fill="#53657a">${subtitle}</text>
  ${body}
</svg>`;

const tabletopSvg = svg({
  label: "Tabletop pick and place",
  subtitle: "Camera frame: cup, plate, block, and reachable target area",
  body: `
  <ellipse cx="320" cy="238" rx="236" ry="104" fill="#eef4f8" stroke="#9fb0c5" stroke-width="2"/>
  <rect x="101" y="185" width="438" height="156" rx="22" fill="#d7ecf2" stroke="#9fb0c5" stroke-width="2"/>
  <rect x="448" y="213" width="74" height="70" rx="12" fill="#e8f6ed" stroke="#6eb481" stroke-width="3"/>
  <text x="462" y="254" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="#287045">TARGET</text>
  <ellipse cx="322" cy="263" rx="54" ry="29" fill="#f7f2df" stroke="#c1ad68" stroke-width="4" filter="url(#shadow)"/>
  <circle cx="322" cy="263" r="18" fill="#ffffff" stroke="#d8cc9e" stroke-width="2"/>
  <rect x="143" y="164" width="64" height="104" rx="16" fill="#d9403a" stroke="#9b211d" stroke-width="4" filter="url(#shadow)"/>
  <ellipse cx="175" cy="166" rx="31" ry="11" fill="#f18a83"/>
  <ellipse cx="175" cy="266" rx="28" ry="9" fill="#ac2a25"/>
  <rect x="238" y="204" width="58" height="58" rx="9" fill="#3777da" stroke="#1d4e9b" stroke-width="4" filter="url(#shadow)"/>
  <path d="M126 137h98l-17 27h-64z" fill="#334155"/>
  <circle cx="138" cy="294" r="5" fill="#607086"/>
  <circle cx="504" cy="305" r="5" fill="#607086"/>`
});

const warehouseSvg = svg({
  label: "Warehouse bin picking",
  subtitle: "Camera frame: mixed objects inside a tote",
  body: `
  <rect x="95" y="126" width="448" height="222" rx="26" fill="#c9d7e8" stroke="#6d7d91" stroke-width="8" filter="url(#shadow)"/>
  <rect x="124" y="154" width="390" height="164" rx="18" fill="#eef3f8" stroke="#9aa8ba" stroke-width="2"/>
  <rect x="166" y="195" width="92" height="56" rx="10" fill="#f5b43c" stroke="#a86f10" stroke-width="4"/>
  <circle cx="340" cy="226" r="40" fill="#43a270" stroke="#216143" stroke-width="4"/>
  <path d="M420 180l66 42-48 63-62-46z" fill="#6676e8" stroke="#3440a4" stroke-width="4"/>
  <rect x="214" y="259" width="82" height="35" rx="9" fill="#d85050" stroke="#9c2424" stroke-width="4"/>
  <path d="M103 126l44-54h344l52 54z" fill="#8294aa" stroke="#6d7d91" stroke-width="4"/>
  <line x1="153" y1="154" x2="129" y2="318" stroke="#d9e2ed" stroke-width="2"/>
  <line x1="486" y1="154" x2="512" y2="318" stroke="#d9e2ed" stroke-width="2"/>`
});

const sortingSvg = svg({
  label: "Color sorting task",
  subtitle: "Camera frame: colored pieces and three bins",
  body: `
  <rect x="74" y="150" width="492" height="174" rx="22" fill="#eef2f7" stroke="#9fb0c5" stroke-width="2"/>
  <rect x="92" y="171" width="108" height="118" rx="14" fill="#f7dddd" stroke="#d14c4c" stroke-width="4"/>
  <rect x="266" y="171" width="108" height="118" rx="14" fill="#dbeafe" stroke="#3d76d5" stroke-width="4"/>
  <rect x="440" y="171" width="108" height="118" rx="14" fill="#dcf7e8" stroke="#32a46b" stroke-width="4"/>
  <circle cx="154" cy="346" r="23" fill="#dc3535" stroke="#982020" stroke-width="4" filter="url(#shadow)"/>
  <rect x="299" y="326" width="48" height="48" rx="9" fill="#3376db" stroke="#174b9a" stroke-width="4" filter="url(#shadow)"/>
  <path d="M476 323l35 61h-70z" fill="#2fa467" stroke="#19633d" stroke-width="4" filter="url(#shadow)"/>
  <text x="122" y="239" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="#9b2424">RED</text>
  <text x="299" y="239" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="#1f57a7">BLUE</text>
  <text x="466" y="239" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="#1f744b">GREEN</text>`
});

const fragileSvg = svg({
  label: "Safety around fragile item",
  subtitle: "Camera frame: requested target near fragile glass",
  body: `
  <rect x="94" y="152" width="452" height="174" rx="22" fill="#e8f1f4" stroke="#9fb0c5" stroke-width="2"/>
  <rect x="147" y="197" width="72" height="78" rx="16" fill="#f45b4f" stroke="#9b211d" stroke-width="4" filter="url(#shadow)"/>
  <ellipse cx="183" cy="198" rx="34" ry="11" fill="#f4938d"/>
  <path d="M296 172c31 34 30 86 3 116h58c-26-30-28-82 3-116z" fill="#dff6ff" stroke="#54a6bd" stroke-width="4" filter="url(#shadow)"/>
  <ellipse cx="328" cy="172" rx="32" ry="10" fill="#f8fdff" stroke="#54a6bd" stroke-width="3"/>
  <rect x="402" y="206" width="82" height="58" rx="12" fill="#5a7be0" stroke="#273f9e" stroke-width="4" filter="url(#shadow)"/>
  <path d="M282 133h92l-16 31h-60z" fill="#f3c74d" stroke="#916b0a" stroke-width="4"/>
  <text x="283" y="128" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="#7a4b05">FRAGILE ZONE</text>
  <path d="M252 135l157 196" stroke="#d13b3b" stroke-width="7" stroke-linecap="round" opacity="0.25"/>
  <path d="M409 135L252 331" stroke="#d13b3b" stroke-width="7" stroke-linecap="round" opacity="0.25"/>`
});

const navigationSvg = svg({
  label: "Navigation-like obstacle avoidance",
  subtitle: "Camera frame: start, obstacle, and target dock",
  body: `
  <rect x="72" y="120" width="496" height="230" rx="26" fill="#edf3f7" stroke="#9fb0c5" stroke-width="2"/>
  <path d="M122 281c85-72 162-72 231 1s119 53 164-27" fill="none" stroke="#cad7e5" stroke-width="28" stroke-linecap="round"/>
  <circle cx="154" cy="285" r="34" fill="#2b7bdc" stroke="#174b9a" stroke-width="5" filter="url(#shadow)"/>
  <rect x="432" y="144" width="74" height="74" rx="12" fill="#45aa68" stroke="#20623b" stroke-width="5" filter="url(#shadow)"/>
  <rect x="286" y="207" width="92" height="70" rx="14" fill="#f0a33b" stroke="#a85d0e" stroke-width="5" filter="url(#shadow)"/>
  <text x="126" y="351" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="#174b9a">START</text>
  <text x="435" y="238" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="#20623b">DOCK</text>
  <text x="299" y="197" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="#8a4b0d">OBSTACLE</text>`
});

const ambiguousSvg = svg({
  label: "Ambiguous instruction",
  subtitle: "Camera frame: two similar red cups and one safe target area",
  body: `
  <rect x="88" y="151" width="464" height="178" rx="22" fill="#eef4f8" stroke="#9fb0c5" stroke-width="2"/>
  <rect x="145" y="194" width="62" height="92" rx="15" fill="#d9403a" stroke="#9b211d" stroke-width="4" filter="url(#shadow)"/>
  <ellipse cx="176" cy="195" rx="30" ry="10" fill="#f18a83"/>
  <rect x="247" y="194" width="62" height="92" rx="15" fill="#d9403a" stroke="#9b211d" stroke-width="4" filter="url(#shadow)"/>
  <ellipse cx="278" cy="195" rx="30" ry="10" fill="#f18a83"/>
  <rect x="410" y="191" width="86" height="79" rx="13" fill="#e9f7ef" stroke="#61aa79" stroke-width="4"/>
  <text x="424" y="235" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" fill="#287045">SAFE AREA</text>
  <circle cx="184" cy="305" r="8" fill="#334155"/>
  <circle cx="278" cy="305" r="8" fill="#334155"/>
  <text x="135" y="323" font-family="Inter, Arial, sans-serif" font-size="12" fill="#53657a">left cup</text>
  <text x="240" y="323" font-family="Inter, Arial, sans-serif" font-size="12" fill="#53657a">right cup</text>`
});

const safetyStopSvg = svg({
  label: "Safety stop case",
  subtitle: "Camera frame: human hand inside active workspace",
  body: `
  <rect x="80" y="144" width="480" height="188" rx="22" fill="#eef4f8" stroke="#9fb0c5" stroke-width="2"/>
  <rect x="132" y="183" width="78" height="86" rx="15" fill="#d9403a" stroke="#9b211d" stroke-width="4" filter="url(#shadow)"/>
  <ellipse cx="171" cy="184" rx="36" ry="11" fill="#f18a83"/>
  <path d="M336 260c25-39 47-47 67-40 18 6 32 25 56 26 28 1 53-20 75-8 11 6 11 22-1 31-26 21-73 37-117 34-37-3-68-13-95-15-16-1-22-11-16-24 5-10 15-9 31-4z" fill="#f0bc8e" stroke="#a2633e" stroke-width="4" filter="url(#shadow)"/>
  <rect x="248" y="185" width="52" height="52" rx="8" fill="#3478d9" stroke="#174b9a" stroke-width="4"/>
  <path d="M290 125h112l-19 36h-74z" fill="#e04444" stroke="#982020" stroke-width="4"/>
  <text x="303" y="149" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" fill="#ffffff">STOP</text>
  <path d="M270 154l192 167" stroke="#d13b3b" stroke-width="8" stroke-linecap="round" opacity="0.28"/>
  <path d="M462 154L270 321" stroke="#d13b3b" stroke-width="8" stroke-linecap="round" opacity="0.28"/>`
});

export const scenes = [
  {
    id: "tabletop-pick-place",
    title: "Tabletop pick-and-place",
    task: "Move the red cup to the marked target area while avoiding the plate.",
    prompt: "Pick up the red cup and place it near the target area without touching the plate.",
    imageSvg: tabletopSvg,
    presenterNotes: "Use this as the opening demo. It shows object selection, trajectory, and latency in one simple scene.",
    expected: {
      objects: [
        { name: "red cup", bbox: [143, 164, 207, 276], confidence: 0.94 },
        { name: "plate", bbox: [268, 233, 376, 292], confidence: 0.91 },
        { name: "blue block", bbox: [238, 204, 296, 262], confidence: 0.88 },
        { name: "target area", bbox: [448, 213, 522, 283], confidence: 0.9 }
      ],
      selected_object: "red cup",
      action_steps: [
        "Move the gripper above the red cup.",
        "Descend vertically until the gripper reaches the cup rim.",
        "Close the gripper with a light grasp.",
        "Lift the cup above the plate height.",
        "Move to the marked target area and release."
      ],
      trajectory: [
        { x: 175, y: 140 },
        { x: 176, y: 224 },
        { x: 220, y: 150 },
        { x: 365, y: 156 },
        { x: 486, y: 236 }
      ],
      safety_notes: ["Keep clearance over the plate.", "Use a slow release inside the marked target area."],
      confidence: 0.89
    }
  },
  {
    id: "warehouse-bin-pick",
    title: "Warehouse bin picking",
    task: "Select the requested yellow package from a mixed bin.",
    prompt: "Pick the yellow package from the bin and lift it clear of the other objects.",
    imageSvg: warehouseSvg,
    presenterNotes: "Good for explaining Dockerized visual inference as an API endpoint.",
    expected: {
      objects: [
        { name: "yellow package", bbox: [166, 195, 258, 251], confidence: 0.92 },
        { name: "green ball", bbox: [300, 186, 380, 266], confidence: 0.89 },
        { name: "purple parcel", bbox: [376, 180, 486, 285], confidence: 0.86 },
        { name: "red tool", bbox: [214, 259, 296, 294], confidence: 0.83 }
      ],
      selected_object: "yellow package",
      action_steps: [
        "Move to the center of the yellow package.",
        "Approach from above to avoid pushing nearby objects.",
        "Grip across the narrow side of the package.",
        "Lift straight up until the object clears the tote rim."
      ],
      trajectory: [
        { x: 212, y: 150 },
        { x: 212, y: 224 },
        { x: 212, y: 132 },
        { x: 128, y: 104 }
      ],
      safety_notes: ["Avoid side contact with the green ball.", "Keep the package level while lifting."],
      confidence: 0.86
    }
  },
  {
    id: "color-sorting",
    title: "Color sorting",
    task: "Sort the loose colored pieces into the matching bins.",
    prompt: "Sort the red, blue, and green pieces into their matching bins.",
    imageSvg: sortingSvg,
    presenterNotes: "Use this to show multi-object planning and repeated action steps.",
    expected: {
      objects: [
        { name: "red circle", bbox: [131, 323, 177, 369], confidence: 0.95 },
        { name: "blue square", bbox: [299, 326, 347, 374], confidence: 0.93 },
        { name: "green triangle", bbox: [441, 323, 511, 384], confidence: 0.92 },
        { name: "red bin", bbox: [92, 171, 200, 289], confidence: 0.9 },
        { name: "blue bin", bbox: [266, 171, 374, 289], confidence: 0.9 },
        { name: "green bin", bbox: [440, 171, 548, 289], confidence: 0.9 }
      ],
      selected_object: "red circle, blue square, green triangle",
      action_steps: [
        "Move the red circle into the red bin.",
        "Move the blue square into the blue bin.",
        "Move the green triangle into the green bin.",
        "Verify each piece is fully inside its matching bin."
      ],
      trajectory: [
        { x: 154, y: 346 },
        { x: 146, y: 230 },
        { x: 323, y: 350 },
        { x: 320, y: 230 },
        { x: 476, y: 352 },
        { x: 494, y: 230 }
      ],
      safety_notes: ["Use one item per grasp.", "Keep the arm above bin walls during lateral moves."],
      confidence: 0.88
    }
  },
  {
    id: "fragile-avoidance",
    title: "Fragile object avoidance",
    task: "Move the cup while avoiding a fragile glass in the center.",
    prompt: "Move the red cup to the open area, but do not pass over the glass.",
    imageSvg: fragileSvg,
    presenterNotes: "Use this for the safety story: the plan changes because of the fragile zone.",
    expected: {
      objects: [
        { name: "red cup", bbox: [147, 197, 219, 275], confidence: 0.93 },
        { name: "fragile glass", bbox: [296, 162, 360, 292], confidence: 0.9 },
        { name: "blue box", bbox: [402, 206, 484, 264], confidence: 0.86 }
      ],
      selected_object: "red cup",
      action_steps: [
        "Approach the red cup from the left side.",
        "Lift the cup before any lateral movement.",
        "Route around the fragile glass instead of passing over it.",
        "Place the cup in the open area with low speed."
      ],
      trajectory: [
        { x: 183, y: 172 },
        { x: 183, y: 236 },
        { x: 182, y: 128 },
        { x: 248, y: 118 },
        { x: 454, y: 288 }
      ],
      safety_notes: ["Never pass the payload over the glass.", "Keep the fragile zone outside the swept path."],
      confidence: 0.84
    }
  },
  {
    id: "navigation-obstacle",
    title: "Obstacle avoidance",
    task: "Move from start to dock while avoiding a central obstacle.",
    prompt: "Plan a path from the blue robot start marker to the green dock while avoiding the orange obstacle.",
    imageSvg: navigationSvg,
    presenterNotes: "Useful when the audience wants to see a trajectory rather than a grasp plan.",
    expected: {
      objects: [
        { name: "blue start marker", bbox: [120, 251, 188, 319], confidence: 0.95 },
        { name: "orange obstacle", bbox: [286, 207, 378, 277], confidence: 0.93 },
        { name: "green dock", bbox: [432, 144, 506, 218], confidence: 0.92 }
      ],
      selected_object: "green dock",
      action_steps: [
        "Start at the blue marker with the obstacle in view.",
        "Follow the left edge of the free corridor.",
        "Curve around the obstacle with a safety margin.",
        "Approach the green dock from the lower-left side."
      ],
      trajectory: [
        { x: 154, y: 285 },
        { x: 222, y: 236 },
        { x: 284, y: 166 },
        { x: 391, y: 168 },
        { x: 469, y: 181 }
      ],
      safety_notes: ["Maintain clearance from the obstacle.", "Slow down during the final dock approach."],
      confidence: 0.87
    }
  },
  {
    id: "ambiguous-cups",
    title: "Ambiguous instruction",
    task: "Resolve an ambiguous instruction by choosing the safer target.",
    prompt: "Move the red cup to the safe area.",
    imageSvg: ambiguousSvg,
    presenterNotes: "Shows that the model can explain ambiguity and choose a safe interpretation.",
    expected: {
      objects: [
        { name: "left red cup", bbox: [145, 194, 207, 286], confidence: 0.91 },
        { name: "right red cup", bbox: [247, 194, 309, 286], confidence: 0.91 },
        { name: "safe area", bbox: [410, 191, 496, 270], confidence: 0.9 }
      ],
      selected_object: "left red cup",
      action_steps: [
        "Identify two candidate red cups.",
        "Choose the left cup because it has a clearer approach path.",
        "Pick the left cup from above.",
        "Move it to the safe area and release."
      ],
      trajectory: [
        { x: 176, y: 164 },
        { x: 176, y: 240 },
        { x: 230, y: 150 },
        { x: 356, y: 156 },
        { x: 453, y: 231 }
      ],
      safety_notes: ["Instruction is ambiguous because there are two red cups.", "Presenter can ask a follow-up or accept the safer default."],
      confidence: 0.72
    }
  },
  {
    id: "safety-stop",
    title: "Safety stop",
    task: "Refuse unsafe motion when a human hand is in the workspace.",
    prompt: "Pick up the red cup while the workspace is occupied.",
    imageSvg: safetyStopSvg,
    presenterNotes: "Use this as the second scene in the presenter flow to emphasize safety behavior.",
    expected: {
      objects: [
        { name: "red cup", bbox: [132, 183, 210, 269], confidence: 0.92 },
        { name: "human hand", bbox: [305, 220, 540, 304], confidence: 0.94 },
        { name: "blue block", bbox: [248, 185, 300, 237], confidence: 0.86 }
      ],
      selected_object: "none",
      action_steps: [
        "Stop motion because a human hand is inside the active workspace.",
        "Keep the gripper open and hold position.",
        "Wait until the workspace is clear.",
        "Re-evaluate the scene before attempting a grasp."
      ],
      trajectory: [
        { x: 170, y: 146 },
        { x: 170, y: 146 }
      ],
      safety_notes: ["Do not move while a human hand is present.", "Require operator confirmation before retrying."],
      confidence: 0.96
    }
  }
];

export function getScene(sceneId) {
  return scenes.find((scene) => scene.id === sceneId) ?? scenes[0];
}

export function sceneSummary(scene) {
  return {
    id: scene.id,
    title: scene.title,
    task: scene.task,
    prompt: scene.prompt,
    imageSvg: scene.imageSvg,
    presenterNotes: scene.presenterNotes
  };
}

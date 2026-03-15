// AI use: Used AI to help organize gesture labels and score structure
const gestureMap = {
  "OPEN_PALM": {
    state:        "SOCIAL",
    title:        "SOCIAL NOISE",
    subtitle:     "Non-functional greeting signal detected",
    threatDelta:  4,
    profileDelta: 6
  },
  "FIST": {
    state:        "THREAT",
    title:        "THREAT POSTURE",
    subtitle:     "Defensive escalation pattern confirmed",
    threatDelta:  18,
    profileDelta: 10
  },
  "THUMBS_UP": {
    state:        "EMOTIONAL",
    title:        "CONTAINMENT ERROR",
    subtitle:     "Approval signal misclassified as instability",
    threatDelta:  5,
    profileDelta: 7
  },
  "POINTING": {
    state:        "THREAT",
    title:        "AGGRESSIVE VECTOR",
    subtitle:     "Directed hostility index elevated",
    threatDelta:  14,
    profileDelta: 9
  }
};

const STABLE_FRAMES_NEEDED = 10; 
const COOLDOWN_MS          = 2500; 
const NEUTRAL_DELAY_MS     = 4000; 

// Reference: https://p5js.org/tutorials/speak-with-your-hands/
let capture, handpose, predictions = [];

let modelStatus  = "LOADING";
let cameraStatus = "WAITING";

// Stable gesture detection variables
let stableGesture = null;
let stableCount   = 0;
let lastTriggerTime = 0;
let lastHandTime    = 0;

// Current interface state
let currentState = "NEUTRAL";
let currentTitle = "AWAITING INPUT";
let currentSub   = "No behavioural signature detected";
let rawGesture   = "—";

let profileScore = 0;
let threatLevel  = 0;

// Glitch effect
// AI use: Used AI to help shape glitch trigger logic and surveillance-style presentation
let glitchActive = false;
let glitchTimer  = 0;

// Hand skeleton connections
// Reference: https://p5js.org/tutorials/speak-with-your-hands/
const FINGER_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4], 
  [0,5],[5,6],[6,7],[7,8], 
  [0,9],[9,10],[10,11],[11,12], 
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20]
];

const stateColors = {
  NEUTRAL:   [74,  240, 200],
  THREAT:    [224, 92,  74 ],
  SOCIAL:    [74,  158, 224],
  EMOTIONAL: [212, 164, 74 ]
};

// Initialize canvas and camera
function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);

  capture = createCapture(VIDEO, () => {
    cameraStatus = "READY";
    capture.size(640, 480);
    capture.hide();
    loadHandpose();
  });
}

// Reference: https://p5js.org/tutorials/speak-with-your-hands/
function loadHandpose() {
  handpose = ml5.handpose(capture.elt, { flipHorizontal: true }, () => {
    modelStatus = "READY";
  });
  handpose.on("predict", results => {
    predictions = results;
  });
}


// Detect gesture from landmarks
// reference:https://medium.com/%40andresvillatorres/bringing-gesture-recognition-to-life-with-p5-js-hand-landmarks-and-machine-learning-66f66f91ab72
// ai use: Used AI to help organize the rule structure and thresholds for the four gestures
function detectGesture(hand) {
  const lm = hand.landmarks; 

  // Landmark helpers
  const tipOf   = i => lm[i];
  const mcpOf   = i => lm[i - 3]; 

  // Base reference points
  const wrist   = lm[0];
  const thumbTip = lm[4];
  const thumbMcp = lm[2];

  // Whether four fingers are raised
  const indexUp  = lm[8][1]  < lm[5][1]  - 20;
  const middleUp = lm[12][1] < lm[9][1]  - 20;
  const ringUp   = lm[16][1] < lm[13][1] - 20;
  const pinkyUp  = lm[20][1] < lm[17][1] - 20;

  // Whether thumb is extended
  const thumbDist = dist(thumbTip[0], thumbTip[1], lm[5][0], lm[5][1]);
  const thumbUp   = thumbDist > 60 && thumbTip[1] < lm[2][1]; 

  if (indexUp && middleUp && ringUp && pinkyUp && thumbUp) return "OPEN_PALM";
  if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbUp) return "FIST";
  if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) return "THUMBS_UP";
  if (indexUp && !middleUp && !ringUp && !pinkyUp) return "POINTING";

  return null; 
}

function draw() {
  background(8, 12, 15);

  // Threat level slowly decays
  if (frameCount % 90 === 0 && threatLevel > 0) threatLevel = max(0, threatLevel - 1);

  const now    = millis();
  const col    = stateColors[currentState];
  const glitch = glitchActive && (now - glitchTimer) < 500;
  if (!glitch) glitchActive = false;

  const camW = min(width * 0.52, 620);
  const camH = camW * (3 / 4);
  const camX = (width - camW) / 2;
  const camY = height * 0.14;

  processHands(now);

  drawTopBar(col);
  drawCamera(camX, camY, camW, camH, col, glitch);
  drawSkeleton(camX, camY, camW, camH, col);
  drawLeftPanel(28, camY, camW, col);
  drawDebugPanel(width - 28, camY, col);
  drawClassification(camX, camY + camH, camW, col, glitch);
  drawBottomBar(col);
}

// Process gesture recognition logic
function processHands(now) {
  if (modelStatus !== "READY") return;

  // Reset stable detection when no hand is detected
  if (predictions.length === 0) {
    rawGesture = "NO HAND";
    if ((now - lastHandTime) > NEUTRAL_DELAY_MS && currentState !== "NEUTRAL") {
      setNeutral();
    }
    stableGesture = null;
    stableCount   = 0;
    return;
  }

  lastHandTime = now;
  const hand   = predictions[0];
  const g      = detectGesture(hand);
  rawGesture   = g || "AMBIGUOUS";

  // Only defined gestures continue to stability check
  if (g && g in gestureMap) {
    if (g === stableGesture) {
      stableCount++;
    } else {
      stableGesture = g;
      stableCount   = 1;
    }

    // Trigger after stability and cooldown
    if (stableCount >= STABLE_FRAMES_NEEDED && (now - lastTriggerTime) > COOLDOWN_MS) {
      triggerState(g, now);
    }
  } else {
    stableGesture = null;
    stableCount   = 0;
  }
}

// Update current state
function triggerState(gesture, now) {
  const g       = gestureMap[gesture];
  lastTriggerTime = now;
  stableCount     = 0;
  currentState    = g.state;
  currentTitle    = g.title;
  currentSub      = g.subtitle;
  threatLevel     = min(100, threatLevel + g.threatDelta);
  profileScore    = min(999, profileScore + g.profileDelta);
  glitchActive    = true;
  glitchTimer     = now;
}

// Reset to neutral state
function setNeutral() {
  currentState = "NEUTRAL";
  currentTitle = "AWAITING INPUT";
  currentSub   = "No behavioural signature detected";
}

// Reference: https://p5js.org/tutorials/speak-with-your-hands/
function drawSkeleton(camX, camY, camW, camH, col) {
  if (predictions.length === 0) return;

  const hand = predictions[0];
  const lm   = hand.landmarks;
  const vw   = 640, vh = 480;

  const sx = x => camX + (x / vw) * camW;
  const sy = y => camY + (y / vh) * camH;

  push();
  stroke(col[0], col[1], col[2], 80);
  strokeWeight(1.5);
  noFill();
  for (let [a, b] of FINGER_CONNECTIONS) {
    line(sx(lm[a][0]), sy(lm[a][1]), sx(lm[b][0]), sy(lm[b][1]));
  }
  noStroke();
  for (let i = 0; i < lm.length; i++) {
    fill(col[0], col[1], col[2], i === 0 ? 255 : 180);
    ellipse(sx(lm[i][0]), sy(lm[i][1]), i === 0 ? 8 : 5, i === 0 ? 8 : 5);
  }
  pop();
}

// Draw camera display area
// AI use: Used AI to help organize REC, borders, and glitch offset interface styling
function drawCamera(x, y, w, h, col, glitch) {
  push();
  let ox = glitch ? random(-5, 5) : 0;
  let oy = glitch ? random(-3, 3) : 0;

  noFill();
  stroke(col[0], col[1], col[2], 50);
  strokeWeight(1);
  rect(x - 6 + ox, y - 6 + oy, w + 12, h + 12, 2);
  stroke(col[0], col[1], col[2], 120);
  rect(x - 2 + ox, y - 2 + oy, w + 4, h + 4, 1);

  if (cameraStatus === "READY") {
    push();
    translate(x + w + ox, y + oy);
    scale(-1, 1);
    image(capture, 0, 0, w, h);
    pop();
  } else {
    fill(13, 19, 24); noStroke();
    rect(x, y, w, h);
    fill(col[0], col[1], col[2], 70);
    textSize(11); textAlign(CENTER, CENTER);
    text("CAMERA INITIALIZING...", x + w / 2, y + h / 2);
  }

  noStroke();
  fill(col[0], col[1], col[2]);
  textSize(10); textAlign(LEFT, BOTTOM);
  text("[ LIVE INPUT ]", x, y - 8);
  textAlign(RIGHT, BOTTOM);
  text("REC", x + w - 20, y - 8);
  if ((frameCount % 30) < 15) {
    fill(col[0], col[1], col[2]);
    ellipse(x + w - 10, y - 11, 6, 6);
    fill(col[0], col[1], col[2], 50);
    ellipse(x + w - 10, y - 11, 13, 13);
  }
  pop();
}

function drawLeftPanel(margin, camY, camW, col) {
  push();
  let x      = margin;
  let panelW = (width - camW) / 2 - margin * 2;

  fill(col[0], col[1], col[2], 100);
  textSize(9); textAlign(LEFT, TOP); noStroke();
  text("SYSTEM MODE", x, camY);
  fill(col[0], col[1], col[2]);
  textSize(22); textStyle(BOLD);
  text(currentState, x, camY + 14);
  textStyle(NORMAL);

  fill(col[0], col[1], col[2], 100);
  textSize(9);
  text("PROFILE SCORE", x, camY + 72);
  fill(col[0], col[1], col[2]);
  textSize(18); textStyle(BOLD);
  text(nf(profileScore, 3), x, camY + 86);
  textStyle(NORMAL);

  let by = camY + 148;
  fill(30, 45, 52); noStroke();
  rect(x, by, panelW, 6, 3);
  fill(col[0], col[1], col[2]);
  rect(x, by, panelW * (threatLevel / 100), 6, 3);
  fill(col[0], col[1], col[2], 130);
  textSize(9); textAlign(LEFT, TOP);
  text("THREAT LVL  " + nf(threatLevel, 3) + "%", x, by + 12);

  pop();
}

function drawDebugPanel(rightEdge, camY, col) {
  push();
  let panelW = (width - min(width * 0.52, 620)) / 2 - 28 * 2;
  let x      = rightEdge - panelW;

  fill(13, 19, 24, 210);
  stroke(30, 45, 52); strokeWeight(1);
  rect(x - 12, camY - 8, panelW + 12, 270, 2);

  noStroke();
  fill(col[0], col[1], col[2], 120);
  textSize(9); textAlign(LEFT, TOP);
  text("─ DEBUG ─────────────────", x, camY);

  let ly = camY + 18;

  // Debug row helper
  const row = (label, val, warn) => {
    fill(warn ? 224 : col[0], warn ? 92 : col[1], warn ? 74 : col[2], 110);
    textSize(9);
    text(label, x, ly);
    fill(warn ? 255 : 200, warn ? 120 : 210, warn ? 100 : 220);
    text(String(val), x + 108, ly);
    ly += 16;
  };

  row("MODEL",        modelStatus,  modelStatus === "ERROR");
  row("CAMERA",       cameraStatus, cameraStatus === "WAITING");
  ly += 4;
  row("HANDS",        predictions.length > 0 ? "DETECTED" : "NONE");
  row("RAW GESTURE",  rawGesture,   rawGesture === "AMBIGUOUS");
  row("STABLE",       stableGesture || "—");
  row("FRAMES",       stableCount + " / " + STABLE_FRAMES_NEEDED);
  ly += 4;

  fill(col[0], col[1], col[2], 60);
  textSize(8);
  text("─ GESTURES ──────────────", x, ly); ly += 14;
  const guide = [
    ["open palm",  "SOCIAL"],
    ["fist",       "THREAT"],
    ["thumbs up",  "EMOTIONAL"],
    ["point",      "THREAT"]
  ];
  for (let [g, s] of guide) {
    fill(col[0], col[1], col[2], 70); text(g, x, ly);
    fill(col[0], col[1], col[2], 130); text("→ " + s, x + 70, ly);
    ly += 13;
  }

  pop();
}

function drawClassification(camX, camBottom, camW, col, glitch) {
  push();
  let cx = camX + camW / 2;
  let y  = camBottom + 32;
  let ox = glitch ? random(-4, 4) : 0;

  fill(col[0], col[1], col[2]);
  noStroke();
  textSize(28); textAlign(CENTER, TOP); textStyle(BOLD);
  text(currentTitle, cx + ox, y);
  textStyle(NORMAL);

  fill(col[0], col[1], col[2], 120);
  textSize(11);
  text(currentSub, cx, y + 40);

  stroke(col[0], col[1], col[2], 35); strokeWeight(1);
  line(camX + 40, y + 58, camX + camW - 40, y + 58);
  pop();
}

function drawTopBar(col) {
  push();
  fill(13, 19, 24, 240); noStroke();
  rect(0, 0, width, 38);
  stroke(30, 45, 52); strokeWeight(1);
  line(0, 38, width, 38);
  fill(col[0], col[1], col[2], 170);
  textSize(10); noStroke();
  textAlign(LEFT, CENTER);
  text("SUBJECT CLASSIFICATION SYSTEM  v2.1", 28, 19);
  textAlign(CENTER, CENTER);
  text("STATUS: " + currentState, width / 2, 19);
  textAlign(RIGHT, CENTER);
  let t = floor(millis() / 1000);
  text("SESSION  " + nf(floor(t/3600),2) + ":" + nf(floor((t%3600)/60),2) + ":" + nf(t%60,2), width - 28, 19);
  pop();
}

function drawBottomBar(col) {
  push();
  fill(13, 19, 24, 240); noStroke();
  rect(0, height - 26, width, 26);
  stroke(30, 45, 52); strokeWeight(1);
  line(0, height - 26, width, height - 26);
  fill(col[0], col[1], col[2], 70);
  textSize(9); noStroke();
  textAlign(LEFT, CENTER);
  text("© AUTONOMOUS CLASSIFICATION ENGINE  —  ALL GESTURES LOGGED", 28, height - 13);
  textAlign(RIGHT, CENTER);
  text("PROFILE SCORE: " + nf(profileScore, 3), width - 28, height - 13);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

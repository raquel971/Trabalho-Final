const VIDEO_FILE = 'performance.mp4';
const CROP = { x: 0.18, y: 0.48, w: 0.66, h: 0.42 };
const VOICES = 4;
const SCALE = (0,1,3,6,7);
const BASE = (45, 52, 57, 64);
const CENTS = (0, 6, -7, 9); 
const GW = 16, GH = 12;

let video, sampler;
let started = false;
let tones = (), vibs = (), trems = (), gains = (), voice = ();
let prevLum = null;
let calm = 0;
let motion = 0;
let bands = ();

function setup () {
  createCanvas (windowWidth, windowHeight);
  pixelDensity (1);
  textFont ('monospace');

  sampler = createGraphics (GW,GH);
  sampler.pixelDensity (1);

  video = createVideo (VIDEO_FILE);
  video.eltxmuted = true;
  video.elt.playsInline = true;
  video.elt.loop = true;
  video.hide();

  for (let i = 0; i < VOICES; i++) {
    
    const vib = new p5.Oscillator();
    vib.freq(5);
    vib.amp(15);
    vib.disconnect();
    
    const trem = new p5.Oscillator ();
    trem.freq (4);
    trem.add (1);
    trem.amp (0.5);
    trem.setType ('sine');
    trem.disconnect ();

    const tone = new p5.Oscillator ();
    tone.setType('sine');
    tone.amp(trem);
    tone.freq(midiToFreq(BASE[i]));
    tone.freq(vib);

    const g = new p5.Gain();
    tone.disconnect();
    tone.connect(g);
    g.amp(0);
    g.connect();

    vibs.push (vib);
    trems.push (trem);
    tones.push (tone);
    gains.push (g);
    voice.push({ freq: midiToFreq(BASE[i]), amp: 0 });
    bands.push({ hue: 0, sat: 0, val: 0 });
 }
}

function mousePressed() { start(); }
function touchStarted() { start(); }

function start() {
  if (started) return;
  userStartAudio();
  vibs.forEach((o) => o.start());
  trems.forEach((o) => o.start());
  tones.forEach((o) => o.start());
  video.loop();
  started = true;
}  

function draw () {
  background (14,12,18);

  if (!started) {
    drawIntro();
    return;
  }

  const speed = dist(mouseX, mouseY, pmouseX, pmouseY);
  if (speed < 1.5) calm += (1 - calm) * 0.004;
  else calm += (0 - calm) * 0.12;

  analyseVideo();
  updateSound ();
  drawVideo();
  drawVingette();
  drawHud();

   if (frameCount % 10 === 0) video.elt.playbackRate = lerp(1, 0.5, calm);
}

function analyseVideo() {
  const vw = video.elt.videoWidth, vh = video.elt.videoHeight;
  if (!vw || video.elt.readyState < 2) return;
   sampler.drawingContext.drawImage (video.elt, CROP.x * vw, CROP.y * vh, CROP.w * vw, CROP.h * vh, 0, 0, GW, GH);
   sampler.loadPixels();
  const px = sampler.pixels;
  const lumNow = new Float32Array(GW * GH);
  const bw = GW / VOICES;
  let diffTotal = 0;
  for (let b = 0; b < VOICES; b++) {
    let sx = 0, sy = 0, s = 0, v = 0, n = 0;
    for (let y = 0; y < GH; y++) {
      for (let x = b * bw; x < (b + 1) * bw; x++) {
        const i = (y * GW + x) * 4;
        const hsv = rgbToHsv(px[i], px[i + 1], px[i + 2]);
        sx += Math.cos(hsv[0] * TWO_PI) * hsv[1]; 
        sy += Math.sin(hsv[0] * TWO_PI) * hsv[1];
        s += hsv[1];
        v += hsv[2];
        n++;
        const lum = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
        lumNow[y * GW + x] = lum;
        if (prevLum) diffTotal += Math.abs(lum - prevLum[y * GW + x]);
      }
    }
  const hue = ((Math.atan2(sy, sx) / TWO_PI) + 1) % 1;
    bands[b].hue = hue;
    bands[b].sat = lerp(bands[b].sat, s / n, 0.2);
    bands[b].val = lerp(bands[b].val, v / n, 0.2);
  }
motion = lerp(motion, constrain((diffTotal / (GW * GH)) * 10, 0, 1), 0.1);
  prevLum = lumNow;
}


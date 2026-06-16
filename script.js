document.documentElement.classList.add("js");

let startIridescence = () => {};
let introTriggered = false;
const finishIntro = () => {
  if (introTriggered) return;
  introTriggered = true;

  document.documentElement.classList.add("intro-ready");
  window.setTimeout(() => {
    document.documentElement.classList.remove("intro-running");
    document.documentElement.classList.add("intro-complete");
  }, reducedMotion.matches ? 0 : 3800);
};

const header = document.querySelector(".site-header");
const iridescenceContainer = document.querySelector("#hero-iridescence");
const projectItems = [...document.querySelectorAll(".project-item")];
const dialog = document.querySelector(".project-dialog");
const dialogVideo = document.querySelector("#dialog-video");
const dialogTitle = document.querySelector("#dialog-title");
const dialogCategory = document.querySelector("#dialog-category");
const dialogCount = document.querySelector("#dialog-count");
const dialogRole = document.querySelector("#dialog-role");
const dialogServices = document.querySelector("#dialog-services");
const dialogClose = document.querySelector(".dialog-close");
const videoError = document.querySelector(".video-error");
const heroSection = document.querySelector(".hero");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
const c4dStage = document.querySelector(".c4d-stage");
const c4dIcons = [...document.querySelectorAll(".c4d-icon")];

const initIridescence = () => {
  if (!iridescenceContainer) return;

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance"
  });

  if (!gl) {
    iridescenceContainer.classList.add("is-fallback");
    return;
  }

  const vertexShaderSource = `
    attribute vec2 uv;
    attribute vec2 position;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision highp float;

    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uResolution;
    uniform vec2 uMouse;
    uniform float uAmplitude;
    uniform float uSpeed;
    varying vec2 vUv;

    void main() {
      float mr = min(uResolution.x, uResolution.y);
      vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;
      uv += (uMouse - vec2(0.5)) * uAmplitude;

      float d = -uTime * 0.5 * uSpeed;
      float a = 0.0;
      for (float i = 0.0; i < 8.0; ++i) {
        a += cos(i - d - a * uv.x);
        d += sin(uv.y * i + a);
      }
      d += uTime * 0.5 * uSpeed;
      vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
      col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) {
    iridescenceContainer.classList.add("is-fallback");
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    iridescenceContainer.classList.add("is-fallback");
    return;
  }

  gl.useProgram(program);
  gl.clearColor(1, 1, 1, 1);

  const createAttribute = (name, values) => {
    const location = gl.getAttribLocation(program, name);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  };

  createAttribute("position", [-1, -1, 3, -1, -1, 3]);
  createAttribute("uv", [0, 0, 2, 0, 0, 2]);

  const uniforms = {
    time: gl.getUniformLocation(program, "uTime"),
    color: gl.getUniformLocation(program, "uColor"),
    resolution: gl.getUniformLocation(program, "uResolution"),
    mouse: gl.getUniformLocation(program, "uMouse"),
    amplitude: gl.getUniformLocation(program, "uAmplitude"),
    speed: gl.getUniformLocation(program, "uSpeed")
  };

  const mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  let running = false;
  let animationFrame = 0;
  let startTime = 0;

  gl.uniform3f(uniforms.color, 1, 1, 1);
  gl.uniform1f(uniforms.amplitude, 0.085);
  gl.uniform1f(uniforms.speed, 0.62);

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(iridescenceContainer.clientWidth * ratio));
    const height = Math.max(1, Math.round(iridescenceContainer.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform3f(uniforms.resolution, width, height, width / height);
    }
  };

  const render = (timestamp = 0) => {
    resize();
    mouse.x += (mouse.targetX - mouse.x) * 0.055;
    mouse.y += (mouse.targetY - mouse.y) * 0.055;
    gl.uniform1f(uniforms.time, running ? (timestamp - startTime) * 0.001 : 0);
    gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (running) animationFrame = requestAnimationFrame(render);
  };

  const updateMouse = (event) => {
    const rect = iridescenceContainer.getBoundingClientRect();
    mouse.targetX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    mouse.targetY = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  };

  iridescenceContainer.append(canvas);
  window.addEventListener("resize", resize);
  if (!reducedMotion.matches && heroSection) {
    heroSection.addEventListener("pointermove", updateMouse);
    heroSection.addEventListener("pointerleave", () => {
      mouse.targetX = 0.5;
      mouse.targetY = 0.5;
    });
  }

  render(0);
  startIridescence = () => {
    if (running || reducedMotion.matches) return;
    running = true;
    startTime = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(render);
  };
};

initIridescence();
if (!reducedMotion.matches) startIridescence();

if (c4dStage) {
  const mobileTargets = [
    [18, 20], [12, 39], [14, 61], [20, 81],
    [82, 16], [88, 34], [84, 52], [88, 70], [80, 86]
  ];
  const stackedStarts = [
    [45.8, 48.2, -7], [49.4, 45.9, 3], [43.6, 52.5, -4],
    [54.8, 51.9, 5], [51.6, 47.6, -3], [56.1, 48.7, 6],
    [47.4, 54.8, -5], [45.5, 50.7, 4], [51.3, 50.4, 0]
  ];
  let stageFrame = 0;

  const updateC4dStage = () => {
    stageFrame = 0;
    const rect = c4dStage.getBoundingClientRect();
    const travel = Math.max(1, rect.height - window.innerHeight);
    const rawProgress = Math.min(1, Math.max(0, -rect.top / travel));
    const progress = reducedMotion.matches ? 1 : rawProgress;
    const eased = 1 - Math.pow(1 - progress, 3);
    const compact = window.innerWidth <= 767;

    c4dIcons.forEach((icon, index) => {
      const target = compact
        ? mobileTargets[index]
        : [Number(icon.dataset.x), Number(icon.dataset.y)];
      const [startX, startY, startRotate = 0] = stackedStarts[index] || [50, 50, 0];
      const currentX = startX + (target[0] - startX) * eased;
      const currentY = startY + (target[1] - startY) * eased;
      const currentRotate = startRotate * (1 - eased);
      icon.style.setProperty("--node-left", `${currentX.toFixed(3)}%`);
      icon.style.setProperty("--node-top", `${currentY.toFixed(3)}%`);
      icon.style.setProperty("--icon-rotate", `${currentRotate.toFixed(3)}deg`);
      icon.style.zIndex = String(10 + index);
      icon.style.opacity = "1";
    });

    const copyOpacity = reducedMotion.matches
      ? 1
      : Math.min(1, Math.max(0, (progress - 0.22) / 0.38));
    c4dStage.style.setProperty("--stage-copy-opacity", copyOpacity.toFixed(3));
    c4dStage.style.setProperty("--stage-copy-shift", `${((1 - copyOpacity) * 24).toFixed(2)}px`);
  };

  const requestC4dStageUpdate = () => {
    if (stageFrame) return;
    stageFrame = window.requestAnimationFrame(updateC4dStage);
  };

  window.addEventListener("scroll", requestC4dStageUpdate, { passive: true });
  window.addEventListener("resize", requestC4dStageUpdate);
  updateC4dStage();
}

if (reducedMotion.matches) {
  finishIntro();
} else {
  const beginIntro = () => window.setTimeout(finishIntro, 160);
  if (document.readyState === "complete") {
    beginIntro();
  } else {
    window.addEventListener("load", beginIntro, { once: true });
  }
}

document.querySelector("#current-year").textContent = new Date().getFullYear();

const updateHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 20);
};

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const clampProgress = (value) => Math.min(1, Math.max(0, value));

const updateHeroTransition = () => {
  if (!heroSection) return;

  if (reducedMotion.matches) {
    heroSection.style.setProperty("--hero-exit", "0");
    return;
  }

  const heroHeight = Math.max(heroSection.offsetHeight, window.innerHeight);
  const transitionDistance = Math.max(heroHeight - window.innerHeight * 0.28, 1);
  const heroExit = clampProgress((window.scrollY - window.innerHeight * 0.12) / transitionDistance);

  heroSection.style.setProperty("--hero-exit", heroExit.toFixed(3));
};

let heroTransitionFrame = 0;
const requestHeroTransition = () => {
  if (heroTransitionFrame) return;
  heroTransitionFrame = requestAnimationFrame(() => {
    updateHeroTransition();
    heroTransitionFrame = 0;
  });
};

window.addEventListener("scroll", requestHeroTransition, { passive: true });
window.addEventListener("resize", requestHeroTransition);
updateHeroTransition();

const createProjectMedia = (item, index) => {
  const media = document.createElement("span");
  const cover = document.createElement("img");
  const video = document.createElement("video");
  const label = document.createElement("span");
  const playLabel = document.createElement("span");
  const hoverTitle = document.createElement("span");
  const hoverTitleText = item.querySelector(".project-name").textContent.trim();

  media.className = "project-media";
  media.setAttribute("aria-hidden", "true");

  const coverSource = item.dataset.video
    .replace(/\.[^.]+$/, ".jpg")
    .replace(/_web\.jpg$/i, ".jpg");
  cover.className = "project-cover";
  cover.src = coverSource;
  cover.alt = "";
  cover.loading = index < 3 ? "eager" : "lazy";
  cover.decoding = "async";

  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.tabIndex = -1;
  video.dataset.src = item.dataset.video;

  label.className = "project-media-label";
  label.textContent = String(index + 1).padStart(3, "0");

  playLabel.className = "project-play";
  playLabel.textContent = "PLAY";

  hoverTitle.className = "project-hover-title";
  hoverTitle.setAttribute("aria-hidden", "true");
  Array.from(hoverTitleText).forEach((character, characterIndex) => {
    const characterSpan = document.createElement("span");
    characterSpan.className = "project-hover-character";
    characterSpan.style.setProperty("--character-index", characterIndex);
    if (character === " ") characterSpan.classList.add("is-space");
    characterSpan.textContent = character === " " ? "\u00a0" : character;
    hoverTitle.append(characterSpan);
  });

  video.addEventListener("loadeddata", () => {
    video.classList.add("is-ready");
  }, { once: true });

  media.append(label, cover, video, hoverTitle, playLabel);
  item.prepend(media);
  item.closest("li").style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
};

const loadProjectMedia = (item) => {
  const video = item.querySelector(".project-media video");
  if (!video || video.src) return;
  video.src = video.dataset.src;
  video.load();
};

const playPreview = (item) => {
  projectItems.forEach((project) => project.classList.toggle("is-active", project === item));
  if (!canHover.matches || reducedMotion.matches) return;

  loadProjectMedia(item);
  const video = item.querySelector(".project-media video");
  video.play().catch(() => {});
};

const pausePreview = (item) => {
  const video = item.querySelector(".project-media video");
  if (video) video.pause();
};

const openProject = (item) => {
  const index = projectItems.indexOf(item) + 1;
  projectItems.forEach(pausePreview);
  dialogTitle.textContent = item.dataset.project;
  dialogCategory.textContent = item.dataset.category;
  dialogRole.textContent = item.dataset.role;
  dialogServices.textContent = item.dataset.services;
  dialogCount.textContent = `PROJECT ${String(index).padStart(3, "0")} / ${String(projectItems.length).padStart(3, "0")}`;
  videoError.hidden = true;
  dialogVideo.src = item.dataset.video;
  dialogVideo.load();
  dialog.showModal();
  document.body.classList.add("dialog-open");
  dialogVideo.play().catch(() => {
    dialogVideo.controls = true;
  });
};

const closeProject = () => {
  dialogVideo.pause();
  dialogVideo.removeAttribute("src");
  dialogVideo.load();
  dialog.close();
  document.body.classList.remove("dialog-open");
};

projectItems.forEach((item, index) => {
  createProjectMedia(item, index);
  item.addEventListener("mouseenter", () => playPreview(item));
  item.addEventListener("mouseleave", () => pausePreview(item));
  item.addEventListener("focus", () => playPreview(item));
  item.addEventListener("blur", () => pausePreview(item));
  item.addEventListener("click", () => openProject(item));
});

const projectCards = projectItems.map((item) => item.closest("li"));

if (reducedMotion.matches || !("IntersectionObserver" in window)) {
  projectCards.forEach((card) => card.classList.add("is-revealed"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -5%" });

  projectCards.forEach((card) => {
    revealObserver.observe(card);
  });
}

dialogClose.addEventListener("click", closeProject);

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeProject();
});

dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeProject();
});

dialogVideo.addEventListener("error", () => {
  videoError.hidden = false;
});

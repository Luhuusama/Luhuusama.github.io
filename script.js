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
const dialogEmbed = document.querySelector("#dialog-embed");
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
  let stageFrame = 0;
  let bloomValue = reducedMotion.matches ? 1 : 0;
  let bloomFrom = bloomValue;
  let bloomTo = bloomValue;
  let bloomAnimationStart = performance.now();
  let bloomTarget = bloomValue;
  let copyValue = reducedMotion.matches ? 1 : 0;
  let copyFrom = copyValue;
  let copyTo = copyValue;
  let copyAnimationStart = performance.now();
  let copyTarget = copyValue;
  let copyDelayStart = null;
  let rotationStartTime = null;
  let rotationOffset = 0;
  let lastStageScrollY = window.scrollY;
  const bloomDuration = 4000;
  const copyDelay = 0;
  const copyDuration = 1000;
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
  const easeInOutSine = (value) => -(Math.cos(Math.PI * value) - 1) / 2;
  const clamp01 = (value) => Math.min(1, Math.max(0, value));

  const updateC4dStage = () => {
    stageFrame = 0;
    const now = performance.now();
    const rect = c4dStage.getBoundingClientRect();
    const hasReachedTrigger = rect.top < window.innerHeight * 1.35 && rect.bottom > 0;
    const isStageVisible = rect.bottom > 0 && rect.top < window.innerHeight;
    const isStageNearViewport = rect.bottom > -window.innerHeight * 0.72 && rect.top < window.innerHeight * 1.45;
    const scrollDelta = window.scrollY - lastStageScrollY;
    const isScrollingUp = scrollDelta < -2 && isStageNearViewport;
    let nextBloomTarget = bloomTarget;
    if (reducedMotion.matches) {
      nextBloomTarget = 1;
    } else if (isScrollingUp) {
      nextBloomTarget = 0;
    } else if (hasReachedTrigger) {
      nextBloomTarget = 1;
    } else if (!isStageVisible && rect.top >= window.innerHeight) {
      nextBloomTarget = 0;
    }
    lastStageScrollY = window.scrollY;

    if (!reducedMotion.matches && nextBloomTarget !== bloomTarget) {
      if (rotationStartTime !== null) {
        rotationOffset += (now - rotationStartTime) / 1000 * 2.1;
        rotationStartTime = null;
      }
      bloomFrom = bloomValue;
      bloomTo = nextBloomTarget;
      bloomTarget = nextBloomTarget;
      bloomAnimationStart = now;
      copyDelayStart = null;
    }

    const bloomDistance = Math.abs(bloomTo - bloomFrom);
    const bloomElapsed = now - bloomAnimationStart;
    const bloomRaw = bloomDistance === 0
      ? 1
      : clamp01(bloomElapsed / Math.max(1, bloomDuration * bloomDistance));
    bloomValue = reducedMotion.matches
      ? 1
      : bloomFrom + (bloomTo - bloomFrom) * easeInOutSine(bloomRaw);

    if (!reducedMotion.matches && bloomTarget === 1 && bloomRaw === 1 && rotationStartTime === null) {
      rotationStartTime = now;
    }

    const copyRevealReady = reducedMotion.matches || (bloomTarget === 1 && bloomValue >= 0.5);
    const nextCopyTarget = copyRevealReady ? 1 : 0;
    if (!reducedMotion.matches && nextCopyTarget === 1 && copyDelayStart === null) {
      copyDelayStart = now;
    }
    const delayedCopyTarget = reducedMotion.matches
      ? 1
      : nextCopyTarget === 1 && copyDelayStart !== null && now - copyDelayStart >= copyDelay ? 1 : 0;
    if (!reducedMotion.matches && delayedCopyTarget !== copyTarget) {
      copyFrom = copyValue;
      copyTo = delayedCopyTarget;
      copyTarget = delayedCopyTarget;
      copyAnimationStart = now;
    }
    const copyDistance = Math.abs(copyTo - copyFrom);
    const copyElapsed = now - copyAnimationStart;
    const copyRaw = copyDistance === 0
      ? 1
      : clamp01(copyElapsed / Math.max(1, copyDuration * copyDistance));
    copyValue = reducedMotion.matches
      ? 1
      : copyFrom + (copyTo - copyFrom) * easeInOutSine(copyRaw);

    const enterProgress = bloomValue;
    const compact = window.innerWidth <= 767;
    const orbitRadiusPx = Math.min(window.innerWidth, window.innerHeight) * (compact ? 0.34 : 0.42);
    const slowRotation = reducedMotion.matches
      ? 0
      : rotationOffset + (rotationStartTime === null ? 0 : (now - rotationStartTime) / 1000 * 2.1);
    const unfoldRotation = enterProgress * 18;

    c4dIcons.forEach((icon, index) => {
      const baseAngle = -90 + index * (360 / Math.max(c4dIcons.length, 1));
      const petalDelay = index * 0.018;
      const itemProgress = reducedMotion.matches
        ? 1
        : easeInOutSine(clamp01((enterProgress - petalDelay) / 0.82));
      const radiusProgress = easeInOutSine(itemProgress);
      const spiralTurns = (1 - itemProgress) * (compact ? 230 : 285);
      const currentAngle = baseAngle - spiralTurns + unfoldRotation + slowRotation;
      const angle = currentAngle * Math.PI / 180;
      const currentX = Math.cos(angle) * orbitRadiusPx * radiusProgress;
      const currentY = Math.sin(angle) * orbitRadiusPx * radiusProgress;
      const currentRotate = 0;
      const enterScale = 0.64 + itemProgress * 0.36;
      const currentOpacity = reducedMotion.matches
        ? 1
        : clamp01((enterProgress - 0.25 - petalDelay) / 0.4);
      icon.style.setProperty("--icon-x", `${currentX.toFixed(3)}px`);
      icon.style.setProperty("--icon-y", `${currentY.toFixed(3)}px`);
      icon.style.setProperty("--icon-rotate", `${currentRotate.toFixed(3)}deg`);
      icon.style.setProperty("--icon-scale", enterScale.toFixed(3));
      icon.style.setProperty("--icon-opacity", currentOpacity.toFixed(3));
      icon.style.zIndex = String(10 + index);
    });

    c4dStage.style.setProperty("--stage-copy-opacity", copyValue.toFixed(3));
    c4dStage.style.setProperty("--stage-copy-shift", `${((1 - copyValue) * 24).toFixed(2)}px`);

    const isBloomAnimating = bloomRaw < 1 || copyRaw < 1 || (bloomTarget === 1 && bloomValue >= 0.999);
    const shouldAnimate = isStageNearViewport && isBloomAnimating;
    if (!reducedMotion.matches && shouldAnimate) {
      stageFrame = window.requestAnimationFrame(updateC4dStage);
    }
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

  const coverSource = item.dataset.cover || item.dataset.video
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
  video.dataset.src = getProjectVideoSource(item);

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

const getProjectVideoSource = (item) => {
  const isLocalPreview = window.location.protocol === "file:"
    || window.location.hostname === "localhost"
    || window.location.hostname === "127.0.0.1";

  if (item.dataset.localVideo && isLocalPreview) {
    return item.dataset.localVideo;
  }

  return item.dataset.video;
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

const getBilibiliEmbedUrl = (url) => {
  const match = url.match(/video\/(BV[a-zA-Z0-9]+)/);
  if (!match) return url;
  return `https://player.bilibili.com/player.html?bvid=${match[1]}&autoplay=1&high_quality=1`;
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

  if (item.dataset.externalUrl) {
    dialogVideo.pause();
    dialogVideo.hidden = true;
    dialogVideo.removeAttribute("src");
    dialogVideo.load();
    dialogEmbed.hidden = false;
    dialogEmbed.src = getBilibiliEmbedUrl(item.dataset.externalUrl);
  } else {
    dialogEmbed.hidden = true;
    dialogEmbed.removeAttribute("src");
    dialogVideo.hidden = false;
    dialogVideo.src = getProjectVideoSource(item);
    dialogVideo.load();
  }

  dialog.showModal();
  document.body.classList.add("dialog-open");
  if (!item.dataset.externalUrl) {
    dialogVideo.play().catch(() => {
      dialogVideo.controls = true;
    });
  }
};

const closeProject = () => {
  dialogVideo.pause();
  dialogVideo.removeAttribute("src");
  dialogVideo.load();
  dialogVideo.hidden = false;
  dialogEmbed.removeAttribute("src");
  dialogEmbed.hidden = true;
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

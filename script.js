document.documentElement.classList.add("js");

let introTriggered = false;
const finishIntro = () => {
  if (introTriggered) return;
  introTriggered = true;

  document.documentElement.classList.add("intro-ready");
  if (!reducedMotion.matches) {
    window.setTimeout(() => {
      featuredVideo.muted = true;
      featuredVideo.play().catch(() => {});
    }, 1620);
  }
  window.setTimeout(() => {
    document.documentElement.classList.remove("intro-running");
    document.documentElement.classList.add("intro-complete");
  }, reducedMotion.matches ? 0 : 3100);
};

const header = document.querySelector(".site-header");
const featuredVideo = document.querySelector("#featured-video");
const projectItems = [...document.querySelectorAll(".project-item")];
const dialog = document.querySelector(".project-dialog");
const dialogVideo = document.querySelector("#dialog-video");
const dialogTitle = document.querySelector("#dialog-title");
const dialogCategory = document.querySelector("#dialog-category");
const dialogCount = document.querySelector("#dialog-count");
const dialogClose = document.querySelector(".dialog-close");
const videoError = document.querySelector(".video-error");
const contactSection = document.querySelector(".contact-section");
const heroSection = document.querySelector(".hero");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

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

const mixChannel = (from, to, progress) => Math.round(from + (to - from) * progress);

const updateContactTransition = () => {
  if (!contactSection) return;

  const rect = contactSection.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const transitionStart = viewportHeight * 0.92;
  const transitionEnd = viewportHeight * 0.16;
  const progress = reducedMotion.matches
    ? 1
    : Math.min(1, Math.max(0, (transitionStart - rect.top) / (transitionStart - transitionEnd)));
  const easedProgress = progress * progress * (3 - 2 * progress);
  const textProgressBase = Math.min(1, Math.max(0, (easedProgress - 0.55) / 0.35));
  const textProgress = textProgressBase * textProgressBase * (3 - 2 * textProgressBase);
  const foreground = mixChannel(18, 244, textProgress);
  const muted = mixChannel(88, 174, textProgress);

  contactSection.style.setProperty("--contact-darkness", easedProgress.toFixed(3));
  contactSection.style.setProperty("--contact-fg", `${foreground} ${foreground} ${foreground}`);
  contactSection.style.setProperty("--contact-muted", `${muted} ${muted} ${muted}`);
  contactSection.style.setProperty("--contact-line-alpha", (0.22 + easedProgress * 0.2).toFixed(3));
  contactSection.style.setProperty("--contact-glass-alpha", (easedProgress * 0.16).toFixed(3));
};

let contactFrame = 0;
const requestContactTransition = () => {
  if (contactFrame) return;
  contactFrame = requestAnimationFrame(() => {
    updateContactTransition();
    contactFrame = 0;
  });
};

window.addEventListener("scroll", requestContactTransition, { passive: true });
window.addEventListener("resize", requestContactTransition);
updateContactTransition();

if (reducedMotion.matches) {
  featuredVideo.removeAttribute("autoplay");
  featuredVideo.pause();
} else {
  featuredVideo.muted = true;
  featuredVideo.pause();
}

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

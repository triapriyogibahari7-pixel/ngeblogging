(() => {
  if (window.__ngebloggingCommentsV93) return;
  window.__ngebloggingCommentsV93 = true;

  const RELEASE = "comments-widget-v93-20260728";
  const MOODS = ["😀","😃","😄","😁","😊","😍","🥰","😎","🤩","😂","😅","😉","🤗","🤔","😮","😢","😭","😡"];
  const REACTIONS = ["😀","😍","😂","😮","😢","😡","👍","❤️","🎉"];
  const state = { data: null, root: null, loading: false, error: "", notice: "" };

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {
      credentials: "omit",
      cache: "no-store",
      headers: { accept: "application/json", ...(options.body ? { "content-type": "application/json" } : {}) },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Layanan komentar belum tersedia.");
    return payload;
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    } catch {
      return "";
    }
  }

  function avatar(name) {
    const initials = String(name || "P").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
    return element("span", "ngc-avatar", initials || "P");
  }

  function reactionBar(comment) {
    const bar = element("div", "ngc-reactions");
    for (const emoji of REACTIONS) {
      const count = Number(comment.reactions?.[emoji] || 0);
      const button = element("button", "", `${emoji}${count ? ` ${count}` : ""}`);
      button.type = "button";
      button.title = `Beri reaksi ${emoji}`;
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const result = await request("/api/comments/react", {
            method: "POST",
            body: JSON.stringify({ commentId: comment.id, emoji, path: location.pathname + location.search }),
          });
          comment.reactions = result.reactions || {};
          render();
        } catch (error) {
          state.error = error.message;
          render();
        }
      });
      bar.append(button);
    }
    return bar;
  }

  function commentCard(comment, replies = []) {
    const article = element("article", `ngc-comment${comment.isAdminReply ? " admin" : ""}`);
    const header = element("header");
    header.append(avatar(comment.authorName));
    const identity = element("div");
    const name = comment.authorWebsite ? element("a", "", comment.authorName) : element("b", "", comment.authorName);
    if (comment.authorWebsite) {
      name.href = comment.authorWebsite;
      name.target = "_blank";
      name.rel = "nofollow ugc noopener noreferrer";
    }
    identity.append(name);
    identity.append(element("time", "", formatDate(comment.createdAt)));
    if (comment.isAdminReply) identity.append(element("span", "ngc-team-badge", "Tim situs"));
    header.append(identity);
    if (comment.moodEmoji) header.append(element("span", "ngc-mood", comment.moodEmoji));
    article.append(header);
    article.append(element("p", "ngc-body", comment.body));
    if (state.data?.emojiEnabled) article.append(reactionBar(comment));

    if (replies.length) {
      const replyList = element("div", "ngc-replies");
      replies.forEach((reply) => replyList.append(commentCard(reply, [])));
      article.append(replyList);
    }
    return article;
  }

  function moodPicker(textarea, hiddenMood) {
    const picker = element("div", "ngc-moods");
    picker.append(element("span", "", "Suasana:"));
    MOODS.forEach((emoji) => {
      const button = element("button", "", emoji);
      button.type = "button";
      button.title = `Pilih ${emoji}`;
      button.addEventListener("click", () => {
        hiddenMood.value = emoji;
        picker.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
        textarea.focus();
      });
      picker.append(button);
    });
    return picker;
  }

  function commentForm() {
    const form = element("form", "ngc-form");
    const title = element("div", "ngc-form-title");
    title.append(element("h3", "", "Ikut berdiskusi"));
    title.append(element("p", "", state.data.requireEmail ? "Nama dan email wajib. Email tidak pernah ditampilkan." : "Tulis komentar yang relevan dan saling menghormati."));
    form.append(title);

    const fields = element("div", "ngc-fields");
    const name = element("input");
    name.name = "name";
    name.placeholder = "Nama";
    name.maxLength = 80;
    name.required = true;
    const email = element("input");
    email.name = "email";
    email.type = "email";
    email.placeholder = state.data.requireEmail ? "Email (wajib, privat)" : "Email (opsional, privat)";
    email.maxLength = 254;
    email.required = Boolean(state.data.requireEmail);
    const website = element("input");
    website.name = "website";
    website.type = "url";
    website.placeholder = "Website (opsional)";
    website.maxLength = 300;
    const company = element("input", "ngc-honeypot");
    company.name = "company";
    company.tabIndex = -1;
    company.autocomplete = "off";
    fields.append(name, email, website, company);
    form.append(fields);

    const body = element("textarea");
    body.name = "body";
    body.placeholder = "Tulis komentar…";
    body.maxLength = 4000;
    body.required = true;
    form.append(body);
    const mood = element("input");
    mood.type = "hidden";
    mood.name = "mood";
    form.append(mood);
    if (state.data.emojiEnabled) form.append(moodPicker(body, mood));

    const footer = element("footer");
    const counter = element("small", "", "0 / 4000");
    body.addEventListener("input", () => { counter.textContent = `${body.value.length} / 4000`; });
    const submit = element("button", "", "Kirim komentar");
    submit.type = "submit";
    footer.append(counter, submit);
    form.append(footer);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      submit.textContent = "Mengirim…";
      state.error = "";
      state.notice = "";
      try {
        const result = await request("/api/comments/submit", {
          method: "POST",
          body: JSON.stringify({
            path: location.pathname + location.search,
            name: name.value,
            email: email.value,
            website: website.value,
            body: body.value,
            mood: mood.value,
            company: company.value,
          }),
        });
        state.notice = result.message || "Komentar diterima.";
        form.reset();
        if (result.status === "approved") await load();
        else render();
      } catch (error) {
        state.error = error.message;
        render();
      }
    });
    return form;
  }

  function render() {
    if (!state.root) return;
    state.root.replaceChildren();
    state.root.dataset.commentsRelease = RELEASE;
    const heading = element("header", "ngc-heading");
    const comments = state.data?.comments || [];
    const roots = comments.filter((comment) => !comment.parentId && !comment.isAdminReply);
    heading.append(element("div", "ngc-mark", "💬"));
    const headingText = element("div");
    headingText.append(element("small", "", "DISKUSI"));
    headingText.append(element("h2", "", `${roots.length} komentar`));
    headingText.append(element("p", "", state.data?.content?.title || "Komentar pembaca"));
    heading.append(headingText);
    state.root.append(heading);

    if (state.error) state.root.append(element("div", "ngc-message error", state.error));
    if (state.notice) state.root.append(element("div", "ngc-message success", state.notice));

    const list = element("div", "ngc-list");
    if (!roots.length) list.append(element("div", "ngc-empty", "Belum ada komentar. Jadilah yang pertama membuka diskusi."));
    for (const root of roots) {
      const replies = comments.filter((comment) => comment.parentId === root.id && comment.isAdminReply);
      list.append(commentCard(root, replies));
    }
    state.root.append(list);
    if (state.data?.allowGuests) state.root.append(commentForm());
  }

  function attach() {
    if (state.root?.isConnected) return true;
    const target = document.querySelector("[data-ngeblogging-content], main article, article main, article, main, #root");
    if (!target) return false;
    const root = element("section", "ngc-root");
    root.id = "ngeblogging-comments";
    root.dataset.commentsRelease = RELEASE;
    target.append(root);
    state.root = root;
    return true;
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    try {
      const payload = await request(`/api/comments/public?path=${encodeURIComponent(location.pathname + location.search)}`);
      if (!payload.enabled) return;
      state.data = payload;
      if (attach()) render();
    } catch (error) {
      state.error = error.message;
      if (attach()) render();
    } finally {
      state.loading = false;
    }
  }

  const observer = new MutationObserver(() => {
    if (state.data?.enabled && attach()) render();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true });
  else load();
})();

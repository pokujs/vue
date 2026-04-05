import { defineComponent as r, ref as c, onMounted as i, openBlock as s, createElementBlock as l, createElementVNode as u, toDisplayString as a, inject as m, unref as d, provide as h, renderSlot as f, computed as b, onUnmounted as g } from "vue";
const v = { "aria-label": "urgent-state" }, C = { "aria-label": "deferred-state" }, y = /* @__PURE__ */ r({
  __name: "AsyncPipeline",
  setup(n) {
    const e = c("Loading..."), t = c("idle"), o = c("idle");
    i(async () => {
      await Promise.resolve(), e.value = "Loaded from async setup";
    });
    const p = () => {
      t.value = "urgent-updated", queueMicrotask(() => {
        o.value = "queued-updated";
      });
    };
    return (_, M) => (s(), l("section", null, [
      u("h2", null, a(e.value), 1),
      u("button", {
        type: "button",
        onClick: p
      }, "Run pipeline"),
      u("output", v, a(t.value), 1),
      u("output", C, a(o.value), 1)
    ]));
  }
}), k = /* @__PURE__ */ r({
  __name: "CounterButton",
  props: {
    initialCount: { default: 0 }
  },
  setup(n) {
    const t = c(n.initialCount), o = () => {
      t.value += 1;
    };
    return (p, _) => (s(), l("section", null, [
      u("h1", null, "Count: " + a(t.value), 1),
      u("button", {
        type: "button",
        onClick: o
      }, "Increment")
    ]));
  }
}), x = /* @__PURE__ */ r({
  __name: "GreetingCard",
  props: {
    name: {}
  },
  setup(n) {
    return (e, t) => (s(), l("h3", null, "Hello " + a(n.name), 1));
  }
}), $ = /* @__PURE__ */ r({
  __name: "ThemeLabel",
  setup(n) {
    const e = m(/* @__PURE__ */ Symbol.for("poku.theme"), "light");
    return (t, o) => (s(), l("p", null, "Theme: " + a(d(e)), 1));
  }
}), S = /* @__PURE__ */ r({
  __name: "ThemeWrapper",
  setup(n) {
    return h(/* @__PURE__ */ Symbol.for("poku.theme"), "dark"), (e, t) => f(e.$slots, "default");
  }
}), T = { "aria-label": "toggle-state" }, B = /* @__PURE__ */ r({
  __name: "ToggleHarness",
  setup(n) {
    const e = c(!1), t = b(() => e.value), o = () => {
      e.value = !e.value;
    };
    return (p, _) => (s(), l("div", null, [
      u("output", T, a(t.value ? "enabled" : "disabled"), 1),
      u("button", {
        type: "button",
        onClick: o
      }, "Toggle")
    ]));
  }
}), L = /* @__PURE__ */ r({
  __name: "UnmountWatcher",
  props: {
    onCleanup: { type: Function }
  },
  setup(n) {
    const e = n;
    return g(() => {
      e.onCleanup();
    }), (t, o) => (s(), l("span", null, "Mounted"));
  }
}), q = [
  y,
  k,
  x,
  $,
  S,
  B,
  L
];
export {
  q as fixtures
};

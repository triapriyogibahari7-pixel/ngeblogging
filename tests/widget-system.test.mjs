import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_WIDGETS, createDefaultWidgetState, normalizeWidgetState,
  widgetPreviewMarkup, widgetsMarkup, WIDGET_COUNT,
} from "../src/widget-system.js";

test("Ngeblogging ships exactly 25 distinct built-in widgets", () => {
  assert.equal(WIDGET_COUNT, 25);
  assert.equal(BUILT_IN_WIDGETS.length, 25);
  assert.equal(new Set(BUILT_IN_WIDGETS.map((widget) => widget.id)).size, 25);
  assert.equal(new Set(BUILT_IN_WIDGETS.map((widget) => widget.name)).size, 25);
});

test("every widget has useful metadata and renderable markup", () => {
  for (const widget of BUILT_IN_WIDGETS) {
    assert.ok(widget.category.length > 2);
    assert.ok(widget.description.length > 20);
    const markup = widgetPreviewMarkup(widget.id);
    assert.match(markup, new RegExp(`ng-widget-${widget.id}`));
    assert.ok(markup.length > 60);
  }
});

test("widget state removes duplicates and invalid IDs", () => {
  const state = normalizeWidgetState([
    { id:"search",area:"sidebar",order:4 },
    { id:"missing",area:"footer" },
    { id:"search",area:"footer",order:2 },
    { id:"faq",area:"footer",order:1 },
  ]);
  assert.deepEqual(state.map((item) => item.id), ["faq","search"]);
  assert.equal(state[0].area,"footer");
});

test("widget areas render only enabled widgets assigned to that area", () => {
  const state = createDefaultWidgetState(["search","recent-posts","newsletter"]);
  const sidebar = widgetsMarkup(state,"sidebar");
  const footer = widgetsMarkup(state,"footer");
  assert.match(sidebar,/ng-widget-search/);
  assert.match(sidebar,/ng-widget-recent-posts/);
  assert.doesNotMatch(sidebar,/ng-widget-newsletter/);
  assert.match(footer,/ng-widget-newsletter/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  RELEASE, VIEWPORTS, buildReport, desktopVariant, familyFor, modelViewport,
} from "../scripts/studio-layout-model-v176.mjs";

test("layout model covers every requested viewport plus installed application mode", () => {
  assert.equal(RELEASE, "studio-layout-model-v176-20260731");
  assert.equal(VIEWPORTS.length, 14);
  const report = buildReport();
  assert.equal(report.viewportCount, 15);
  assert.equal(report.status, "passed-model");
  assert.equal(report.proof, "deterministic-layout-model-not-real-browser");
  assert.match(report.warning, /pengujian perangkat\/browser nyata/);
  for (const [width, height] of VIEWPORTS) {
    assert.ok(report.devices.some((device) => device.width === width && device.height === height), `missing ${width}x${height}`);
  }
  assert.ok(report.devices.some((device) => device.family === "application" && device.installed));
});

test("six responsive families and desktop preview variants remain represented", () => {
  const report = buildReport();
  assert.deepEqual(report.responsiveFamilies, ["application","phone","mobile","compact","tablet","desktop"]);
  assert.deepEqual(report.previewModes, ["application","phone","mobile","compact","tablet","laptop","site-desktop","computer"]);
  assert.equal(familyFor(320), "phone");
  assert.equal(familyFor(390), "mobile");
  assert.equal(familyFor(600), "compact");
  assert.equal(familyFor(820), "tablet");
  assert.equal(familyFor(1024), "desktop");
  assert.equal(familyFor(390, true), "application");
  assert.equal(desktopVariant(1024), "laptop");
  assert.equal(desktopVariant(1440), "site-desktop");
  assert.equal(desktopVariant(1920), "computer");
});

test("drawer never shifts mobile content and every Nara size stays inside its viewport", () => {
  for (const [width, height] of VIEWPORTS) {
    const device = modelViewport(width, height);
    assert.equal(device.passed, true, `${device.viewport} failed`);
    assert.equal(device.checks.horizontalOverflowExpected, false);
    assert.equal(device.checks.smallNaraInsideViewport, true);
    assert.equal(device.checks.mediumNaraInsideViewport, true);
    assert.equal(device.checks.fullNaraInsideViewport, true);
    assert.equal(device.nara.small.modal, false);
    assert.equal(device.nara.medium.modal, false);
    assert.equal(device.nara.full.modal, true);
    if (["application","phone","mobile","compact"].includes(device.family)) {
      assert.equal(device.navigation, "overlay-drawer");
      assert.equal(device.contentWidthClosed, width);
      assert.equal(device.contentWidthOpen, width);
      assert.ok(device.drawerWidth <= width - 42);
    }
  }
});

test("tablet uses a compact surface and desktop content expands after sidebar collapse", () => {
  const tablet = modelViewport(820, 1180);
  assert.equal(tablet.navigation, "compact-sidebar");
  assert.ok(tablet.contentWidthOpen > 0);
  const desktop = modelViewport(1366, 768);
  assert.equal(desktop.navigation, "collapsible-sidebar");
  assert.ok(desktop.contentWidthCollapsed > desktop.contentWidthOpen);
  assert.equal(desktop.contentWidthOpen, 1134);
  assert.equal(desktop.contentWidthCollapsed, 1290);
});

/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { Point3d, Range1d, Vector3d } from "@bentley/geometry-core";
import { expect } from "chai";
import { BackgroundMapProps, BackgroundMapSettings, BackgroundMapType, GlobeMode } from "../BackgroundMapSettings";
import { ColorByName } from "../ColorByName";
import { ColorDef } from "../ColorDef";
import { DisplayStyle3dSettings, DisplayStyle3dSettingsProps, DisplayStyleOverridesOptions, MonochromeMode } from "../DisplayStyleSettings";
import { MapLayerProps, MapLayerSettings, MapSubLayerProps, MapSubLayerSettings } from "../imodeljs-common";
import { LightSettings, LightSettingsProps } from "../LightSettings";
import { LinePixels } from "../LinePixels";
import { PlanProjectionSettings, PlanProjectionSettingsProps } from "../PlanProjectionSettings";
import { RgbColor } from "../RgbColor";
import { SolarShadowSettings, SolarShadowSettingsProps } from "../SolarShadows";
import { SpatialClassificationProps } from "../SpatialClassificationProps";
import { TerrainHeightOriginMode } from "../TerrainSettings";
import { ThematicDisplay, ThematicDisplayMode, ThematicDisplayProps, ThematicDisplaySensorSettings, ThematicGradientColorScheme, ThematicGradientMode } from "../ThematicDisplay";
import { RenderMode, ViewFlags } from "../ViewFlags";

describe("PlanProjectionSettings", () => {
  it("round-trips through JSON", () => {
    const roundTrip = (input: PlanProjectionSettingsProps | undefined, expected: PlanProjectionSettingsProps | undefined | "input") => {
      const settings = PlanProjectionSettings.fromJSON(input);
      if (undefined === settings) {
        expect(expected).to.be.undefined;
        return;
      }

      if ("input" === expected)
        expected = input;

      expect(expected).not.to.be.undefined;
      const output = settings.toJSON();
      expect(output.elevation).to.equal(expected!.elevation);
      expect(output.transparency).to.equal(expected!.transparency);
      expect(output.overlay).to.equal(expected!.overlay);
      expect(output.enforceDisplayPriority).to.equal(expected!.enforceDisplayPriority);
    };

    roundTrip(undefined, undefined);
    roundTrip({}, undefined);

    roundTrip({ overlay: true }, "input");
    roundTrip({ overlay: false }, {});
    roundTrip({ enforceDisplayPriority: true }, "input");
    roundTrip({ enforceDisplayPriority: false }, {});
    roundTrip({ overlay: false, enforceDisplayPriority: true }, { enforceDisplayPriority: true });
    roundTrip({ overlay: true, enforceDisplayPriority: false }, { overlay: true });

    roundTrip({ transparency: 0.5 }, "input");
    roundTrip({ transparency: 1.0 }, "input");
    roundTrip({ transparency: 0.0 }, "input");
    roundTrip({ transparency: 1.1 }, { transparency: 1.0 });
    roundTrip({ transparency: -0.1 }, { transparency: 0.0 });

    roundTrip({ elevation: 123.5 }, "input");
  });

  it("clones", () => {
    const clone = (input: PlanProjectionSettingsProps, changed: PlanProjectionSettingsProps | undefined, expected: PlanProjectionSettingsProps) => {
      const settings = new PlanProjectionSettings(input);
      const output = settings.clone(changed);
      expect(output.elevation).to.equal(expected.elevation);
      expect(output.transparency).to.equal(expected.transparency);
      expect(output.overlay).to.equal(expected.overlay);
      expect(output.enforceDisplayPriority).to.equal(expected.enforceDisplayPriority);
    };

    clone({}, undefined, { overlay: false, enforceDisplayPriority: false });
    clone({ overlay: true }, undefined, { overlay: true, enforceDisplayPriority: false });
    clone({ overlay: false }, undefined, { overlay: false, enforceDisplayPriority: false });
    clone({}, { overlay: true }, { overlay: true, enforceDisplayPriority: false });
    clone({ overlay: true }, { overlay: false }, { overlay: false, enforceDisplayPriority: false });

    clone({ transparency: 0.5 }, { transparency: 0.75 }, { transparency: 0.75, overlay: false, enforceDisplayPriority: false });
    clone({ transparency: 0.5 }, { transparency: 1.25 }, { transparency: 1.0, overlay: false, enforceDisplayPriority: false });

    clone({}, { elevation: 1, transparency: 0.2 }, { elevation: 1, transparency: 0.2, overlay: false, enforceDisplayPriority: false });
    clone({ elevation: 1, transparency: 0.2 }, {}, { elevation: 1, transparency: 0.2, overlay: false, enforceDisplayPriority: false });
    clone({ elevation: 1, overlay: true }, { transparency: 0.2 }, { elevation: 1, transparency: 0.2, overlay: true, enforceDisplayPriority: false });
    clone({ elevation: 1 }, { elevation: -1, transparency: 0.75 }, { elevation: -1, transparency: 0.75, overlay: false, enforceDisplayPriority: false });

    clone({}, undefined, { enforceDisplayPriority: false, overlay: false });
    clone({ enforceDisplayPriority: true }, undefined, { enforceDisplayPriority: true, overlay: false });
    clone({ enforceDisplayPriority: false }, undefined, { enforceDisplayPriority: false, overlay: false });
    clone({}, { enforceDisplayPriority: true }, { enforceDisplayPriority: true, overlay: false });
    clone({ enforceDisplayPriority: true }, { enforceDisplayPriority: false }, { enforceDisplayPriority: false, overlay: false });
  });
});

describe("DisplayStyleSettings", () => {
  interface SettingsMap { [modelId: string]: PlanProjectionSettingsProps; }

  it("round-trips plan projection settings", () => {
    const roundTrip = (planProjections: SettingsMap | undefined) => {
      const settings = new DisplayStyle3dSettings({ styles: { planProjections } });
      const json = settings.toJSON();
      expect(JSON.stringify(json.planProjections)).to.equal(JSON.stringify(planProjections));
    };

    roundTrip(undefined);
    roundTrip({});
    roundTrip({ "not an id": { transparency: 0.5 } });
    roundTrip({ "0x1": { overlay: true } });
    roundTrip({ "0x1": { overlay: false } });
    roundTrip({ "0x1": { enforceDisplayPriority: true } });
    roundTrip({ "0x1": { enforceDisplayPriority: false } });
    roundTrip({ "0x1": { transparency: 0.5 }, "0x2": { elevation: -5 } });
  });

  it("sets and round-trips plan projection settings", () => {
    const roundTrip = (planProjections: SettingsMap | undefined, expected: SettingsMap | undefined | "input") => {
      if ("input" === expected)
        expected = planProjections;

      const input = new DisplayStyle3dSettings({});
      if (undefined !== planProjections)
        for (const modelId of Object.keys(planProjections))
          input.setPlanProjectionSettings(modelId, PlanProjectionSettings.fromJSON(planProjections[modelId]));

      const output = new DisplayStyle3dSettings({ styles: input.toJSON() });
      const json = output.toJSON();
      expect(JSON.stringify(json.planProjections)).to.equal(JSON.stringify(expected));
    };

    roundTrip(undefined, undefined);
    roundTrip({}, undefined);
    roundTrip({ "not an id": { transparency: 0.5 } }, {});
    roundTrip({ "0x1": { overlay: true } }, "input");
    roundTrip({ "0x1": { overlay: false } }, {});
    roundTrip({ "0x1": { enforceDisplayPriority: true } }, "input");
    roundTrip({ "0x1": { enforceDisplayPriority: false } }, {});
    roundTrip({ "0x1": { transparency: 0.5 }, "0x2": { elevation: -5 } }, "input");
  });

  it("deletes plan projection settings", () => {
    const settings = new DisplayStyle3dSettings({});
    expect(settings.planProjectionSettings).to.be.undefined;

    const countSettings = () => {
      let count = 0;
      const iter = settings.planProjectionSettings;
      if (undefined !== iter)
        for (const _entry of iter)
          ++count;

      return count;
    };

    const makeSettings = (props: PlanProjectionSettingsProps) => new PlanProjectionSettings(props);

    settings.setPlanProjectionSettings("0x1", makeSettings({ elevation: 1 }));
    expect(settings.planProjectionSettings).not.to.be.undefined;
    expect(countSettings()).to.equal(1);
    expect(settings.getPlanProjectionSettings("0x1")!.elevation).to.equal(1);

    settings.setPlanProjectionSettings("0x2", makeSettings({ elevation: 2 }));
    expect(countSettings()).to.equal(2);
    expect(settings.getPlanProjectionSettings("0x2")!.elevation).to.equal(2);

    settings.setPlanProjectionSettings("0x2", makeSettings({ transparency: 0.2 }));
    expect(countSettings()).to.equal(2);
    expect(settings.getPlanProjectionSettings("0x2")!.transparency).to.equal(0.2);
    expect(settings.getPlanProjectionSettings("0x2")!.elevation).to.be.undefined;

    settings.setPlanProjectionSettings("0x3", undefined);
    expect(countSettings()).to.equal(2);

    settings.setPlanProjectionSettings("0x1", undefined);
    expect(countSettings()).to.equal(1);
    expect(settings.getPlanProjectionSettings("0x1")).to.be.undefined;

    settings.setPlanProjectionSettings("0x2", undefined);
    expect(countSettings()).to.equal(0);
    expect(settings.planProjectionSettings).to.be.undefined;
  });
});

const testMapSubLayer0 = { name: "TestName", title: "TestTitle", visible: true };
const testMapSubLayer1 = { name: "TestName", title: "TestTitle", visible: true, id: 0, parent: -1, children: [1, 2, 3] };
describe("MapSubLayerSettings", () => {
  const expectMatch = (output: MapSubLayerProps, expected: MapSubLayerProps) => {
    expect(output.id).to.equal(expected.id);
    expect(output.name).to.equal(expected.name);
    expect(output.title).to.equal(expected.title);
    expect(output.parent).to.equal(expected.parent);
    expect(output.visible).to.equal(expected.visible);

    if (expected.children) {
      expect(output.children).not.to.be.undefined;
      expect(expected.children.length).to.equal(output.children!.length);
      for (let i = 0; i < expected.children!.length; i++)
        expect(expected.children[i]).to.equal(output.children![i]);
    }

  };
  it("round-trips through JSON", () => {

    const roundTrip = (input: MapSubLayerProps | undefined, expected: MapSubLayerProps | "input") => {
      if (!input)
        input = {};

      if ("input" === expected)
        expected = JSON.parse(JSON.stringify(input)) as MapSubLayerProps;
      const settings = MapSubLayerSettings.fromJSON(input)!;
      expect(settings).not.to.be.undefined;
      const output = settings.toJSON();
      expectMatch(output, expected);
    };
    roundTrip(testMapSubLayer0, "input");
    roundTrip(testMapSubLayer1, "input");
  });
  it("clones", () => {
    const clone = (input: MapSubLayerProps, changed: MapSubLayerProps, expected: MapSubLayerProps) => {
      const settings = MapSubLayerSettings.fromJSON(input);
      const output = settings!.clone(changed);
      expectMatch(output.toJSON(), expected);
    };

    // Turn off visibility
    clone(testMapSubLayer0, { visible: false }, { name: "TestName", title: "TestTitle", visible: false });
    clone(testMapSubLayer1, { visible: false }, { name: "TestName", title: "TestTitle", visible: false, id: 0, parent: -1, children: [1, 2, 3] });
  });
});
const testMapLayer0 = { name: "TestName", url: "www.bentley.com", formatId: "WMS" };
const testMapLayer1 = { name: "TestName", url: "www.bentley.com", formatId: "WMTS", transparency: .5, transparentBackground: false };
const testMapLayer2 = { name: "TestName", url: "www.bentley.com", formatId: "WMS", subLayers: [testMapSubLayer0, testMapSubLayer1] };
const testMapLayer3 = { name: "TestName", url: "www.bentley.com", formatId: "WMS", userName: "TestUser", password: "TestPassword", subLayers: [testMapSubLayer0, testMapSubLayer1] };
const testMapLayer4 = { name: "TestName", url: "www.bentley.com", formatId: "WMS", userName: "TestUser", password: "TestPassword", subLayers: [testMapSubLayer0, testMapSubLayer1], isBase: true };
const legacyMapLayer = MapLayerSettings.fromMapSettings(BackgroundMapSettings.fromJSON({ providerName: "BingProvider", providerData: { mapType: BackgroundMapType.Hybrid } }));

describe("MapLayerSettings", () => {
  const expectMatches = (output: MapLayerProps, expected: MapLayerProps) => {
    expect(output.name).to.equal(expected.name);
    expect(output.visible).to.equal(expected.visible);
    expect(output.url).to.equal(expected.url);
    expect(output.transparency).to.equal(expected.transparency);
    expect(output.transparentBackground).to.equal(expected.transparentBackground);
    expect(output.isBase).to.equal(expected.isBase);
    expect(output.userName).to.equal(expected.userName);
    expect(output.password).to.equal(expected.password);

    if (expected.subLayers) {
      expect(output.subLayers).not.to.be.undefined;
      expect(expected.subLayers.length).to.equal(output.subLayers!.length);
      for (let i = 0; i < expected.subLayers.length; i++)
        expect(JSON.stringify(expected.subLayers[i])).to.equal(JSON.stringify(output.subLayers![i]));
    }
  };
  it("round-trips through JSON", () => {
    const roundTrip = (input: MapLayerProps | undefined, expected: MapLayerProps | "input") => {
      if (!input)
        input = {};

      if ("input" === expected)
        expected = JSON.parse(JSON.stringify(input)) as MapLayerProps;

      const settings = MapLayerSettings.fromJSON(input)!;
      expect(settings).not.to.be.undefined;
      const output = settings.toJSON();
      expectMatches(output, expected);
    };
    roundTrip(testMapLayer0, "input");
    roundTrip(testMapLayer1, "input");
    roundTrip(testMapLayer2, "input");
    roundTrip(testMapLayer3, "input");
    roundTrip(testMapLayer4, "input");
    roundTrip(legacyMapLayer, "input");
  });

  it("clones", () => {
    const clone = (input: MapLayerProps, changed: MapLayerProps, expected: MapLayerProps) => {
      const settings = MapLayerSettings.fromJSON(input);
      const output = settings!.clone(changed);
      expectMatches(output.toJSON(), expected);
    };

    // Turn off visibility
    clone(testMapLayer0, { visible: false }, { name: "TestName", url: "www.bentley.com", formatId: "WMS", visible: undefined });
    clone(testMapLayer3, { visible: false }, { name: "TestName", url: "www.bentley.com", formatId: "WMS", userName: "TestUser", password: "TestPassword", subLayers: [testMapSubLayer0, testMapSubLayer1], visible: undefined });

    // Set transparency
    clone(testMapLayer0, { transparency: .5 }, { name: "TestName", url: "www.bentley.com", formatId: "WMS", transparency: .5 });
    clone(testMapLayer3, { transparency: .5 }, { name: "TestName", url: "www.bentley.com", formatId: "WMS", userName: "TestUser", password: "TestPassword", subLayers: [testMapSubLayer0, testMapSubLayer1], transparency: .5 });
  });
});

describe("BackgroundMapSettings", () => {
  it("round-trips through JSON", () => {
    const roundTrip = (input: BackgroundMapProps | undefined, expected: BackgroundMapProps | "input") => {
      if (!input)
        input = {};

      if ("input" === expected)
        expected = JSON.parse(JSON.stringify(input)) as BackgroundMapProps;

      const settings = BackgroundMapSettings.fromJSON(input);
      const output = settings.toJSON();

      expect(output.groundBias).to.equal(expected.groundBias);
      expect(output.providerName).to.equal(expected.providerName);
      expect(output.providerData?.mapType).to.equal(expected.providerData?.mapType);
      expect(output.transparency).to.equal(expected.transparency);
      expect(output.useDepthBuffer).to.equal(expected.useDepthBuffer);
      expect(output.applyTerrain).to.equal(expected.applyTerrain);
      expect(output.globeMode).to.equal(expected.globeMode);

      // We used to omit the terrain settings entirely if they matched the defaults. Now we always include them.
      const outTerrain = output.terrainSettings;
      expect(outTerrain).not.to.be.undefined;
      const expTerrain = expected.terrainSettings ?? {};

      if (outTerrain) {
        if (undefined === expTerrain.heightOriginMode) {
          // We used to omit the height origin mode if it matched the default. Then we changed the default, and stopped omitting it.
          expTerrain.heightOriginMode = TerrainHeightOriginMode.Geodetic;
        }

        expect(outTerrain.providerName).to.equal(expTerrain.providerName);
        expect(outTerrain.exaggeration).to.equal(expTerrain.exaggeration);
        expect(outTerrain.applyLighting).to.equal(expTerrain.applyLighting);
        expect(outTerrain.heightOrigin).to.equal(expTerrain.heightOrigin);
        expect(outTerrain.heightOriginMode).to.equal(expTerrain.heightOriginMode);
        expect(outTerrain.nonLocatable).to.equal(expTerrain.nonLocatable);
      }

      expect(settings.equalsJSON(expected)).to.be.true;

      const expectedSettings = BackgroundMapSettings.fromJSON(expected);
      expect(settings.equals(expectedSettings)).to.be.true;
    };

    roundTrip(undefined, {});
    roundTrip({}, "input");

    roundTrip({ groundBias: 123 }, "input");

    roundTrip({ providerName: "BingProvider" }, {});
    roundTrip({ providerName: "MapBoxProvider" }, "input");
    roundTrip({ providerName: "UnknownProvider" }, {});

    roundTrip({ providerData: { mapType: BackgroundMapType.Hybrid } }, {});
    roundTrip({ providerData: { mapType: BackgroundMapType.Street } }, "input");
    roundTrip({ providerData: { mapType: BackgroundMapType.Aerial } }, "input");
    roundTrip({ providerData: { mapType: -123 } }, {});

    roundTrip({ transparency: false }, {});
    roundTrip({ transparency: 0 }, "input");
    roundTrip({ transparency: 1 }, "input");
    roundTrip({ transparency: 1.1 }, { transparency: 1 });
    roundTrip({ transparency: -0.1 }, { transparency: 0 });

    roundTrip({ useDepthBuffer: false }, {});
    roundTrip({ useDepthBuffer: true }, "input");

    roundTrip({ applyTerrain: false }, {});
    roundTrip({ applyTerrain: true }, "input");

    roundTrip({ globeMode: GlobeMode.Ellipsoid }, {});
    roundTrip({ globeMode: GlobeMode.Plane }, "input");
    roundTrip({ globeMode: 42 }, {});

    roundTrip({ terrainSettings: { providerName: "CesiumWorldTerrain" } }, {});
    roundTrip({ terrainSettings: { providerName: "UnknownProvider" } }, {});

    roundTrip({ terrainSettings: { exaggeration: 1 } }, {});
    roundTrip({ terrainSettings: { exaggeration: 99 } }, "input");
    roundTrip({ terrainSettings: { exaggeration: 101 } }, { terrainSettings: { exaggeration: 100 } });
    roundTrip({ terrainSettings: { exaggeration: 0.05 } }, { terrainSettings: { exaggeration: 0.1 } });
    roundTrip({ terrainSettings: { exaggeration: 0.15 } }, "input");

    roundTrip({ terrainSettings: { applyLighting: false } }, {});
    roundTrip({ terrainSettings: { applyLighting: true } }, "input");

    roundTrip({ terrainSettings: { heightOrigin: 0 } }, {});
    roundTrip({ terrainSettings: { heightOrigin: 42 } }, "input");

    roundTrip({ terrainSettings: { heightOriginMode: TerrainHeightOriginMode.Ground } }, "input");
    roundTrip({ terrainSettings: { heightOriginMode: TerrainHeightOriginMode.Geodetic } }, "input");
    roundTrip({ terrainSettings: { heightOriginMode: TerrainHeightOriginMode.Geoid } }, "input");
    roundTrip({ terrainSettings: { heightOriginMode: -99 } }, {});

    roundTrip({ terrainSettings: { nonLocatable: false } }, {});
    roundTrip({ terrainSettings: { nonLocatable: true } }, "input");

    roundTrip({
      providerName: "BingProvider",
      providerData: { mapType: BackgroundMapType.Hybrid },
      transparency: false,
      useDepthBuffer: false,
      applyTerrain: false,
      globeMode: GlobeMode.Ellipsoid,
      terrainSettings: {
        providerName: "CesiumWorldTerrain",
        applyLighting: false,
        exaggeration: 1,
        heightOrigin: 0,
        heightOriginMode: TerrainHeightOriginMode.Geodetic,
        nonLocatable: false,
      },
    }, {});
  });
});

describe("SolarShadowSettings", () => {
  it("round-trips through JSON", () => {
    const roundTrip = (input: SolarShadowSettingsProps | undefined, expected: SolarShadowSettingsProps | "input" | undefined) => {
      if ("input" === expected)
        expected = input;

      const settings = SolarShadowSettings.fromJSON(input);
      const output = settings.toJSON();

      expect(output === undefined).to.equal(expected === undefined);
      if (output && expected) {
        expect(output.color).to.equal(expected.color);
        expect(output.bias).to.equal(expected.bias);
      }

      const expectedSettings = SolarShadowSettings.fromJSON(expected);
      expect(settings.equals(expectedSettings)).to.be.true;
    };

    roundTrip(undefined, undefined);
    roundTrip({}, undefined);
    roundTrip(SolarShadowSettings.defaults.toJSON(), undefined);

    roundTrip({ color: ColorByName.grey }, undefined);

    roundTrip({ color: ColorByName.red }, "input");
    roundTrip({ color: ColorByName.black }, "input");
    roundTrip({ color: undefined }, undefined);

    roundTrip({ bias: 0 }, "input");
    roundTrip({ bias: 0.001 }, undefined);
    roundTrip({ bias: 1234.5 }, "input");
    roundTrip({ bias: undefined }, undefined);

    roundTrip({ color: ColorByName.grey, bias: 0.001 }, undefined);
    roundTrip({ color: ColorByName.bisque, bias: 42 }, "input");
  });
});

describe("LightSettings", () => {
  it("round-trips through JSON", () => {
    const roundTrip = (input: LightSettingsProps | undefined, expected: LightSettingsProps | "input" | undefined) => {
      const settings = LightSettings.fromJSON(input);

      if ("input" === expected) {
        expected = input;
      } else {
        const expectedSettings = LightSettings.fromJSON(expected);
        expect(settings.equals(expectedSettings)).to.be.true;
      }

      const output = settings.toJSON();
      expect(output).to.deep.equal(expected);
    };

    roundTrip(undefined, undefined);
    roundTrip({}, undefined);

    roundTrip({ numCels: 0 }, undefined);
    roundTrip({ numCels: 1 }, "input");

    roundTrip({ specularIntensity: 1 }, undefined);
    roundTrip({ specularIntensity: 0.5 }, "input");
    roundTrip({ specularIntensity: 5.1 }, { specularIntensity: 5.0 });
    roundTrip({ specularIntensity: -0.1 }, { specularIntensity: 0.0 });

    roundTrip({ portrait: { intensity: 0.3 } }, undefined);
    roundTrip({ portrait: { intensity: 2.0 } }, "input");
    roundTrip({ portrait: { intensity: 5.1 } }, { portrait: { intensity: 5.0 } });
    roundTrip({ portrait: { intensity: -0.1 } }, { portrait: { intensity: 0.0 } });

    roundTrip({ solar: { direction: Vector3d.create(0.272166, 0.680414, 0.680414).toJSON(), intensity: 1, alwaysEnabled: false } }, undefined);
    roundTrip({ solar: { direction: Vector3d.create(-1, -1, -1).toJSON() } }, "input");
    roundTrip({ solar: { intensity: 4.9 } }, "input");
    roundTrip({ solar: { intensity: 5.1 } }, { solar: { intensity: 5.0 } });
    roundTrip({ solar: { intensity: -0.1 } }, { solar: { intensity: 0.0 } });
    roundTrip({ solar: { alwaysEnabled: true } }, "input");

    roundTrip({ ambient: { color: new RgbColor(0, 0, 0).toJSON(), intensity: 0.2 } }, undefined);
    roundTrip({ ambient: { color: new RgbColor(1, 127, 255).toJSON() } }, "input");
    roundTrip({ ambient: { intensity: 0.1 } }, "input");
    roundTrip({ ambient: { intensity: -0.1 } }, { ambient: { intensity: 0.0 } });
    roundTrip({ ambient: { intensity: 5.1 } }, { ambient: { intensity: 5.0 } });

    roundTrip({ hemisphere: { lowerColor: new RgbColor(120, 143, 125).toJSON(), upperColor: new RgbColor(143, 205, 255), intensity: 0 } }, undefined);
    roundTrip({ hemisphere: { lowerColor: new RgbColor(0, 1, 2).toJSON() } }, "input");
    roundTrip({ hemisphere: { upperColor: new RgbColor(254, 254, 255).toJSON() } }, "input");
    roundTrip({ hemisphere: { intensity: 2.5 } }, "input");
    roundTrip({ hemisphere: { intensity: -0.1 } }, undefined);
    roundTrip({ hemisphere: { intensity: 5.1 } }, { hemisphere: { intensity: 5.0 } });
  });

  it("should preserve sun direction", () => {
    const sunDir = Vector3d.create(0, 0.5, 1.0);
    const props = {
      styles: {
        sceneLights: { sunDir: sunDir.toJSON() },
      },
    };

    const style = new DisplayStyle3dSettings(props);
    expect(style.lights.solar.direction.isAlmostEqual(sunDir)).to.be.true;
  });
});

describe("ThematicDisplay", () => {
  it("Ensures ThematicDisplay derives values properly from JSON, including handling defaults and incorrect values", () => {
    function verifyDefaults(thematicDisplay: ThematicDisplay) {
      expect(thematicDisplay.axis).to.deep.equal(Vector3d.fromJSON({ x: 0.0, y: 0.0, z: 0.0 }));
      expect(thematicDisplay.displayMode).to.equal(ThematicDisplayMode.Height);
      expect(thematicDisplay.gradientSettings.mode).to.equal(ThematicGradientMode.Smooth);
      expect(thematicDisplay.gradientSettings.stepCount).to.equal(10);
      expect(thematicDisplay.gradientSettings.colorScheme).to.equal(ThematicGradientColorScheme.BlueRed);
      expect(thematicDisplay.gradientSettings.marginColor.colors.r).to.equal(0);
      expect(thematicDisplay.gradientSettings.marginColor.colors.g).to.equal(0);
      expect(thematicDisplay.gradientSettings.marginColor.colors.b).to.equal(0);
      expect(thematicDisplay.gradientSettings.marginColor.colors.t).to.equal(0);
      expect(thematicDisplay.gradientSettings.customKeys.length).to.equal(0);
      expect(thematicDisplay.range).to.deep.equal(Range1d.createNull());
      expect(thematicDisplay.sensorSettings).to.deep.equal(ThematicDisplaySensorSettings.fromJSON());
      expect(thematicDisplay.sensorSettings.sensors).to.deep.equal([]);
      expect(thematicDisplay.sensorSettings.distanceCutoff).to.equal(0);
    }

    // check if the creation and back-and-forth via JSON works
    function verifyBackAndForth(a: ThematicDisplay) {
      const aCopy = ThematicDisplay.fromJSON(a.toJSON());
      expect(aCopy.equals(a)).to.be.true;
    }

    // create default ThematicDisplay object and verify the default values are correct
    const defaultThematicDisplay = ThematicDisplay.fromJSON();
    verifyDefaults(defaultThematicDisplay);

    // check if the creation and back-and-forth via JSON works using the default object
    verifyBackAndForth(defaultThematicDisplay);

    // check if setting bad values for displayMode, gradient mode, and gradient color scheme yields expected defaults
    let badThematicProps: ThematicDisplayProps = {
      displayMode: 99999,
      gradientSettings: {
        mode: 99999,
        colorScheme: 99999,
      },
    };
    let td = ThematicDisplay.fromJSON(badThematicProps);
    expect(td.equals(defaultThematicDisplay)).to.be.true;
    verifyBackAndForth(td);

    // verify that sensor settings propagate properly through JSON to the object
    const sensorSettingsProps = {
      sensors: [
        { position: [1.0, 2.0, 3.0], value: 0.25 },
        { position: [4.0, 5.0, 6.0], value: 0.5 },
        { position: [7.0, 8.0, 9.0], value: 0.75 },
        { position: [10.0, 11.0, 12.0], value: -1.0 },
        { position: [13.0, 14.0, 15.0], value: 2.0 },
      ],
      distanceCutoff: 5.0,
    };
    td = ThematicDisplay.fromJSON({ sensorSettings: sensorSettingsProps });
    expect(td.sensorSettings.sensors!.length).to.equal(5);
    expect(td.sensorSettings.sensors![0].position).to.deep.equal(Point3d.fromJSON(sensorSettingsProps.sensors[0].position));
    expect(td.sensorSettings.sensors![0].value).to.equal(sensorSettingsProps.sensors[0].value);
    expect(td.sensorSettings.sensors![1].position).to.deep.equal(Point3d.fromJSON(sensorSettingsProps.sensors[1].position));
    expect(td.sensorSettings.sensors![1].value).to.equal(sensorSettingsProps.sensors[1].value);
    expect(td.sensorSettings.sensors![2].position).to.deep.equal(Point3d.fromJSON(sensorSettingsProps.sensors[2].position));
    expect(td.sensorSettings.sensors![2].value).to.equal(sensorSettingsProps.sensors[2].value);
    expect(td.sensorSettings.sensors![3].position).to.deep.equal(Point3d.fromJSON(sensorSettingsProps.sensors[3].position));
    expect(td.sensorSettings.sensors![3].value).to.equal(0); // verify that the 'bad' value of -1 gets clamped to 0
    expect(td.sensorSettings.sensors![4].position).to.deep.equal(Point3d.fromJSON(sensorSettingsProps.sensors[4].position));
    expect(td.sensorSettings.sensors![4].value).to.equal(1); // verify that the 'bad' value of 2 gets clamped to 1
    expect(td.sensorSettings.distanceCutoff).to.equal(sensorSettingsProps.distanceCutoff);
    verifyBackAndForth(td); // verify round-trip

    // check if configuring custom color scheme incorrectly is resolved as expected
    badThematicProps = {
      gradientSettings: {
        colorScheme: ThematicGradientColorScheme.Custom,
        customKeys: [{ value: 0.0, color: 0 }], // (one entry is not okay - need at least two)
      },
    };
    td = ThematicDisplay.fromJSON(badThematicProps);
    expect(td.gradientSettings.customKeys.length).to.equal(2); // 2 entries should get manufactured
    expect(td.gradientSettings.customKeys[0].color).to.deep.equal(ColorDef.from(255, 255, 255, 0)); // first should be white
    expect(td.gradientSettings.customKeys[0].value).to.equal(0.0); // value for black should be 0.0
    expect(td.gradientSettings.customKeys[1].color).to.deep.equal(ColorDef.from(0, 0, 0, 0)); // second should be black
    expect(td.gradientSettings.customKeys[1].value).to.equal(1.0); // value for white should be 1.0
    verifyBackAndForth(td);

    // check if incorrectly configuring gradient mode / thematic display mode combination is resolved as expected - IsoLines / Sensors
    badThematicProps = {
      gradientSettings: {
        mode: ThematicGradientMode.IsoLines,
      },
      displayMode: ThematicDisplayMode.InverseDistanceWeightedSensors,
    };
    td = ThematicDisplay.fromJSON(badThematicProps);
    expect(td.gradientSettings.mode).to.equal(ThematicGradientMode.Smooth); // should default to smooth because of incorrect combo
    verifyBackAndForth(td);

    // check if incorrectly configuring gradient mode / thematic display mode combination is resolved as expected - SteppedWithDelimiter / Sensors
    badThematicProps = {
      gradientSettings: {
        mode: ThematicGradientMode.SteppedWithDelimiter,
      },
      displayMode: ThematicDisplayMode.InverseDistanceWeightedSensors,
    };
    td = ThematicDisplay.fromJSON(badThematicProps);
    expect(td.gradientSettings.mode).to.equal(ThematicGradientMode.Smooth); // should default to smooth because of incorrect combo
    verifyBackAndForth(td);

    // check if incorrectly configuring gradient mode / thematic display mode combination is resolved as expected - Slope
    badThematicProps = {
      gradientSettings: {
        mode: ThematicGradientMode.SteppedWithDelimiter,
      },
      displayMode: ThematicDisplayMode.Slope,
    };
    td = ThematicDisplay.fromJSON(badThematicProps);
    expect(td.gradientSettings.mode).to.equal(ThematicGradientMode.Smooth); // should default to smooth because of incorrect combo
    verifyBackAndForth(td);

    // check if incorrectly configuring gradient mode / thematic display mode combination is resolved as expected - HillShade
    badThematicProps = {
      gradientSettings: {
        mode: ThematicGradientMode.SteppedWithDelimiter,
      },
      displayMode: ThematicDisplayMode.HillShade,
    };
    td = ThematicDisplay.fromJSON(badThematicProps);
    expect(td.gradientSettings.mode).to.equal(ThematicGradientMode.Smooth); // should default to smooth because of incorrect combo
    verifyBackAndForth(td);
  });
});

describe("DisplayStyleSettings overrides", () => {
  const baseProps: DisplayStyle3dSettingsProps = {
    viewflags: {
      backgroundMap: true,
      acs: true,
      noConstruct: true,
      clipVol: true,
      renderMode: RenderMode.HiddenLine,
    },
    backgroundColor: ColorByName.aquamarine,
    monochromeColor: ColorByName.cyan,
    monochromeMode: MonochromeMode.Scaled,
    environment: {
      sky: {
        display: true,
        twoColor: true,
        skyExponent: 22,
      },
      ground: {
        display: false,
      },
    },
    hline: {
      transThreshold: 0x7f,
      visible: {
        ovrColor: true,
        color: ColorByName.yellow,
        width: 12,
        pattern: LinePixels.Solid,
      },
      hidden: {
        ovrColor: false,
        color: ColorByName.white,
        pattern: LinePixels.HiddenLine,
        width: 8,
      },
    },
    ao: {
      bias: 0.5,
      zLengthCap: 0.25,
      intensity: 1.5,
      blurDelta: 1,
      blurSigma: 2,
      blurTexelStepSize: 3,
      maxDistance: 4,
      texelStepSize: 5,
    },
    solarShadows: {
      color: ColorByName.green,
      bias: 0.2,
    },
    lights: {
      portrait: {
        intensity: 1,
      },
      specularIntensity: 2,
      numCels: 3,
    },
    thematic: {
      displayMode: ThematicDisplayMode.Height,
      axis: [-1, 0, 1],
      range: undefined,
      sensorSettings: undefined,
      sunDirection: [1, 0, -1],
      gradientSettings: {
        mode: 0,
        colorScheme: 0,
        customKeys: [],
        stepCount: 2,
        marginColor: ColorByName.magenta,
      },
    },
  };

  const mapProps: DisplayStyle3dSettingsProps = {
    backgroundMap: {
      groundBias: 42,
      providerData: {
        mapType: BackgroundMapType.Aerial,
      },
      transparency: 0.5,
      useDepthBuffer: true,
      globeMode: GlobeMode.Plane,
      terrainSettings: {
        exaggeration: 2.5,
        heightOrigin: -42,
        nonLocatable: true,
        heightOriginMode: 0,
      },
    },
  };

  const projectProps: DisplayStyle3dSettingsProps = {
    timePoint: 12345,
    contextRealityModels: [{
      tilesetUrl: "google.com",
      name: "google",
      description: "a popular search engine",
    }],
  };

  const iModelProps: DisplayStyle3dSettingsProps = {
    analysisStyle: {
      inputName: "channel1",
      inputRange: undefined,
      displacementChannelName: "channel2",
      displacementScale: undefined,
      normalChannelName: undefined,
      scalarChannelName: undefined,
      scalarThematicSettings: undefined,
      scalarRange: [1, 5],
    },
    analysisFraction: 0.2,
    scheduleScript: [{
      modelId: "0x321",
      realityModelUrl: "altavista.com",
      elementTimelines: [{
        batchId: 64,
        elementIds: ["0xabc", "0xdef"],
      }],
    }],
    subCategoryOvr: [{
      subCategory: "0x789",
      color: ColorByName.fuchsia,
      invisible: true,
      style: "0xaaa",
      weight: 10,
      transp: 0.5,
    }],
    excludedElements: ["0x4", "0x8", "0x10"],
    contextRealityModels: [{
      tilesetUrl: "google.com",
      name: "google",
      description: "a popular search engine",
      classifiers: [{
        modelId: "0x123",
        expand: 0.5,
        flags: {
          inside: SpatialClassificationProps.Display.Off,
          outside: SpatialClassificationProps.Display.Dimmed,
          isVolumeClassifier: true,
          type: 0,
        },
        name: "classifier",
        isActive: true,
      }],
    }],
    thematic: {
      displayMode: ThematicDisplayMode.Height,
      gradientSettings: {
        mode: 0,
        stepCount: 2,
        marginColor: ColorByName.magenta,
        colorScheme: 0,
        customKeys: [],
      },
      axis: [-1, 0, 1],
      sunDirection: [1, 0, -1],
      range: [1, 100],
      sensorSettings: {
        distanceCutoff: 12,
        sensors: [
          { position: [10, 20, 30], value: 0.5 },
        ],
      },
    },
    planProjections: {
      "0x6": { elevation: 4, transparency: 0.5, overlay: true, enforceDisplayPriority: true },
    },
  };

  it("creates selective overrides", () => {
    const settings = new DisplayStyle3dSettings({ styles: { ...baseProps, ...mapProps, ...projectProps, ...iModelProps } });

    const roundTrip = (options: DisplayStyleOverridesOptions, expected: DisplayStyle3dSettingsProps) => {
      const output = settings.toOverrides(options);
      expect(output).to.deep.equal(expected);
    };

    const viewflags = ViewFlags.fromJSON(baseProps.viewflags).toFullyDefinedJSON();

    const vfNoMapNoDec = { ...viewflags };
    delete vfNoMapNoDec.acs;
    delete vfNoMapNoDec.grid;
    delete vfNoMapNoDec.backgroundMap;

    const vfNoDec = { ...vfNoMapNoDec, backgroundMap: true };
    const vfNoMap = { ...vfNoMapNoDec, acs: true, grid: false };

    roundTrip({ includeAll: true }, { ...settings.toJSON(), viewflags });
    roundTrip({}, { ...baseProps, viewflags: vfNoMapNoDec });
    roundTrip({ includeBackgroundMap: true }, { ...baseProps, ...mapProps, viewflags: vfNoDec });
    roundTrip({ includeDrawingAids: true }, { ...baseProps, viewflags: vfNoMap });
    roundTrip({ includeBackgroundMap: true, includeDrawingAids: true }, { ...baseProps, ...mapProps, viewflags });

    roundTrip({ includeProjectSpecific: true }, { ...baseProps, ...projectProps, viewflags: vfNoMapNoDec });
    roundTrip({ includeIModelSpecific: true }, { ...baseProps, ...projectProps, ...iModelProps, viewflags: vfNoMapNoDec });
    roundTrip({ includeIModelSpecific: true, includeDrawingAids: true, includeBackgroundMap: true }, { ...baseProps, ...mapProps, ...projectProps, ...iModelProps, viewflags });
  });

  it("overrides selected settings", () => {
    const test = (overrides: DisplayStyle3dSettingsProps) => {
      const settings = new DisplayStyle3dSettings({ styles: { ...baseProps, ...mapProps, ...projectProps, ...iModelProps } });
      const originalSettings = { ...settings.toJSON() };
      settings.applyOverrides(overrides);
      const output = settings.toJSON();

      for (const key of Object.keys(overrides) as Array<keyof DisplayStyle3dSettingsProps>)
        expect(output[key]).to.deep.equal(overrides[key]);

      for (const key of Object.keys(output) as Array<keyof DisplayStyle3dSettingsProps>)
        if (undefined === overrides[key])
          expect(output[key]).to.deep.equal(originalSettings[key]);
    };

    const viewflags = baseProps.viewflags;
    test({ viewflags: { ...viewflags, renderMode: RenderMode.SolidFill } });
    test({ viewflags, backgroundColor: ColorByName.honeydew });
    test({ viewflags, monochromeColor: ColorByName.hotPink });
    test({ viewflags, monochromeMode: MonochromeMode.Flat });
    test({
      viewflags,
      analysisStyle: {
        inputName: undefined,
        inputRange: [2, 4],
        displacementChannelName: "displacement",
        displacementScale: 2.5,
        normalChannelName: "normal",
        scalarChannelName: undefined,
        scalarThematicSettings: undefined,
        scalarRange: undefined,
      },
      analysisFraction: 0.8,
    });

    test({
      viewflags,
      timePoint: 87654321,
      scheduleScript: [{
        modelId: "0xadf",
        realityModelUrl: "askjeeves.com",
        elementTimelines: [{
          batchId: 54,
          elementIds: ["0x1", "0x2", "0x3", "0x4"],
        }],
      }],
    });

    test({
      viewflags,
      subCategoryOvr: [{
        subCategory: "0x987",
        color: ColorByName.brown,
        invisible: false,
        style: "0xbbb",
        weight: 20,
        transp: 0.7,
      }],
    });

    test({
      viewflags,
      backgroundMap: {
        groundBias: 84,
        providerData: { mapType: BackgroundMapType.Street },
        applyTerrain: true,
        terrainSettings: { exaggeration: 0.5, heightOriginMode: 1 },
      },
    });

    test({
      viewflags,
      contextRealityModels: [{
        tilesetUrl: "bing.com",
        name: "bing",
        description: "an unpopular search engine",
        classifiers: [{
          modelId: "0x321",
          expand: 1.5,
          flags: {
            inside: SpatialClassificationProps.Display.Dimmed,
            outside: SpatialClassificationProps.Display.On,
            isVolumeClassifier: false,
            type: 0,
          },
          name: "bing",
          isActive: true,
        }],
      }],
    });

    test({ viewflags, excludedElements: ["0xdeadbeef", "0xbaadf00d"] });

    test({
      viewflags,
      environment: {
        sky: { display: false },
        ground: { display: true, elevation: 17, aboveColor: ColorByName.snow },
      },
    });

    test({
      viewflags,
      thematic: {
        displayMode: ThematicDisplayMode.Slope,
        axis: [0, 0.5, 1],
        range: [12, 24],
        sunDirection: [0, 1, 0],
        gradientSettings: {
          mode: 1,
          colorScheme: 1,
          customKeys: [],
          stepCount: 3,
          marginColor: ColorByName.pink,
        },
      },
    });

    test({
      viewflags,
      hline: {
        transThreshold: 0x4f,
        visible: {
          ovrColor: true,
          color: ColorByName.green,
          width: 2,
          pattern: LinePixels.Solid,
        },
        hidden: {
          ovrColor: false,
          color: ColorByName.white,
          width: 1,
          pattern: LinePixels.Solid,
        },
      },
    });

    test({
      viewflags,
      ao: {
        bias: 1.5,
        zLengthCap: 1.25,
        intensity: 0.5,
        blurDelta: 1.5,
        blurSigma: 2.5,
        blurTexelStepSize: 3.5,
        maxDistance: 4.5,
        texelStepSize: 5.5,
      },
    });

    test({ viewflags, solarShadows: { bias: 0.4, color: ColorByName.blue } });

    test({
      viewflags,
      lights: {
        numCels: 2,
        solar: { intensity: 4, alwaysEnabled: true },
        ambient: { intensity: 2, color: { r: 12, g: 24, b: 48 } },
      },
    });

    test({
      viewflags,
      planProjections: {
        "0x8": { elevation: 2, transparency: 0.25, overlay: true, enforceDisplayPriority: true },
      },
    });
  });
});

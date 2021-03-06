/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/* tslint:disable:no-direct-imports */

import "@bentley/presentation-frontend/lib/test/_helpers/MockFrontendEnvironment";
import { expect } from "chai";
import * as sinon from "sinon";
import { BeEvent } from "@bentley/bentleyjs-core";
import { Content, ContentUpdateInfo, Item, Ruleset, RulesetsFactory } from "@bentley/presentation-common";
import * as moq from "@bentley/presentation-common/lib/test/_helpers/Mocks";
import {
  createRandomContent, createRandomDescriptor, createRandomPrimitiveField, createRandomRuleset,
} from "@bentley/presentation-common/lib/test/_helpers/random";
import { Presentation, PresentationManager, RulesetManager } from "@bentley/presentation-frontend";
import { TypeConverter, TypeConverterManager } from "@bentley/ui-components";
import {
  DataProvidersFactory, DataProvidersFactoryProps, IPresentationPropertyDataProvider, PresentationTableDataProvider,
} from "../presentation-components";
import { createRandomPropertyRecord } from "./_helpers/UiComponents";

describe("DataProvidersFactory", () => {

  let onContentUpdateEvent: BeEvent<(ruleset: Ruleset, info: ContentUpdateInfo) => void>;
  const presentationManagerMock = moq.Mock.ofType<PresentationManager>();
  const propertiesProvider = moq.Mock.ofType<IPresentationPropertyDataProvider>();
  let factory: DataProvidersFactory | undefined;
  let props: DataProvidersFactoryProps | undefined;

  before(() => {
    Presentation.setPresentationManager(presentationManagerMock.object);
  });

  after(() => {
    Presentation.terminate();
  });

  beforeEach(() => {
    props = undefined;
    factory = undefined;
    onContentUpdateEvent = new BeEvent();
    propertiesProvider.reset();
    presentationManagerMock.reset();
    presentationManagerMock.setup((x) => x.onContentUpdate).returns(() => onContentUpdateEvent);
    presentationManagerMock.setup((x) => x.rulesets()).returns(() => moq.Mock.ofType<RulesetManager>().object);
  });

  afterEach(() => {
    sinon.restore();
  });

  const getFactory = (): DataProvidersFactory => {
    if (!factory)
      factory = new DataProvidersFactory(props);
    return factory;
  };

  describe("createSimilarInstancesTableDataProvider", () => {

    it("throws when there's no content", async () => {
      propertiesProvider.setup(async (x) => x.getContent()).returns(async () => undefined);
      await expect(getFactory().createSimilarInstancesTableDataProvider(propertiesProvider.object, createRandomPropertyRecord(), {})).to.eventually.be.rejected;
    });

    it("throws when content has no records", async () => {
      const content = new Content(createRandomDescriptor(), []);
      propertiesProvider.setup(async (x) => x.getContent()).returns(async () => content);
      await expect(getFactory().createSimilarInstancesTableDataProvider(propertiesProvider.object, createRandomPropertyRecord(), {})).to.eventually.be.rejected;
    });

    it("throws when content descriptor has no field with property record's name", async () => {
      const record = createRandomPropertyRecord();
      const content = createRandomContent();
      content.contentSet.push(new Item([], "", "", undefined, {}, {}, []));
      propertiesProvider.setup(async (x) => x.getContent()).returns(async () => content);
      await expect(getFactory().createSimilarInstancesTableDataProvider(propertiesProvider.object, record, {})).to.eventually.be.rejected;
    });

    it("creates a provider with similar instances ruleset", async () => {
      const ruleset = await createRandomRuleset();

      const field = createRandomPrimitiveField();
      const descriptor = createRandomDescriptor();
      descriptor.fields.push(field);
      const contentItem = new Item([], "", "", undefined, { [field.name]: "test value" }, { [field.name]: "test display value" }, []);
      propertiesProvider.setup(async (x) => x.getContent()).returns(async () => new Content(descriptor, [contentItem]));

      const record = createRandomPropertyRecord();
      record.property.name = field.name;

      const typeConverterStub = sinon.createStubInstance(TypeConverter);
      typeConverterStub.convertToString.returns("test str");
      const getConverterStub = sinon.stub(TypeConverterManager, "getConverter").returns(typeConverterStub);

      const rulesetsFactoryMock = moq.Mock.ofType<RulesetsFactory>();
      props = { rulesetsFactory: rulesetsFactoryMock.object };
      rulesetsFactoryMock
        .setup(async (x) => x.createSimilarInstancesRuleset(field, contentItem, moq.It.isAny()))
        .returns(async (_f, _c, cb) => ({ ruleset, description: await cb("a", "b", "c") }));

      const dataProvider = await getFactory().createSimilarInstancesTableDataProvider(propertiesProvider.object, record, {});
      expect(getConverterStub).to.be.calledOnceWith("a");
      expect(typeConverterStub.convertToString).to.be.calledOnceWith("b");
      expect(dataProvider).to.be.instanceOf(PresentationTableDataProvider);
      expect(dataProvider.rulesetId).to.eq(ruleset.id);
      expect(dataProvider.description).to.eq("test str");
      expect((dataProvider as any).shouldRequestContentForEmptyKeyset()).to.be.true;
    });

    it("uses record's display value for navigation properties", async () => {
      const ruleset = await createRandomRuleset();

      const field = createRandomPrimitiveField();
      const descriptor = createRandomDescriptor();
      descriptor.fields.push(field);
      const contentItem = new Item([], "", "", undefined, { [field.name]: "test value" }, { [field.name]: "test display value" }, []);
      propertiesProvider.setup(async (x) => x.getContent()).returns(async () => new Content(descriptor, [contentItem]));

      const record = createRandomPropertyRecord();
      record.property.name = field.name;

      const getConverterStub = sinon.spy(TypeConverterManager, "getConverter");

      const rulesetsFactoryMock = moq.Mock.ofType<RulesetsFactory>();
      props = { rulesetsFactory: rulesetsFactoryMock.object };
      rulesetsFactoryMock
        .setup(async (x) => x.createSimilarInstancesRuleset(field, contentItem, moq.It.isAny()))
        .returns(async (_f, _c, cb) => ({ ruleset, description: await cb("navigation", "b", "c") }));

      const dataProvider = await getFactory().createSimilarInstancesTableDataProvider(propertiesProvider.object, record, {});
      expect(getConverterStub).to.not.be.called;
      expect(dataProvider.description).to.eq("c");
    });

    it("uses record's display value for double properties", async () => {
      const ruleset = await createRandomRuleset();
      const rawValue = 1.123;
      const displayValue = "1.12 m2";

      const field = createRandomPrimitiveField();
      const descriptor = createRandomDescriptor();
      descriptor.fields.push(field);
      const contentItem = new Item([], "", "", undefined, { [field.name]: rawValue }, { [field.name]: displayValue }, []);
      propertiesProvider.setup(async (x) => x.getContent()).returns(async () => new Content(descriptor, [contentItem]));

      const record = createRandomPropertyRecord();
      record.property.name = field.name;

      const getConverterStub = sinon.spy(TypeConverterManager, "getConverter");

      const rulesetsFactoryMock = moq.Mock.ofType<RulesetsFactory>();
      props = { rulesetsFactory: rulesetsFactoryMock.object };
      rulesetsFactoryMock
        .setup(async (x) => x.createSimilarInstancesRuleset(field, contentItem, moq.It.isAny()))
        .returns(async (_f, _c, cb) => ({ ruleset, description: await cb("double", rawValue, displayValue) }));

      const dataProvider = await getFactory().createSimilarInstancesTableDataProvider(propertiesProvider.object, record, {});
      expect(getConverterStub).to.not.be.called;
      expect(dataProvider.description).to.eq(displayValue);
    });

  });

});

/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module Widget */

import * as React from "react";
import { IModelApp, SelectedViewportChangedArgs, IModelConnection, Viewport } from "@bentley/imodeljs-frontend";
import { SelectionMode, ContextMenu, ContextMenuItem } from "@bentley/ui-components";
import { CategoryTree } from "../imodel-components/category-tree/CategoriesTree";
import { VisibilityTree } from "../imodel-components/visibility-tree/VisibilityTree";
import { SpatialContainmentTree } from "../imodel-components/spatial-tree/SpatialContainmentTree";
import { Position, ScrollPositionMaintainer } from "@bentley/ui-core";
import { UiFramework } from "../UiFramework";
import { WidgetControl } from "../widgets/WidgetControl";
import { ConfigurableCreateInfo } from "../configurableui/ConfigurableUiControl";
import "./VisibilityWidget.scss";

import widgetIconSvg from "@bentley/icons-generic/icons/hierarchy-tree.svg";

/**
 * Types of hierarchies displayed in the `VisibilityComponent`
 * @public
 */
export enum VisibilityComponentHierarchy {
  Models = "models",
  Categories = "categories",
  SpatialContainment = "spatial-containment",
}

/**
 * Props for `VisibilityComponent`
 * @alpha
 */
export interface VisibilityComponentProps {
  /** iModel whose data should be displayed in the component */
  iModelConnection: IModelConnection;
  /** Viewport to use for controlling display */
  activeViewport?: Viewport;
  /** `React.Ref` to the root HTML element  */
  activeTreeRef?: React.Ref<HTMLDivElement>;
  /** Start pre-loading specified hierarchies as soon as user picks one for display. */
  enableHierarchiesPreloading?: VisibilityComponentHierarchy[];
}

interface VisibilityTreeState {
  initialized: boolean;
  activeTree: VisibilityComponentHierarchy;
  showOptions: boolean;
  showSearchBox: boolean;
  viewport?: Viewport;
  selectAll: boolean;
  clearAll: boolean;
}

/** VisibilityComponent React component.
 * @alpha
 */
// istanbul ignore next
export class VisibilityComponent extends React.Component<VisibilityComponentProps, VisibilityTreeState> {
  private _optionsElement: HTMLElement | null = null;

  constructor(props: any) {
    super(props);
    this.state = {
      initialized: false, activeTree: VisibilityComponentHierarchy.Models, showOptions: false, showSearchBox: false,
      viewport: this.props.activeViewport, selectAll: false, clearAll: false,
    };
  }
  public async componentDidMount() {
    IModelApp.viewManager.onSelectedViewportChanged.addListener(this._onViewportChangedHandler);
  }

  /** Remove listeners */
  public componentWillUnmount() {
    IModelApp.viewManager.onSelectedViewportChanged.removeListener(this._onViewportChangedHandler);
  }

  private _onViewportChangedHandler = async (args: SelectedViewportChangedArgs) => {
    if (args.current) {
      this.setState({ viewport: args.current });
    }
  }

  private _onShowOptions = () => {
    this.setState({ showOptions: !this.state.showOptions });
  }

  private _onCloseOptions = () => {
    this.setState({ showOptions: false });
  }

  private _onShowTree = (event: any) => {
    const activeTree = event.target.value;
    this.setState({ activeTree });
  }

  private _onSetEnableAll = () => {
    this._onCloseOptions();
    this.setState((_prevState) => ({ selectAll: true }), () => { this.setState({ selectAll: false }); });
  }

  private _onClearAll = () => {
    this._onCloseOptions();
    this.setState((_prevState) => ({ clearAll: true }), () => { this.setState({ clearAll: false }); });
  }

  private _onToggleSearchBox = () => {
    this.setState({ showSearchBox: !this.state.showSearchBox });
  }

  private shouldEnablePreloading(hierarchy: VisibilityComponentHierarchy) {
    return this.props.enableHierarchiesPreloading
      && - 1 !== this.props.enableHierarchiesPreloading.indexOf(hierarchy);
  }

  private _renderTree() {
    const { iModelConnection } = this.props;
    const { activeTree, showSearchBox, viewport, selectAll, clearAll } = this.state;
    return (<div className="uifw-visibility-tree-wrapper">
      {activeTree === VisibilityComponentHierarchy.Models && <VisibilityTree imodel={iModelConnection} activeView={viewport} selectionMode={SelectionMode.None}
        rootElementRef={this.props.activeTreeRef} enablePreloading={this.shouldEnablePreloading(VisibilityComponentHierarchy.Models)} />}
      {activeTree === VisibilityComponentHierarchy.Categories && <CategoryTree iModel={iModelConnection} activeView={viewport} showSearchBox={showSearchBox}
        selectAll={selectAll} clearAll={clearAll} enablePreloading={this.shouldEnablePreloading(VisibilityComponentHierarchy.Categories)} />}
      {activeTree === VisibilityComponentHierarchy.SpatialContainment && <SpatialContainmentTree iModel={iModelConnection}
        enablePreloading={this.shouldEnablePreloading(VisibilityComponentHierarchy.SpatialContainment)} />}
    </div>);
  }

  public render() {
    const { activeTree } = this.state;
    const showCategories = true;
    const showContainment = true;
    const searchStyle: React.CSSProperties = {
      opacity: (activeTree === VisibilityComponentHierarchy.Categories) ? 1 : 0,
      visibility: (activeTree === VisibilityComponentHierarchy.Categories) ? "visible" : "hidden",
    };
    return (<div className="uifw-visibility-tree">
      <div className="uifw-visibility-tree-header">
        <select className="uifw-visibility-tree-select" onChange={this._onShowTree.bind(this)}>
          <option value={VisibilityComponentHierarchy.Models}>{UiFramework.translate("visibilityWidget.modeltree")}</option>
          {showCategories && <option value={VisibilityComponentHierarchy.Categories}>{UiFramework.translate("visibilityWidget.categories")}</option>}
          {showContainment && <option value={VisibilityComponentHierarchy.SpatialContainment}>{UiFramework.translate("visibilityWidget.containment")}</option>}
        </select>
        <span className="icon icon-search" style={searchStyle} onClick={this._onToggleSearchBox} />
        <span className="uifw-visibility-tree-options icon icon-more-vertical-2" style={searchStyle} title={UiFramework.translate("visibilityWidget.options")} ref={(element) => { this._optionsElement = element; }} onClick={this._onShowOptions.bind(this)}></span>
        <ContextMenu parent={this._optionsElement} isOpened={this.state.showOptions} onClickOutside={this._onCloseOptions.bind(this)} position={Position.BottomRight}>
          <ContextMenuItem key={0} icon="icon-visibility" onClick={this._onSetEnableAll} name={UiFramework.translate("pickerButtons.showAll")} />
          <ContextMenuItem key={1} icon="icon-visibility-hide-2" onClick={this._onClearAll} name={UiFramework.translate("pickerButtons.hideAll")} />
        </ContextMenu>
      </div>
      {this._renderTree()}
    </div>);
  }
}

/** VisibilityWidget React component.
 * @alpha
 */
// istanbul ignore next
export class VisibilityWidget extends WidgetControl {
  private _activeTreeRef = React.createRef<HTMLDivElement>();
  private _maintainScrollPosition?: ScrollPositionMaintainer;

  public static get iconSpec() {
    return `svg:${widgetIconSvg}`;
  }

  public static get label() {
    return UiFramework.translate("visibilityWidget.visibilityTree");
  }

  constructor(info: ConfigurableCreateInfo, options: any) {
    super(info, options);
    if (options && options.iModelConnection)
      this.reactElement = <VisibilityComponent iModelConnection={options.iModelConnection} activeViewport={IModelApp.viewManager.selectedView} activeTreeRef={this._activeTreeRef} enableHierarchiesPreloading={options.enableHierarchiesPreloading} />;
    else
      this.reactElement = "no imodel";
  }

  public saveTransientState(): void {
    if (this._activeTreeRef.current)
      this._maintainScrollPosition = new ScrollPositionMaintainer(this._activeTreeRef.current);
  }

  public restoreTransientState(): boolean {
    if (this._maintainScrollPosition) {
      this._maintainScrollPosition.dispose();
      this._maintainScrollPosition = undefined;
    }
    return true;
  }
}
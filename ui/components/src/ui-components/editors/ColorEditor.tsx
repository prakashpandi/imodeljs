/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module PropertyEditors
 */

import "./ColorEditor.scss";
import classnames from "classnames";
import * as React from "react";
import { ColorDef } from "@bentley/imodeljs-common";
import {
  ColorEditorParams, PrimitiveValue, PropertyEditorParams, PropertyEditorParamTypes, PropertyRecord, PropertyValue, PropertyValueFormat,
  StandardEditorNames, StandardTypeNames,
} from "@bentley/ui-abstract";
import { ColorPickerButton } from "../color/ColorPickerButton";
import { PropertyEditorProps, TypeEditor } from "./EditorContainer";
import { PropertyEditorBase, PropertyEditorManager } from "./PropertyEditorManager";

/** @internal */
interface ColorEditorState {
  colorValue: number;
  readonly: boolean;
  isDisabled?: boolean;
  numColumns: number;
  availableColors: ColorDef[];
}

/** ColorEditor React component that is a property editor with text input
 * @beta
 */
export class ColorEditor extends React.PureComponent<PropertyEditorProps, ColorEditorState> implements TypeEditor {
  private _control: any | null = null;

  /** @internal */
  public readonly state: Readonly<ColorEditorState> = {
    colorValue: 0,
    readonly: false,
    numColumns: 4,
    availableColors: [],
  };

  public async getPropertyValue(): Promise<PropertyValue | undefined> {
    const record = this.props.propertyRecord;
    let propertyValue: PropertyValue | undefined;

    // istanbul ignore else
    if (record && record.value.valueFormat === PropertyValueFormat.Primitive) {
      propertyValue = {
        valueFormat: PropertyValueFormat.Primitive,
        value: this.state.colorValue,
        displayValue: "",
      };
    }

    return propertyValue;
  }

  private setFocus(): void {
    // istanbul ignore else
    if (this._control && !this.state.isDisabled) {
      this._control.setFocus();
    }
  }

  private _onColorPick = (color: ColorDef) => {
    const propertyRecord = this.props.propertyRecord as PropertyRecord;

    this.setState({
      colorValue: color.tbgr,
    }, async () => {
      // istanbul ignore else
      if (propertyRecord && this.props.onCommit) {
        const propertyValue = await this.getPropertyValue();
        // istanbul ignore else
        if (propertyValue !== undefined) {
          this.props.onCommit({ propertyRecord, newValue: propertyValue });
        }
      }
    });
  }

  /** @internal */
  public componentDidMount() {
    this.setStateFromProps(); // tslint:disable-line:no-floating-promises
  }

  /** @internal */
  public componentDidUpdate(prevProps: PropertyEditorProps) {
    if (this.props.propertyRecord !== prevProps.propertyRecord) {
      this.setStateFromProps(); // tslint:disable-line:no-floating-promises
    }
  }

  private async setStateFromProps() {
    const record = this.props.propertyRecord;

    // istanbul ignore else
    if (record && record.value.valueFormat === PropertyValueFormat.Primitive) {
      const colorValue = (record.value as PrimitiveValue).value as number;
      let numColumns = 4;
      const availableColors = new Array<ColorDef>();
      const readonly = record && undefined !== record.isReadonly ? record.isReadonly : false;
      const isDisabled = record ? record.isDisabled : undefined;

      if (record.property.editor && record.property.editor.params) {
        const colorParams = record.property.editor.params.find((param: PropertyEditorParams) => param.type === PropertyEditorParamTypes.ColorData) as ColorEditorParams;
        // istanbul ignore else
        if (colorParams) {
          colorParams.colorValues.forEach((colorNumber: number) => {
            availableColors.push(ColorDef.create(colorNumber));
          });
          // istanbul ignore else
          if (colorParams.numColumns)
            numColumns = colorParams.numColumns;
        }
      }

      this.setState(
        { colorValue, readonly, isDisabled, numColumns, availableColors },
        () => {
          if (this.props.setFocus) {
            this.setFocus();
          }
        },
      );
    }
  }

  /** @internal */
  public render() {
    const colorDef = ColorDef.create(this.state.colorValue);
    return (
      <div className={classnames("components-color-editor", this.props.className)} style={this.props.style}>
        <ColorPickerButton ref={(control) => this._control = control}
          activeColor={colorDef}
          colorDefs={this.state.availableColors.length > 0 ? this.state.availableColors : [colorDef]}
          numColumns={this.state.numColumns}
          disabled={this.state.isDisabled ? true : false}
          readonly={this.state.readonly}
          onColorPick={this._onColorPick}
          data-testid="components-color-editor" />
      </div>
    );
  }
}

/** Color Property Editor registered for the "number" type name and "color-picker" editor name.
 * It uses the [[ColorEditor]] React component.
 * @beta
 */
export class ColorPropertyEditor extends PropertyEditorBase {
  public get reactNode(): React.ReactNode {
    return <ColorEditor />;
  }
}

PropertyEditorManager.registerEditor(StandardTypeNames.Number, ColorPropertyEditor, StandardEditorNames.ColorPicker);

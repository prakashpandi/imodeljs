/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Checkbox
 */

import classnames from "classnames";
import * as React from "react";
import { InputStatus } from "../inputs/InputStatus";
import { CommonProps } from "../utils/Props";
import { Omit } from "../utils/typeUtils";

/** Properties for [[Checkbox]] React component
 * @public
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onClick" | "onBlur">, CommonProps {
  /** Text that will be shown next to the checkbox. */
  label?: string;
  /** Indicates checkbox is in an Indeterminate or Partial state, regardless of the `checked` state */
  indeterminate?: boolean;
  /** Input status like: "Success", "Warning" or "Error" */
  status?: InputStatus;
  /** Custom CSS class name for the checkbox input element */
  inputClassName?: string;
  /** Custom CSS Style for the checkbox input element */
  inputStyle?: React.CSSProperties;
  /** Custom CSS class name for the label element */
  labelClassName?: string;
  /** Custom CSS Style for the label element */
  labelStyle?: React.CSSProperties;
  /**
   * Event called when checkbox is clicked on. This is a good event to
   * use for preventing the action from bubbling to component's parents.
   */
  onClick?: (e: React.MouseEvent) => void;
  /** Event called when checkbox loses focus. */
  onBlur?: (e: React.FocusEvent) => void;
  /** Indicates whether the checkbox should set focus */
  setFocus?: boolean;
}

/** A React component that renders a simple checkbox with label.
 * It is a wrapper for the `<input type="checkbox">` HTML element.
 * @public
 */
export class Checkbox extends React.PureComponent<CheckboxProps> {
  private _checkboxInput = React.createRef<HTMLInputElement>();

  private _onCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  }

  private _onCheckboxBlur = (e: React.FocusEvent) => {
    e.stopPropagation();
  }

  private _setIndeterminate(indeterminate: boolean) {
    // istanbul ignore else
    if (this._checkboxInput.current)
      this._checkboxInput.current.indeterminate = indeterminate;
  }

  public componentDidMount() {
    if (this.props.indeterminate !== undefined)
      this._setIndeterminate(this.props.indeterminate);

    if (this.props.setFocus && this._checkboxInput.current)
      this._checkboxInput.current.focus();
  }

  /** @internal */
  public componentDidUpdate(_prevProps: CheckboxProps) {
    if (this.props.indeterminate !== undefined)
      this._setIndeterminate(this.props.indeterminate);
  }

  public render() {
    const { status, disabled, label, indeterminate, className, inputClassName, inputStyle, labelClassName, labelStyle,
      onClick, onBlur, setFocus, ...inputProps } = this.props;
    const checkBoxClass = classnames("core-checkbox",
      disabled && "core-disabled",
      !label && "core-checkbox-no-label",
      status,
      className);

    return (
      <label className={checkBoxClass} onClick={onClick} onBlur={onBlur}>
        {label &&
          <span className="core-checkbox-label">{label}</span>
        }
        <input type="checkbox" ref={this._checkboxInput} {...inputProps}
          disabled={disabled} className={inputClassName} style={inputStyle}
          onClick={this._onCheckboxClick} onBlur={this._onCheckboxBlur} />
        <span className="core-checkbox-checkmark"></span>
      </label>
    );
  }
}

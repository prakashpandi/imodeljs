/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Widget
 */

import "./Overflow.scss";
import classnames from "classnames";
import * as React from "react";
import { useRefs, useRefState, useResizeObserver } from "@bentley/ui-core";
import { WidgetMenu } from "./Menu";

/** @internal */
export interface WidgetOverflowProps {
  children?: React.ReactNode;
  hidden?: boolean;
  onResize?: (w: number) => void;
}

/** @internal */
export const WidgetOverflow = React.memo<WidgetOverflowProps>(function WidgetOverflow(props) { // tslint:disable-line: variable-name no-shadowed-variable
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [targetRef, target] = useRefState<HTMLDivElement>();
  const resizeObserverRef = useResizeObserver<HTMLDivElement>(props.onResize);
  const refs = useRefs(ref, resizeObserverRef);
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setOpen((prev) => !prev);
  }, []);
  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, []);
  const className = classnames(
    "nz-widget-overflow",
    props.hidden && "nz-hidden",
  );
  return (
    <div
      className={className}
      ref={refs}
    >
      <div
        className="nz-button"
        onClick={handleClick}
        ref={targetRef}
      >
        <div className="nz-icon" />
      </div>
      <WidgetMenu
        children={props.children}
        open={open}
        onClose={handleClose}
        target={target}
      />
    </div>
  );
});

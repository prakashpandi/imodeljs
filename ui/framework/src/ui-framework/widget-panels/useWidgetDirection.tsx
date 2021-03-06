/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Widget
 */

import * as React from "react";
import { findTab, isHorizontalPanelSide, NineZoneContext, TabIdContext } from "@bentley/ui-ninezone";

/** Returns widget direction.
 * I.e. "horizontal" when widget is in bottom/top stage panel.
 * @alpha
 */
export function useWidgetDirection(): "horizontal" | "vertical" {
  const tabId = React.useContext(TabIdContext);
  const nineZone = React.useContext(NineZoneContext);
  const tabLocation = findTab(nineZone, tabId);
  if (tabLocation && ("side" in tabLocation) && isHorizontalPanelSide(tabLocation.side)) {
    return "horizontal";
  }
  return "vertical";
}

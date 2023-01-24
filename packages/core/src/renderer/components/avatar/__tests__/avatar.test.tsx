/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { Avatar } from "../avatar";
import { Icon } from "../../icon";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { type DiRender, renderFor } from "../../test-utils/renderFor";

describe("<Avatar/>", () => {
  let render: DiRender;

  beforeEach(() => {
    const di = getDiForUnitTesting({ doGeneralOverrides: true });

    render = renderFor(di);
  });

  test("renders w/o errors", () => {
    const { container } = render(<Avatar>JF</Avatar>);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  test("shows custom icon passed as children", () => {
    const { getByTestId } = render(<Avatar><Icon material="alarm" data-testid="alarm-icon"/></Avatar>);

    expect(getByTestId("alarm-icon")).toBeInTheDocument();
  });
});

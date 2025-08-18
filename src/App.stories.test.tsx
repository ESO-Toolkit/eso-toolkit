import React from "react";
import renderer from "react-test-renderer";
import App from "./App";
import { MemoryRouter } from "react-router-dom";

describe("App Storybook Snapshot", () => {
  it("matches the default story snapshot", () => {
    const tree = renderer
      .create(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

function HookComponent() {
  const [count] = React.useState(0);
  return <div>Count: {count}</div>;
}

describe("React Hooks Test", () => {
  it("should render with useState", () => {
    render(<HookComponent />);
    expect(screen.getByText("Count: 0")).toBeInTheDocument();
  });
});

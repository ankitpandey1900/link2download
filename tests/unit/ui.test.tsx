import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { Button } from "@/shared/ui/button";

describe("Button", () => {
  it("renders accessible button content", () => {
    render(<Button>Extract</Button>);
    expect(screen.getByRole("button", { name: "Extract" })).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditButton } from "./EditButton";

describe("EditButton", () => {
  it("renders a visible 'Edit' label by default", () => {
    // The whole point of the change: the label must be readable text,
    // not an icon a user has to decode.
    render(<EditButton onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("renders a custom label", () => {
    render(<EditButton onClick={() => {}} label="Edit Room" />);
    expect(screen.getByText("Edit Room")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<EditButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is a real button element", () => {
    render(<EditButton onClick={() => {}} />);
    expect(screen.getByRole("button").tagName).toBe("BUTTON");
  });

  it("has an explicit type so it never submits a surrounding form", () => {
    render(<EditButton onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("appends custom classes without dropping its own", () => {
    render(<EditButton onClick={() => {}} className="ml-2" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("ml-2");
    expect(button.className).toContain("rounded");
  });

  it("exposes an accessible title when given one", () => {
    render(<EditButton onClick={() => {}} title="Edit profile via OTP" />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Edit profile via OTP",
    );
  });

  it("renders smaller padding at size sm", () => {
    const { rerender } = render(<EditButton onClick={() => {}} size="sm" />);
    const small = screen.getByRole("button").className;
    rerender(<EditButton onClick={() => {}} size="md" />);
    const medium = screen.getByRole("button").className;
    expect(small).not.toBe(medium);
  });
});

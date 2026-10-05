import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount React trees and reset localStorage between tests so state never
// leaks from one case into the next.
afterEach(() => {
  cleanup();
  localStorage.clear();
});

import { generateMock } from "./mock.js";

// Returns { points, metrics, isSample }.
// For now this only returns sample data (the backend comes next).
export async function loadTimeseries({ start, end, horizon }) {
  await new Promise((r) => setTimeout(r, 250)); // small delay so loading is visible
  return { ...generateMock({ start, end, horizon }), isSample: true };
}

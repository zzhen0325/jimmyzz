// Keep this in memory so a full page refresh still gets the initial loader.
let hasVisitedProject = false;

export function markProjectVisited() {
  hasVisitedProject = true;
}

export function shouldShowHomeLoader() {
  return !hasVisitedProject;
}

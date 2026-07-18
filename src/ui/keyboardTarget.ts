/** Pure keyboard-target helpers for menu shortcuts (no game logic). */

/**
 * True when Enter/Space should be handled by the focused control, not a global
 * menu shortcut (e.g. start round). Avoids double-firing when focus is on Garage.
 */
export function isInteractiveKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest(
    'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="tab"], [contenteditable="true"]',
  );
  return el != null;
}

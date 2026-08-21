// A field no human ever fills in. Automated form-fillers populate every
// input they find, so a non-empty value here is a reliable bot signal — see
// HONEYPOT_NAME in src/lib/inquiry.ts for how the server treats it.
//
// Hidden by clipping rather than with `display: none`, because some bots skip
// fields they can tell are undisplayed. Clipping (rather than a large
// negative offset) keeps it from ever widening the page. It is still removed
// from the accessibility tree and the tab order, so no keyboard or
// screen-reader user can land on it by accident.
//
// The name is deliberately plausible ("company") — a bot is more likely to
// fill something that looks like a real field than something called "trap".

import { HONEYPOT_NAME } from "@/lib/inquiry";

export function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0 [clip:rect(0,0,0,0)]"
    >
      <label htmlFor={HONEYPOT_NAME}>Company (leave this field empty)</label>
      <input
        id={HONEYPOT_NAME}
        type="text"
        name={HONEYPOT_NAME}
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { renderPreflightError } from "../src/auth/preflight-error.js";

describe("renderPreflightError", () => {
  it("missing_credential offers auth and downgrade", () => {
    const e = renderPreflightError("missing_credential", "anthropic", "opus");
    assert.match(e.title, /opus/);
    const actionTypes = e.actions.map((a) => a.action.type);
    assert.ok(actionTypes.includes("auth_login"));
    assert.ok(actionTypes.includes("downgrade"));
    assert.ok(actionTypes.includes("cancel"));
  });

  it("entitlement_denied offers upgrade URL and downgrade", () => {
    const e = renderPreflightError("entitlement_denied", "anthropic", "opus");
    const actionTypes = e.actions.map((a) => a.action.type);
    assert.ok(actionTypes.includes("open_url"));
    assert.ok(actionTypes.includes("downgrade"));
  });

  it("every error provides at least one non-cancel forward action", () => {
    const reasons = [
      "missing_credential",
      "expired_credential",
      "invalid_credential",
      "model_not_found",
      "entitlement_denied",
      "region_unavailable",
      "rate_limited",
      "network_error",
      "unknown",
    ] as const;
    for (const r of reasons) {
      const e = renderPreflightError(r, "p", "m");
      const forward = e.actions.filter((a) => a.action.type !== "cancel");
      assert.ok(forward.length > 0, `${r} has no forward action`);
    }
  });

  it("includes the upstream message when provided", () => {
    const e = renderPreflightError(
      "invalid_credential",
      "anthropic",
      "opus",
      "key sk-ant-abc revoked",
    );
    const body = e.body.join(" ");
    assert.match(body, /revoked/);
  });
});

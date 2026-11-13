/**
 * Barrel file that imports every built-in provider for their side effects
 * (self-registration). Import this once from the CLI entrypoint to populate
 * the plugin registry before config is loaded.
 *
 * To add a new built-in, create a file under src/providers/ that calls
 * `registerProvider(kind, factory)` at module top level, then add the import
 * here.
 */
import "./anthropic-api.js";
import "./oauth-device.js";
import "./bedrock.js";
import "./vertex.js";

export { getProviderFactory, listProviderKinds } from "./registry.js";

// src/workers/flagship/binding.worker.ts
import { WorkerEntrypoint } from "cloudflare:workers";
var FlagshipBinding = class extends WorkerEntrypoint {
  async get(_flagKey, defaultValue, _context) {
    return defaultValue;
  }
  async getBooleanValue(_flagKey, defaultValue, _context) {
    return defaultValue;
  }
  async getStringValue(_flagKey, defaultValue, _context) {
    return defaultValue;
  }
  async getNumberValue(_flagKey, defaultValue, _context) {
    return defaultValue;
  }
  async getObjectValue(_flagKey, defaultValue, _context) {
    return defaultValue;
  }
  async getBooleanDetails(flagKey, defaultValue, _context) {
    return {
      flagKey,
      value: defaultValue,
      reason: "DEFAULT"
    };
  }
  async getStringDetails(flagKey, defaultValue, _context) {
    return {
      flagKey,
      value: defaultValue,
      reason: "DEFAULT"
    };
  }
  async getNumberDetails(flagKey, defaultValue, _context) {
    return {
      flagKey,
      value: defaultValue,
      reason: "DEFAULT"
    };
  }
  async getObjectDetails(flagKey, defaultValue, _context) {
    return {
      flagKey,
      value: defaultValue,
      reason: "DEFAULT"
    };
  }
};
export {
  FlagshipBinding
};
//# sourceMappingURL=binding.worker.js.map

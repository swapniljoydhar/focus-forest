## 2026-09-09 - Message Type Property Safety in Service Worker Messaging
**Vulnerability:** Message handlers using raw property lookup or unvalidated schema objects are vulnerable to prototype pollution or property override bypasses if incoming message payloads contain inherited object keys (e.g. `constructor`, `toString`, `__proto__`).
**Learning:** `SCHEMAS[message.type]` lookup in `validateMessage` can access inherited properties from `Object.prototype` if `message.type` matches built-in object methods, potentially bypassing type checking rules.
**Prevention:** Always use `Object.hasOwn(SCHEMAS, message.type)` to verify message types strictly against own properties of the schema definition map before proceeding with schema validation.

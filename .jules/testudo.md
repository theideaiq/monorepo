## 2025-02-23 - Cross-Package Testing Gap
Discovery: `packages/payment-engine` contains critical routing logic (`PaymentFactory`) but lacks a test runner/configuration.
Strategy: Implement consumer-side integration tests in `apps/web` to verify library behavior without overhauling the build system.

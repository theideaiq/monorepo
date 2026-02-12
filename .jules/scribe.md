# Scribe's Journal

A record of critical learnings, terminology decisions, and architectural documentation patterns.

## Knowledge Graph

### 2026-02-12 - Payment Routing Logic
Insight: `PaymentFactory.getProvider()` automatically routes transactions > 500,000 IQD to `ZainDirectAdapter`. However, `ZainDirectAdapter` is currently a stub implementation that throws "Not Implemented". This creates a runtime trap for high-value transactions.
Rule: Always check transaction amount logic in `PaymentFactory` before implementing new payment flows. High-value transactions are currently unsupported.

## Style Guide

(No entries yet)

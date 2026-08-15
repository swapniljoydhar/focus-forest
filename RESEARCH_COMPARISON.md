# Focus Forest — Bounded Open-Source Comparison

This comparison informed patterns only. Focus Forest did not import code, dependencies, assets, permissions, AI behavior, or interaction rules from these projects.

| Project | Direct evidence | Pattern worth learning | Pattern intentionally rejected |
|---|---|---|---|
| [initialshl/history-tree](https://github.com/initialshl/history-tree) | MIT-licensed Chrome extension described as showing browsing history in a tree view; repository has a small `src/` structure and 16 commits. | A focused tree view can be a complete extension surface without a large framework. | Its public description does not establish Focus Forest’s mission semantics, local-first limits, or gentle intervention model. |
| [Katee/galaxy-tab](https://github.com/Katee/galaxy-tab) | Chrome history graph where dots represent pages and connections are created from visit relationships; README explicitly notes that new-tab links were a known connection problem. | Relationship graphs need visible topology and honest handling of uncertain relationships; the known issue reinforces the need for Focus Forest’s deterministic tab-inference rules. | Force-like graph presentation and disconnected-node behavior are a poor fit for a calm rooted garden and can reproduce the sparse/ambiguous visual problem seen in the recording. |
| [Nahid-mahmud555/focus-pilot-pro-official](https://github.com/Nahid-mahmud555/focus-pilot-pro-official) | Manifest V3 browser focus project emphasizing active in-context interventions, state preservation, live runtime updates, and a browser-native UI layer. | Preserve runtime state across popup/page transitions and keep interventions in context with the current workflow. | Its active enforcement, timers, loud alerts, and future AI-oriented roadmap conflict with Focus Forest’s non-blocking, no-AI, no-shame, low-distraction requirements. |

## Resulting decisions

The redesign adopts only three compatible ideas: compact native extension surfaces, explicit parent/child topology, and durable local session state. It keeps Focus Forest’s unique constraints: navigation-only deterministic signals, bounded local storage, no page-content interpretation, no telemetry, no network, no AI, no external assets, and reversible recovery actions.

# Taste

**A recommendation should remember the reason—not just the rating.**

Personal recommendation prototype built around Jerry's library and preferences.
No public demo is currently available.

Taste is a local-first movie, manga, book, music, and creator map. It uses the exact reason a work mattered—grounded struggle, singular form, moral clarity, or a failed expectation—to choose what deserves attention next.

## What it does

- Turns a 3,199-work library into three starting points instead of another endless shelf.
- Connects works through 202 cited person-to-work paths, keeping direct choices separate from editorial inference.
- Records Started, Finished, Dropped, and Saved reactions in the browser and reranks immediately.
- Explains every recommendation with its strongest reason, risk, and source trail.
- Runs a 51-song, one-at-a-time music calibration where listening history creates only a prediction and Jerry's Love / Like / Not for me / Unsure tap becomes the rating.

## Why it exists

Most recommendation systems remember that two titles were clicked. Taste remembers **why one landed and the other did not**. That distinction is the product.

The interface is deliberately quiet: artwork supplies the color, the first screen stays small, and the larger archive appears only when searched.

## Public extraction boundary

This repository is a reviewed mirror of the files from the former public Taste deployment. It is not a mirror of the private `shishi88` monorepo.

Excluded on purpose:

- journals and personal notes;
- raw imports and private feedback exports;
- internal research and deployment history;
- unrelated projects and the private repository's Git history;
- credentials and account-write code.

Browser reactions remain on the device unless the user explicitly exports them. The application source does not require an account and does not write to a server.

## Shape

```text
public, cited catalog
        ↓
deterministic ranker
        ↓
three explained choices
        ↓
device-local reaction → immediate rerank
```

The repository contains the static application and reviewed data files. It can
be served locally; reactions are stored on-device.

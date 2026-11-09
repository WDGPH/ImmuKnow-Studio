# ImmuKnow Studio

ImmuKnow Studio helps you develop immunization notice templates quickly. Edit
the wording, change the layout and branding, and see the result with fictional
example clients in your browser. Open [ImmuKnow Studio](https://immuknow.phiz.ca/)
and follow [Get started](getting-started.md).

This manual is being prepared for **Studio v0.1.0**. Studio and ImmuKnow have
separate version numbers; Studio v0.1.0 does not mean ImmuKnow v0.1.0.

## How Studio and ImmuKnow work together

[ImmuKnow](https://docs.phiz.ca/immuknow/) is the core engine. It reads and
validates client records, prepares the facts for a notice, and generates PDFs
with Typst on your local workstation. It also records findings and produces
reports for reviewing notices before delivery.

Studio is the browser workspace for developing those templates. It uses
ImmuKnow's templates, shared components and data format. Its ready-made controls
help you get started quickly, and its source editors support full Typst
functionality for more detailed work. Your templates are ordinary Typst files
with their supporting files and assets.

The usual workflow is:

1. Develop and review a template in Studio with fictional examples.
2. Open **Project** at the top-right of the webpage and choose
   **Download project**.
3. Extract the downloaded project on your workstation. Keep its templates,
   settings, images and other supporting files together.
4. Set up the project with `immuknow project sync`, check its fictional sample,
   then use `immuknow run` to generate production notices locally.

See [Use projects on your workstation](local-production.md) for the handoff.
Studio does not assess immunization status or select a client's notice.
Those decisions come from your source records and explicit choices in ImmuKnow.

## Your work stays on your device

Editing, previews, image imports, saved drafts and project downloads happen in
your local browser environment. Studio has no application backend server and
does not send your project or its data anywhere. Once its resources have loaded,
you can continue working offline in the open tab. See
[Privacy and offline use](privacy-offline.md) for loading, storage and backup
details.

## Find the right guide

| You want to… | Read |
| --- | --- |
| Change your first notice | [Get started](getting-started.md) |
| Understand editing, resets and saved drafts | [Editing, drafts and downloads](studio.md) |
| Generate notices for your own clients | [Use projects on your workstation](local-production.md) |
| Check where files and data go | [Privacy and offline use](privacy-offline.md) |
| Resolve a preview or import problem | [Troubleshooting](troubleshooting.md) |
| Build Studio or contribute a change | [Build and contribute](development.md) |
| Understand Core versions and project compatibility | [Architecture and compatibility](architecture.md) |

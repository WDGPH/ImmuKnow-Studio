# Privacy and offline use

Studio runs in your local browser environment. The editor, Typst compiler,
preview renderer, draft storage, ZIP import and project download all run on
your device. There is no application backend server. Studio does not upload
your templates, imported files, images, drafts or notice data, and does not send
them to a remote service for compilation.

## What needs a connection?

When you first open the hosted webpage, your browser downloads the static
application, compiler, fonts and prepared fictional examples. Those requests
retrieve application files; they do not carry your project contents. Following
an external help, GitHub or other link opens that destination as usual.

Once the application and its resources have finished loading, you can continue
editing, previewing, saving a browser draft and downloading your project
offline in the open tab. Wait for the first preview before disconnecting.

Reloading, reopening the site or restarting the compiler can require application
files again. Browser caching is not a guaranteed offline installation. For
planned offline work, load Studio before disconnecting and keep the tab open,
or have your technical team serve a prepared static build on your own computer.
The local file server only serves application files; it is not a backend that
receives project data. See [Build and contribute](development.md#run-locally).

## Where does the draft live?

Studio stores the draft in this browser's local site storage. It includes your
edits, imported images and the project's starting files. It is separate for
each browser profile, device and site address. It is not an account, cloud
backup or synchronization service.

Wait for **Saved** before closing or reloading. If storage is unavailable or
full, the open project remains available to download. Private browsing, clearing
site data or browser storage cleanup can remove a draft. Download copies of
work you want to keep.

**Project → Clear saved draft** removes the stored draft while keeping the
open project available to download. Later edits save it again. For reset and
storage behaviour, see [Keep your work](studio.md#keep-your-work).

## Where do production records go?

Studio supplies fictional examples for template development. Production notice
generation happens with ImmuKnow core on your local workstation, using your
own input files. Studio does not require you to send real client records to a
website or service.

Downloaded ZIPs contain the selected project files and example inputs. Treat
your own imported assets and exported files according to their contents, and
keep production client records and generated notices in your approved local
workflow.

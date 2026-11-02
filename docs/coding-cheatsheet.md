<!-- Shared with Studio's offline Typst Reference. Keep this content as HTML
     so the manual and the dialog use the same examples without a Markdown parser. -->
<h1 id="coding-cheatsheet-title">Typst Reference</h1>
<p>Examples for editing ImmuKnow letters. Keep the opening
<code>#import "setup.typ": *</code> and <code>#show: immuknow.letter</code>
lines and the <code>@immuknow-settings</code> comment in <strong>Template</strong>
in place; they are essential setup. They provide the client information,
dates and page settings used below. Shared setup connects the selected client
once; the helpers already know whose information to display.</p>

<div class="coding-cheatsheet-grid">
<section>
<h2>Write and format</h2>
<pre><code>*Important* and _emphasized_ words.

A blank line starts a new paragraph.
#text(size: 12pt, fill: heading-color)[Please reply.]
#v(0.3cm)
#align(center)[Thank you.]</code></pre>
<p><code>#</code> starts code in ordinary text; <code>[…]</code> contains text
inside code. Inside a function's parentheses, another function needs no
<code>#</code>. Use <code>//</code> for a comment, <code>\@</code> for a literal
at sign, and <code>\#</code> for a literal hash.</p>
</section>

<section>
<h2>Client information</h2>
<pre><code>Record: #notice.client_id
As of #date_as_of

#if over_16 == true [
  Please update your record.
] else if over_16 == false [
  Please update your child's record.
] else [
  Please update the named client's record.
]</code></pre>
<p><code>over_16</code> is supplied by setup: true for age 16 or older, false
for younger clients. <code>notice</code> contains the other client information.
Age can be unknown, so the final <code>else</code> uses neutral wording.
Use the Example client arrows to try the letter with different clients.</p>
</section>

<section>
<h2>Pages and headings</h2>
<pre><code>#immuknow.notice-page("Immunization Record")[
  For your reference:
  #immuknow.immunization-history()
]</code></pre>
<p><code>immuknow.notice-page</code> starts a new page with a heading and warns if the
content runs onto another page. Add <code>allow-overflow: true</code> when you
want to allow extra pages. <code>immuknow.immunization-history()</code> places the history
table using your Settings choices. To change just this table, pass an option
such as <code>#immuknow.immunization-history(show-age: true, font-size: 12pt)</code>.
Page options work the same way, for example
<code>#immuknow.notice-page("Immunization Record", title-size: 18pt)[...]</code>.
These choices leave other calls unchanged.</p>
</section>

<section>
<h2>Address, overdue list and QR code</h2>
<pre><code>#immuknow.client-block(window: envelope-window)
#immuknow.overdue-diseases(columns: 1)
#immuknow.qr-code(..qr)</code></pre>
<p>Use <code>overdue-agents</code> for the vaccine agent list.
Bullet indentation defaults to 0.8cm; set <code>indent: 1cm</code> on the helper
to change just that list.
These functions display the client's information; their options control how
it looks. Add <code>font-size: 11pt</code> or <code>details: "below"</code>
to a client block when you want to change its defaults. Omit the QR call when
the letter does not use a QR code. <code>..qr</code> uses the group of QR options defined in Settings.
Review <strong>Findings</strong> for any warnings about the letter.</p>
</section>

<section>
<h2>Signature image and printed name</h2>
<pre><code>#immuknow.signature-block(
  signature: image("assets/signature.png", width: 4.5cm),
  name: "Dr. Annie Body, MD",
  title: "Medical Officer of Health",
)</code></pre>
<p>For a smaller signature, change <code>width: 4.5cm</code> to
<code>width: 3cm</code>. Leave height out to preserve the image's aspect ratio.
The filename, size and printed name are visible in the Template. Theme can
change the image and printed name without changing its width. In a suspension
order, <code>order-signatory-name</code> controls the name in the legal wording
separately from credentials printed below the signature.</p>
</section>

<section>
<h2>Links and reusable text</h2>
<pre><code>#let reply-line(deadline) = [
  Please reply by *#deadline*.
]
#reply-line("March 2")
#immuknow.link("https://example.org/immunization")[Update your record]</code></pre>
<p><code>#let</code> defines a value or a function you can use again.
Use <code>immuknow.link</code> to include a link in ImmuKnow's checks.
To put a client ID in a web address, use
<code>immuknow.query-url(base, (client: notice.client_id))</code>, where
<code>base</code> is your website address. It handles special characters in
the ID for you.</p>
</section>

<section>
<h2>Editor shortcuts</h2>
<p>Press <strong>Ctrl+Space</strong> for suggestions; use the arrow keys and
<strong>Enter</strong> to choose one, or <strong>Escape</strong> to dismiss.
Hover over a supported function for its options and an example.</p>
<p><strong>Ctrl+/</strong> comments selected lines;
<strong>Ctrl+[</strong> and <strong>Ctrl+]</strong> change indentation.
On a Mac, use <strong>Command</strong> for these editing shortcuts; suggestions
still use <strong>Ctrl+Space</strong>.</p>
<p>Try short and long examples, review every page and read Findings.
Double-click preview text to locate its source when available.</p>
</section>
</div>

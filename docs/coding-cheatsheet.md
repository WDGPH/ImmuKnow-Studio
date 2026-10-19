<!-- Shared with Studio's offline coding cheat sheet. Keep this content as HTML
     so the manual and the dialog use the same examples without a Markdown parser. -->
<h1 id="coding-cheatsheet-title">Typst and ImmuKnow coding cheat sheet</h1>
<p>Use these patterns in <strong>Template</strong> with the supplied Settings import
and <code>#show: notice-style</code>. Keep those opening lines: Settings supplies
the prepared <code>notice</code>, dates and helpers used below.</p>

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
<h2>Use client facts and wording</h2>
<pre><code>Record: #notice.client_id
As of #date_as_of

#if notice.client_data.over_16 == true [
  Please update your record.
] else if notice.client_data.over_16 == false [
  Please update your child's record.
] else [
  Please update the named client's record.
]</code></pre>
<p>Age can be unknown. Keep neutral wording in the last branch. The example
arrows switch prepared facts; edit the letter's wording around those facts.</p>
</section>

<section>
<h2>Build a checked page</h2>
<pre><code>#notice-page("Immunization Record")[
  For your reference:
  #immunization-history()
]</code></pre>
<p><code>notice-page</code> starts a fresh page with the standard heading and
reports unexpected continuation. Use <code>allow-overflow: true</code> only when
continuation is intended. The local <code>immunization-history()</code> helper
uses your Settings choices. Call it where the table should appear.</p>
</section>

<section>
<h2>Place ImmuKnow components</h2>
<pre><code>#immuknow.client-block(notice,
  window: envelope-window, details: "below")
#immuknow.overdue-diseases(notice,
  labels: presentation.selected-labels())
#immuknow.qr-code(notice, ..qr)</code></pre>
<p>Use <code>overdue-agents</code> for the agent notice. Keep
<code>notice</code> as supplied; helper options change its display.
<code>..qr</code> passes the named options from the <code>qr</code> dictionary.
Shared <code>immuknow</code> components also record findings for review.</p>
</section>

<section>
<h2>Make links and reusable wording</h2>
<pre><code>#let reply-line(deadline) = [
  Please reply by *#deadline*.
]
#reply-line("March 2")
#immuknow.notice-link(records-url)[Update your record]</code></pre>
<p><code>#let</code> defines a value or helper. Use
<code>immuknow.notice-link</code> for links included in notice checks. For a
client-specific URL, <code>immuknow.query-url(base, (client: notice.client_id))</code>
encodes raw query values once.</p>
</section>

<section>
<h2>Find help while editing</h2>
<p>Press <strong>Ctrl+Space</strong> for suggestions; use the arrow keys and
<strong>Enter</strong> to choose one, or <strong>Escape</strong> to dismiss.
Hover over a supported function for its arguments and an example.</p>
<p><strong>Ctrl+/</strong> comments selected lines;
<strong>Ctrl+[</strong> and <strong>Ctrl+]</strong> change indentation.
On a Mac, use <strong>Command</strong> for these editing shortcuts; suggestions
still use <strong>Ctrl+Space</strong>.</p>
<p>Try short and long examples, review every page and read Findings.
Double-click preview text to locate its source when available.</p>
</section>
</div>

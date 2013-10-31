Maintenance System for comp.lang.javascript FAQ
===============================================

This is in very early development.  Right now, all it does is convert the 
individual Markdown files in `faq-src/10` to individual files in `output/10`.
Plans include adding TOC files, and an all-in-one version of this output, and
to write an auto-poster for daily posting of FAQ content in c.l.js.  And of
course we need to handle all the content.

Installation
------------

     cd converter
     npm install
     node lib/convert

The output will go in files in `output/10`.

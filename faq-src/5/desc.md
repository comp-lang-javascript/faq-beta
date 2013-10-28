Dates
=====

ISO 8601 defines date and time formats. Some benefits include:

 * language-independent and unambiguous world-wide
 * sortable with a trivial string comparison
 * easily readable and writable by software
 * compatible with standards ISO 9075 and rfc 3339
 * The ISO Extended format for common date is `YYYY-MM-DD`, and for time
   is hh:mm:ss.

For an event with an offset from UTC, use `YYYY-MM-DDThh:mm:ss±hh:mm`.

Never use a local date/time format for a non-local event. Instead, use 
UTC, as in `YYYY-MM-DDThh:mm:ssZ` (`Z` is the only letter suffix).

The `T` can be omitted where that would not cause ambiguity. For rfc 
3339 compliance, it may be replaced by a space and for SQL, it must be
replaced by a single space.

Year `0000` is unrecognized by some formats (XML Schema, xs:date).

----

 * [ECMA-262 Date.prototype, s. 15.9][1]
 * [A summary of the international standard date and time notation, 
    by Markus Kuhn][2]
 * <http://en.wikipedia.org/wiki/ISO_8601>
 * [ISO 8601:2004(E)][3]
 * [W3C QA Tip: Use international date format (ISO)][4]
 * [RFC 3339, Date and Time on the Internet: Timestamps][5]
 * <http://www.w3.org/TR/xmlschema-2/#dateTime>

 
  [1]: http://www.jibbering.com/faq/#onlineResources
  [2]: http://www.cl.cam.ac.uk/~mgk25/iso-time.html
  [3]: http://www.jibbering.com/faq/res/ISO_8601-2004_E.pdf
  [4]: http://www.w3.org/QA/Tips/iso-date
  [5]: http://www.ietf.org/rfc/rfc3339.txt
var Q = require("q");
var FS = require("fs");
var marked = require("marked");
var ncp = require('ncp').ncp;
var faqs = {};

["readFile", "writeFile", "readdir", "mkdir"].forEach(function(name) {
    this[name] = Q.denodeify(FS[name]);
});

var header, footer;
var inputFolder = "../faq-src";
var outputFolder = "../output";
var resourceFolder = "../resources";
var templateFolder = "../templates";

marked.setOptions({
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: false,
    langPrefix: 'lang-'
});

var combineHtml = function(header, body, footer) {
    var match = body.match(/.*<h1>([^<]+)<\/h1>.*/);
    var title = match && match[1] || "comp.lang.javascript FAQ";

    return header.replace(/\$\{title\}/g, title)
                 .replace(/\$\{pathToRoot\}/g, "../") +
           body +
           footer;
};

var handleInputFile = function(chapter, file, chapterStore) {
    return readFile(inputFolder + "/" + chapter + "/" +  file, "utf-8")
    .then(function(data) {
        return Q.nfcall(marked, data, marked.defaults);
    }).then(function(content) {
        var section = file.replace(/\.md$/, "");
        var match = content.match(/<h1[^>]*>(.*)<\/h1>/);
        var title = match && match[1] || "Unknown Title";
        chapterStore[section] = {
            chapter: chapter,
            section: section,
            title: title,
            content: content
        };
    });
};

var readChapterFolder = function(chapter) {
    faqs[chapter] = {};
    return readdir(inputFolder + "/" + chapter)
    .then(function(files) {
        return Q.all(files.map(function(file) {
            return handleInputFile(chapter, file, faqs[chapter]);
        }));
    });
};

var writeFaqFile = function(config) {
    var outputFile = outputFolder + "/" + config.chapter + "/" + config.section + ".html";
    return writeFile(outputFile, combineHtml(header, config.content, footer))
    .then(function() {
        console.log("Wrote " + outputFile);
    });
};

var writeChapterFolder = function(chapterName) {
    var chapter = faqs[chapterName];
    var chapterFolder = outputFolder + "/" + chapterName;
    return FS.exists(chapterFolder, function(exists) {
        return (exists ? Q.fcall(function() {return exists}) :  mkdir(chapterFolder))
        .then(function() {
            return Q.all(Object.keys(chapter).map(function(file) {return writeFaqFile(chapter[file]);}));
        });
    });

};

FS.exists(outputFolder, function(exists) {
    return Q.all([
        readFile(templateFolder + "/entry/header.html", "utf-8")
        .then(function(content) {header = content;}),
        readFile(templateFolder + "/entry/footer.html", "utf-8")
        .then(function(content) {footer = content;})
    ])
    .then(exists ? Q.fcall(function() {return exists}) : mkdir(outputFolder))
    .then(Q.nfcall(ncp, resourceFolder, outputFolder))
    .then(function() {
        return readdir(inputFolder)
    })
    .then(function(chapters) {
        return Q.all(chapters.map(readChapterFolder));
    }).then(function() {
        // console.log(JSON.stringify(faqs, null, 4));
        return Q.all(Object.keys(faqs).map(writeChapterFolder))
    }).fail(function(err) {
        console.log("Could not process FAQ documents.");
        console.log(err);
        process.exit(999);
    });
});

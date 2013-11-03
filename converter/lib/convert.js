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

var combineHtml = function(config) {
    return header.replace(/\$\{title\}/g, config.title).replace(/\$\{pathToRoot\}/g, "../") +
            config.content + footer;
};

var numeric = function(a, b) {
    return a.substring(a.indexOf(".") + 1) - b.substring(b.indexOf(".") + 1);
};

var makeChapterToc = function(config) {
    var chapter = faqs[config.chapter];
    var toc = ["<ul class='toc'>"];
    Object.keys(chapter).filter(indexFilter(false)).sort(numeric).forEach(function(file) {
        toc.push("    <li><span class='sectionNbr'>" + file + "</span> <a href='" + file + ".html'>" + chapter[file].title + "</a></li>");
    });
    toc.push("</ul>");
    return toc.join("\n");
};

var writeChapterIndex = function(config) {
    return header.replace(/\$\{title\}/g, config.chapter + " " + config.title).replace(/\$\{pathToRoot\}/g, "../") +
            config.content.replace(/.*<h1>([^<]+)<\/h1>.*/, "<h1>" + config.chapter + ". $1</h1>") +
            "<hr />" + makeChapterToc(config) + footer;
};

var handleInputFile = function(chapter, file, chapterStore) {
    return readFile(inputFolder + "/" + chapter + "/" +  file, "utf-8")
    .then(function(data) {
        return Q.nfcall(marked, data, marked.defaults);
    })
    .then(function(content) {
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

var writeFaqFile = function(config, fileBuilder) {
    var outputFile = outputFolder + "/" + config.chapter + "/" + config.section + ".html";
    return writeFile(outputFile, fileBuilder(config))
    .then(function() {
        console.log("Wrote " + outputFile);
    });
};

var indexFilter = function(include) {
    return function(item) {
        return include ? (item === "index") : (item !== "index");
    };
};

var writeChapterFolder = function(chapterName) {
    var chapter = faqs[chapterName];
    var chapterFolder = outputFolder + "/" + chapterName;
    return FS.exists(chapterFolder, function(exists) {
        return (exists ? Q.fcall(function() {return exists}) :  mkdir(chapterFolder))
        .then(function() {
            var keys = Object.keys(chapter);
            return Q.all(keys.filter(indexFilter(false)).map(function(file) {
                return writeFaqFile(chapter[file], combineHtml);
            }).concat(keys.filter(indexFilter(true)).map(function(file) {
                return writeFaqFile(chapter[file], writeChapterIndex);
            })));
        });
    });
};

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
    })
    .then(function() {
        return Q.all(Object.keys(faqs).map(writeChapterFolder))
    })
    .fail(function(err) {
        console.log("Could not process FAQ documents.");
        console.log(err);
        process.exit(999);
    });
});

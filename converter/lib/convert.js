var Q = require("q");
var FS = require("fs");
var marked = require("marked");
var ncp = require('ncp').ncp;

["readFile", "writeFile", "readdir", "mkdir"].forEach(function(name) {this[name] = Q.denodeify(FS[name]);});

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
                 .replace(/\$\{pathToRoot\}/g, "../") + // TODO: this might have to be updated if we're nested.
           body +
           footer;
};

var handleFile = function(chapter, file) {
    var outputFile;
    return readFile(inputFolder + "/" + chapter + "/" +  file, "utf-8")
    .then(function(data) {
        return Q.nfcall(marked, data, marked.defaults);
    }).then(function(content) {
        outputFile = outputFolder + "/" + chapter + "/" + file.replace(/md$/, "html")
        return writeFile(outputFile, combineHtml(header, content, footer))
    }).then(function() {
        console.log("Wrote " + outputFile);
    });
};

var makeChapterFolder = function(chapter) {
    var chapterFolder = outputFolder + "/" + chapter;
    return FS.exists(chapterFolder, function(exists) {
        return (exists ? Q.fcall(function() {return exists}) :  mkdir(chapterFolder))
        .then(function() {
            return readdir(inputFolder + "/" + chapter);
        })
        .then(function(files) {
            files.forEach(function(file) {
                handleFile(chapter, file);
            });
        });
    });
};

FS.exists(outputFolder, function(exists) {
    return Q.all([
        readFile(templateFolder + "/entry/header.html", "utf-8").then(function(content) {header = content;}),
        readFile(templateFolder + "/entry/footer.html", "utf-8").then(function(content) {footer = content;})
    ])
    .then(exists ? Q.fcall(function() {return exists}) : mkdir(outputFolder))
    .then(Q.nfcall(ncp, resourceFolder, outputFolder))
    .then(function() {
        return readdir(inputFolder)
    })
    .then(function(chapters) {
        chapters.forEach(function(chapter) {
            makeChapterFolder(chapter);
        });
    }).fail(function(err) {
        console.log("Could not process FAQ documents.");
        console.log(err);
        process.exit(999);
    });
});

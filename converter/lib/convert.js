var Q = require("q");
var FS = require("fs");
var marked = require("marked");
var ncp = require('ncp').ncp;

// Convert Node callback APIs to Q promise ones.
var readFile = Q.denodeify(FS.readFile);
var writeFile = Q.denodeify(FS.writeFile);
var readdir = Q.denodeify(FS.readdir);
var mkdir = Q.denodeify(FS.mkdir);
var exists = function(path) { // Doesn't behave like other FS.xyz functions...
    var dfd = Q.defer();
    FS.exists(path, dfd.resolve);
    return dfd.promise;
};

var faqs = {};
var entryHeader, entryFooter, chapterHeader, chapterFooter,
    tocHeader, tocFooter, indexHeader, indexFooter;
var inputFolder = "../faq-src";
var outputFolder = "../output";
var resourceFolder = "../resources";
var templateFolder = "../templates";

var indexFilter = function(include) {
    return function(item) {
        return include ? (item === "index") : (item !== "index");
    };
};

var numeric = function(a, b) {
    return a.substring(a.indexOf(".") + 1) - b.substring(b.indexOf(".") + 1);
};

var combineHtml = function(config) {
    return entryHeader.replace(/\$\{title\}/g, config.title)
            .replace(/\$\{pathToRoot\}/g, "../") +
            config.content + entryFooter;
};

var makeChapterToc = function(config, linkBuilder) {
    var chapter = faqs[config.chapter];
    var toc = ["<ul class='toc'>"];
    Object.keys(chapter).filter(indexFilter(false)).sort(numeric)
        .forEach(function(file) {
            toc.push("  <li><span class='sectionNbr'>" + file +
                "</span> <a href='" + linkBuilder(file) + "'>" +
                chapter[file].title + "</a></li>");
    });
    toc.push("</ul>");
    return toc.join("\n");
};

var writeChapterIndex = function(config) {
    var hasLeader = config.content.replace(/\n/, "").match(/.*<h1>([^<]+)<\/h1>(\W)*/);
    return chapterHeader.replace(/\$\{title\}/g, config.chapter + " " +
            config.title).replace(/\$\{pathToRoot\}/g, "../") +
            config.content.replace(/.*<h1>([^<]+)<\/h1>.*/, "  <h1>" +
            config.chapter + ". $1</h1>") + (hasLeader[2] ? "  <hr/>\n" : "") + "  " +
            makeChapterToc(config, function(type, file) {return file + ".html";})
                .split("\n").join("\n  ") + "\n" + chapterFooter;
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
    var outputFile = outputFolder + "/" + config.chapter + "/" +
            config.section + ".html";
    return writeFile(outputFile, fileBuilder(config))
    .then(function() {
        console.log("Wrote " + outputFile);
    });
};

var writeChapterFolder = function(chapterName) {
    var chapter = faqs[chapterName];
    var chapterFolder = outputFolder + "/" + chapterName;
    return exists(chapterFolder)
    .then(function(chapterFolderExists) {
        return (chapterFolderExists ? Q(chapterFolderExists)
                                    : mkdir(chapterFolder));
    })
    .then(function() {
        var keys = Object.keys(chapter);
        return Q.all(keys.filter(indexFilter(false)).map(function(file) {
            return writeFaqFile(chapter[file], combineHtml);
        }).concat(keys.filter(indexFilter(true)).map(function(file) {
            return writeFaqFile(chapter[file], writeChapterIndex);
        })));
    });
};

var writeMainToc = function() {
    var toc = ["<ul class='toc'>"];
    Object.keys(faqs).sort(numeric).forEach(function(chapter) {
        var linkBuilder = function(file) {return chapter + "/" + file + ".html";};
        toc.push("  <li>");
        toc.push("    <span class='sectionNbr'>" + chapter +
                "</span> <a href='" + chapter + "/" + "index.html'>" +
                faqs[chapter].index.title + "</a>");
        toc.push("    " + makeChapterToc(faqs[chapter].index, linkBuilder)
                .split("\n").join("\n      "));
        toc.push("  </li>");
    });
    toc.push("</ul>");
    var result = tocHeader.replace(/\$\{pathToRoot\}/g, "") + "  " +
            toc.join("\n  ") + "\n" + tocFooter;
    var outputFile = outputFolder + "/faq.html";
    return writeFile(outputFile, result)
    .then(function() {
        console.log("Wrote " + outputFile);
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

exists(outputFolder)
.then(function(outputFolderExists) {
    return outputFolderExists ? Q(outputFolderExists) : mkdir(outputFolder);
})
.then(function() {
    return Q.all([
        readFile(templateFolder + "/entry/header.html", "utf-8")
        .then(function(content) {entryHeader = content;}),
        readFile(templateFolder + "/entry/footer.html", "utf-8")
        .then(function(content) {entryFooter = content;}),
        readFile(templateFolder + "/chapter/header.html", "utf-8")
        .then(function(content) {chapterHeader = content;}),
        readFile(templateFolder + "/chapter/footer.html", "utf-8")
        .then(function(content) {chapterFooter = content;}),
        readFile(templateFolder + "/toc/header.html", "utf-8")
        .then(function(content) {tocHeader = content;}),
        readFile(templateFolder + "/toc/footer.html", "utf-8")
        .then(function(content) {tocFooter = content;}),
        readFile(templateFolder + "/index/header.html", "utf-8")
        .then(function(content) {indexHeader = content;}),
        readFile(templateFolder + "/index/footer.html", "utf-8")
        .then(function(content) {indexFooter = content;})
    ])
})
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
.then(function() {
    return writeMainToc();
})
.fail(function(err) {
    console.log("Could not process FAQ documents.");
    console.log(err);
    process.exit(999);
});

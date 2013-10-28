var fs = require("fs");
var marked = require("marked");
var ncp = require('ncp').ncp;

var header, footer;
var chapter = "10";
var inputFolder = "../faq-src";
var outputFolder = "../output";
var resourceFolder = "../resources";

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

var handleFile = function(file) {
    fs.readFile(inputFolder + "/" + chapter + "/" +  file, "utf-8", function(err, data) {
        if (err) {
            console.log(err);
        } else {
            marked(data, marked.defaults, function(err, content) {
                if (err) {
                    console.log(err)
                } else {
                    var outputFile = outputFolder + "/" + chapter + "/" + file.replace(/md$/, "html")
                    fs.writeFile(outputFile, combineHtml(header, content, footer), function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("Wrote " + outputFile);
                        }
                    });
                }
            });
        }
    });
};

var handleChapter = function(chapter) {
    fs.readdir(inputFolder + "/" + chapter, function(err, files) {
        if (err) {
            console.log(err);
        } else {
            files.forEach(function(file) {
                handleFile(file);
            });
        }
    });
};

var makeChapterFolder = function(chapter) {
    var chapterFolder = outputFolder + "/" + chapter;
    fs.exists(chapterFolder, function(exists) {
       if (exists) {
           handleChapter(chapter);
       } else {
           fs.mkdir(chapterFolder, function(err) {
               if (err) {
                   console.log(err);
                   process.exit(130);
               } else {
                   handleChapter(chapter);
               }
           });
       }
    });
};

try {
    header = fs.readFileSync("../templates/entry/header.html", "utf-8");
    footer = fs.readFileSync("../templates/entry/footer.html", "utf-8");
} catch(e) {
    console.log(e);
    process.exit(100);
}

fs.exists(outputFolder, function(exists) {
    if (exists) {
        makeChapterFolder(chapter);
    } else {
        fs.mkdir(outputFolder, function(err) {
            ncp(resourceFolder, outputFolder, function (err) {
                if (err) {
                   console.error(err);
                    process.exit(110);
                }
            });

            if (err) {
                console.log(err);
                process.exit(120);
            } else {
                makeChapterFolder(chapter);
            }
        });
    }
});
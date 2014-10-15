var walk = require('walk')
    , fs = require('fs')
    , options
    , walker
    ;

var jade = require('jade');
var fse = require('fs-extra')


var options = {
    followLinks: false
};

walker = walk.walk("/home/productionServer/views", options);

walker.on("file", function (root, fileStats, next) {

    //console.log("fileStats", fileStats);
    // console.log("root", root);



    var jadeOptios = {
        filename: root + "/s/"
    };

    jade.render(jadeStr, jadeOptios, function (err, html) {
        if (err) throw err;

        var path = root.split("/home/productionServer/views")[1];

        var name = fileStats.name.split('.')[0];
        var filename = '/home/productionServer/html_views' + path + '/' + name + '.html';
        console.log("filename", filename);
        fs.writeFileSync(filename, html);


        next();
    });


    /* fs.readFile(fileStats.name, function () {
     // doStuff
     next();
     });*/
});


walker.on("errors", function (root, nodeStatsArray, next) {
    next();
});

walker.on("end", function () {
    console.log("all done");
});
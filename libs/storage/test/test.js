
var assert = require("assert");
var util = require("util");
var Storage = require("../storage");

var RECORDS = 50000;

var storage = new Storage(__dirname + "/db", 10);

var processed = 0;
util.print("\n# inserting...\n");
storage.open(function(err, res) {    
    var start = (new Date).getTime();
    for(var i=0; i<RECORDS; i++) {                
        storage.set("test"+i, "hello world"+i, function(err, res) {
            assert.ifError(err);
            util.print("processing " + (100.0 * processed / RECORDS).toFixed(2) + "% \r");
            if (++processed === RECORDS) {
                util.print("\nspeed " + (((new Date).getTime() - start) / RECORDS) + " ms per record\n");
                storage.close(function() {                    
                    process.emit("search");
                });                
            }
        });
    }
});


process.on("search", function() {
    var processed = 0;
    util.print("\n# searching...\n");
    storage.open(function(err, res) {
        var start = (new Date).getTime();
        for(var i=0; i<RECORDS; i++) {                
            storage.get("test"+i,function(err, res) {
                assert.ifError(err);                
                util.print("processing " + (100.0 * processed / RECORDS).toFixed(2) + "% \r");
                if (++processed === RECORDS) {
                    util.print("\nspeed " + (((new Date).getTime() - start) / RECORDS) + " ms per record\n");
                    storage.close(function() {                    
                        process.emit("remove");
                    });                
                }
            });
        }
    });    
});


process.on("remove", function() {
    var processed = 0;
    util.print("\n# removing...\n");
    storage.open(function(err, res) {
        var start = (new Date).getTime();
        for(var i=0; i<RECORDS; i++) {                
            storage.remove("test"+i,function(err, res) {
                assert.ifError(err);                
                util.print("processing " + (100.0 * processed / RECORDS).toFixed(2) + "% \r");
                if (++processed === RECORDS) {
                    util.print("\nspeed " + (((new Date).getTime() - start) / RECORDS) + " ms per record\n");
                    storage.close(function() {                    
                        process.emit("done");
                    });                
                }
            });
        }
    });    
});


process.on("done", function() {
    process.exit();
});

var path  = require("path");

var Server = require("../libs/server/server.js");
var Storage = require("../libs/storage/storage.js");

var Spooch = function(options) {
    var self = this;
        
    this.storage = new Storage
        (
            options.database.path,
            options.database.shards
        );
        
    this.server = new Server(options.server);
    this.server.addHandler(
            function(method, paths, params, data, cb) {

                switch(method) {
                    
                    case "GET":
                        if (!paths || paths.length !== 1) {
                            return cb( { "error": "incorrect input data" } );
                        }
                        
                        self.storage.get(paths[0], function(err, res) {
                           return cb(err, JSON.parse(res)) ;                        
                        });
                        
                        break;
                    
                    case "POST":
                        if (!paths || paths.length !== 1 || !data) {
                            return cb( { "error": "incorrect input data" } );                        
                        }
                        
                        self.storage.set(paths[0], JSON.stringify(data), function(err, res) {
                            return cb(err, {result: res}); 
                        })

                        break;
                    
                    case "DELETE":
                        if (!paths || paths.length !== 1) {
                            return cb( { "error": "incorrect input data" } );                        
                        }
                        
                        self.storage.remove(paths[0], function(err, res) {
                            return cb(err, {result: res});
                        })
                            
                        break;
                    
                    default:
                        return cb( { "error": "method is not supported" } );                        
                }
            }
        );    
}

Spooch.prototype.start = function() {
    this.server.start();
    this.storage.open(function() {});
}

Spooch.prototype.stop = function() {
    this.server.stop();
}

var options = require(path.normalize(__dirname + "/../conf/spooch.conf"));
var spooch = new Spooch(options);
spooch.start();
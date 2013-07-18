/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var fs = require("fs");
var path  = require("path");

var errors = require("./errors.js");
var Server = require("../libs/server/server.js");
var Storage = require("../libs/storage/storage.js");

var Spooch = function(options) {
    var self = this;

    this.storage = new Storage
        (
            options.database.path,
            options.database.shards
        );
        
        
    this.plugins = {};
    var list = fs.readdirSync(options.plugins.path);
    for(var i=0; i<list.length; i++) {
        this.plugins[list[i]] = require(options.plugins.path + "/" +  list[i]).Plugin();        
    }
    
    this.server = new Server(options.server);
    this.server.addHandler(
            function(method, paths, params, data, cb) {
                
                if (paths && paths.length > 0) {
                    if (self.plugins[paths[0]]) {
                        var name = paths.shift();
                        return self.plugins[name].onRequest(method, paths, params, data, cb);
                    }
                }
                
                switch(method) {
                    
                    case "GET":
                        if (!paths || paths.length !== 1) {
                            return cb(errors.BadRequest("incorrect input data"));
                        }
                        
                        self.storage.get(paths[0], function(err, res) {
                           return cb(err, JSON.parse(res)) ;                        
                        });
                        
                        break;
                    
                    case "POST":
                        if (!paths || paths.length !== 1 || !data) {
                            return cb(errors.BadRequest("incorrect input data"));                        
                        }
                        
                        self.storage.set(paths[0], JSON.stringify(data), function(err, res) {
                            return cb(err, {result: res}); 
                        })

                        break;
                    
                    case "DELETE":
                        if (!paths || paths.length !== 1) {
                            return cb(errors.BadRequest("incorrect input data"));                        
                        }
                        
                        self.storage.remove(paths[0], function(err, res) {
                            return cb(err, {result: res});
                        })
                            
                        break;
                    
                    default:
                        return cb(errors.NotImplemented("method is not supported"));                        
                }
            }
        );    
}

Spooch.prototype.start = function() {
    var self = this;    
    this.storage.open(function() {
        self.server.start();
        for(var plugin in self.plugins) {
            self.plugins[plugin].onStart(self.storage);
        }
    });
}

Spooch.prototype.stop = function() {
    var self = this;    
    this.storage.close(function() {
        self.storage.disconnect();
        for(var plugin in self.plugins) {
            self.plugins[plugin].onStop();
        }        
        self.server.stop();
    });
}

var options = require(path.normalize(__dirname + "/../conf/spooch.conf"));
var spooch = new Spooch(options);
spooch.start();
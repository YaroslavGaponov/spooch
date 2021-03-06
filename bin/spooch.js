/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var fs = require("fs");
var path  = require("path");

require("../libs/utils/inject.js");

var errors = require("./errors.js");
var Server = require("../libs/server/server.js");
var Storage = require("../libs/storage/storage.js");
var Logger = require("../libs/utils/logger.js");

var Spooch = function(options) {
    var self = this;

    this.logger = new Logger.Logger(options.logger.path, options.logger.level);
    
    this.storage =
        new Storage(options.database.path, options.database.shards)
            .inject("logger", this.logger);    
    
    this.plugins = {};
    var list = fs.readdirSync(options.plugins.path);
    for(var i=0; i<list.length; i++) {
        this.plugins[list[i]] =
            require(options.plugins.path + "/" +  list[i]).Plugin()
                .inject("logger", this.logger);        
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
                           if (err) return cb(err, null);
                           return cb(null, JSON.parse(res))
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
    self.logger.info("spooch is starting...");
    self.storage.open(function() {
        self.server.start();        
        self.logger.info("spooch plugins are starting...");
        for(var plugin in self.plugins) {
            if (self.plugins.hasOwnProperty(plugin)) {
                self.logger.info("spooch plugin [" + plugin + "] is starting...");
                self.plugins[plugin].onStart(self.storage);
            }
        }
    });
}

Spooch.prototype.stop = function() {
    var self = this;
    self.logger.info("spooch is stopping...");
    self.storage.close(function() {
        self.storage.disconnect();
        self.logger.info("spooch plugins are stopping...");
        for(var plugin in self.plugins) {
            if (self.plugins.hasOwnProperty(plugin)) {
                self.logger.info("spooch plugin [" + plugin + "] is stopping...");
                self.plugins[plugin].onStop();
            }
        }        
        self.server.stop();
    });
}

var options = require(path.normalize(__dirname + "/../conf/spooch.conf"));
var spooch = new Spooch(options);
spooch.start();


process.on("SIGHUP", function() {
    if (spooch) {
        spooch.stop();
        spooch = null;
    }
});

var http = require("http");
var url = require("url");
var qs = require("querystring");
var errors = require("./errors");

var Server = module.exports = function(options) {
    var self = this;

    this.options = options;

    var router = function(req_method, req_url, req_data, callback) {
        
        var u = url.parse(req_url);
        var paths = u.pathname.split('/'); paths.splice(0, 1);        
        var params = qs.parse(u.query);
        
        self.onRequest(req_method, paths, params, req_data, callback);
    }
    
    var handler = function(req, res) {
        var data = '';
        req.on('data', function (chunk) {
            data += chunk.toString();
        });    
        req.on('end', function () {
            var json = {};
            try {
                json = JSON.parse(data);
            } catch (e) {}
            router(req.method, req.url, json, function(error, result) {
                if (error) {
                    res.writeHead(500, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(error));
                } else {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(result));                    
                }
            });
        });            
    }
    
    this.server = http.createServer(handler);
}

Server.prototype.start = function() {
    this.server.listen(this.options.port, this.options.host);
    return this;
}

Server.prototype.stop = function() {
    this.server.close();
    return this;
}

Server.prototype.addHandler = function(handler) {
    this.onRequest = handler;
    return this;
}






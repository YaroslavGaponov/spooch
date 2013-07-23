/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var fs  = require("fs");
var path = require("path");
var cp = require("child_process");

var PID = {
    exists: function(pidfile, cb) {
        fs.exists(pidfile, cb);
    },
    save: function(pid, pidfile, cb) {
        fs.writeFile(pidfile, pid, cb);
    },
    load: function(pidfile, cb) {
        fs.readFile(pidfile, function(err, data) {
            if (err) return cb(err);
            return cb(null, parseInt(data));
        });
    },
    remove: function(pidfile, cb) {
        fs.unlink(pidfile, cb);
    }    
};

var Daemon = function(filename) {
    this._module = filename;
    this._pid = path.dirname(filename) + "/" +  path.basename(filename, path.extname(filename)) + ".pid";
}

Daemon.prototype.start = function() {
    var self = this;
    PID.exists(self._pid, function(found) {
        if (!found)  {           
            var p = cp.fork(self._module);
            PID.save(p.pid, self._pid, function() {
                console.log(self._module + " daemon started.");
                process.exit();
            });
        } else {
            console.log(self._module + "  daemon is already running.");
            process.exit();
        }
    });
}

Daemon.prototype.stop = function() {
    var self = this;
    PID.exists(self._pid, function(found) {
        if (found) { 
            PID.load(self._pid, function(err, pid) {
                if (!err && pid) {
                    process.kill(pid, 'SIGHUP');
                    PID.remove(self._pid,  function() {
                        console.log(self._module + " daemon stopped.");
                        process.exit();
                    });
                } else {
                    console.log(self._module + " daemon is not stopped.");
                    process.exit();
                }
            });
        } else {
            console.log(self._module + "  daemon is not running.");
            process.exit();
        }
    });
}

module.exports = function(filename) {
    return new Daemon(filename);
}


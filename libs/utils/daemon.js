/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var fs  = require("fs");
var path = require("path");
var cp = require("child_process");

var Daemon = function(filename) {
    this._module = filename;
    this._pidfile = path.dirname(filename) + "/" +  path.basename(filename, path.extname(filename)) + ".pid";
}

Daemon.prototype.start = function() {
    var self = this;
    fs.exists(self._pidfile, function(found) {
        if (!found)  {           
            var p = cp.fork(self._module);
            Daemon.pid_save(p.pid, self._pidfile, function() {
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
    fs.exists(self._pidfile, function(found) {
        if (found) { 
            Daemon.pid_load(self._pidfile, function(err, pid) {
                if (!err && pid) {
                    process.kill(pid, 'SIGHUP');
                    Daemon.pid_remove(self._pidfile,  function() {
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

Daemon.pid_save = function(pid, pidfile, cb) {
    fs.writeFile(pidfile, pid, cb);
}

Daemon.pid_load = function(pidfile, cb) {
    fs.readFile(pidfile, function(err, data) {
        if (err) return cb(err);
        return cb(null, parseInt(data));
    });
}

Daemon.pid_remove = function(pidfile, cb) {
    fs.unlink(pidfile, cb);
}


module.exports = function(filename) {
    return new Daemon(filename);
}



var fs = require("fs");
var util = require("util");

var HEADER = { NEXT_OFFSET: 0, KEY_LENGTH_OFFSET: 4, VALUE_LENGTH_OFFSET: 8, SIZE: 12 };
var EOL = 0xFFFFFFFF;
var TABLE_ELEMETS = 1024;
var TABLE_SIZE = TABLE_ELEMETS << 2;


var Comparator = {
    MORE: 1, LESS: -1, EQUAL:  0,    
    compare:
        function(a, b) {
            if (a > b) return this.MORE;
            if (a < b) return this.LESS;
            return this.EQUAL;
        }
}


var Cache = function(limit) {
    this.cache = {};
    this.potential = {};
    this.limit = limit || 1024;
    this.size = 0;
}

Cache.prototype.clear = function() {
    this.cache = {};
    this.potential = {};
    this.size = 0;
}

Cache.prototype.add = function(key, value) {
    var pot = 0;
    if (this.size > this.limit) {
        while (( this.size >> 1 ) > this.limit) {
            for(var k in this.potential) {
                if (this.potential[k] < pot) {
                    this.remove(k);
                }
            }
            pot++;
        }        
        for(var k in this.cache) {
            this.potential[k] = 0;
        }                    
    }

    this.cache[key] = value;
    this.potential[key] = 0;        
}

Cache.prototype.remove = function(key) {
    delete this.cache[key];
    delete this.potential[key];
    this.size--;
}

Cache.prototype.get = function(key) {
    if (this.potential[key]) {
        this.potential[key]++;
    }
    return this.cache[key];
}



var Driver = module.exports = function(filename) {
    this.filename = filename; 
}

Driver.prototype.open = function() {
    this.cache = new Cache();
    var exists = fs.existsSync(this.filename);    
    if (exists) {
        this.fd = fs.openSync(this.filename, "r+");
        this.eof = fs.fstatSync(this.fd).size;
    } else {
        this.fd = fs.openSync(this.filename, "w+");
        var table = new Buffer(TABLE_SIZE); table.fill(0xFF);
        this.eof = fs.writeSync(this.fd, table, 0, TABLE_SIZE, 0);        
    }   
}

Driver.prototype.close = function() {
    this.cache = null;
    fs.closeSync(this.fd);
}

Driver.prototype.set = function(key, value) {
    
    key = Driver.stringify(key);
    value = Driver.stringify(value);
        
    var index = Driver.hashCode(key) % TABLE_ELEMETS;
    var o = new Buffer(4);
    fs.readSync(this.fd, o, 0, o.length, index << 2);
    var offset = o.readUInt32BE(0);
    
    var pred_offset = null;

    var record_header = new Buffer(HEADER.SIZE);
    record_header.writeUInt32BE(EOL, HEADER.NEXT_OFFSET);

    while(offset != EOL) {
        fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
        var curr_key_size = record_header.readUInt32BE(HEADER.KEY_LENGTH_OFFSET);
        var curr_key = new Buffer(curr_key_size);
        fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + HEADER.SIZE);
        if (Comparator.compare(key, curr_key) === Comparator.EQUAL) {
            offset = record_header.readUInt32BE(HEADER.NEXT_OFFSET);
            break;            
        } else if (Comparator.compare(key, curr_key) === Comparator.LESS) {
            pred_offset = offset;
            offset = record_header.readUInt32BE(HEADER.NEXT_OFFSET);
        } else if (Comparator.compare(key, curr_key) === Comparator.MORE) {
            break;
        }
    }
    
    var newRecord = new Buffer(HEADER.SIZE + key.length + value.length);
    newRecord.writeUInt32BE(offset, HEADER.NEXT_OFFSET);
    newRecord.writeUInt32BE(key.length, HEADER.KEY_LENGTH_OFFSET);
    newRecord.writeUInt32BE(value.length, HEADER.VALUE_LENGTH_OFFSET);
    newRecord.write(key, HEADER.SIZE);
    newRecord.write(value, HEADER.SIZE + key.length);
    
    var bytes = fs.writeSync(this.fd, newRecord, 0, newRecord.length, this.eof);

    if (pred_offset) {
        var o = new Buffer(4);
        o.writeUInt32BE(this.eof, 0);
        fs.writeSync(this.fd, o, 0, o.length, pred_offset);
    } else {
        var o = new Buffer(4);
        o.writeUInt32BE(this.eof, 0);
        fs.writeSync(this.fd, o, 0, o.length, index << 2);
    }
    
    this.eof += bytes;

    if (this.cache) {
        this.cache.add(key, value);
    }
    
    return true;
}


Driver.prototype.get = function(key) {
    
    key = Driver.stringify(key);
    
    if (this.cache) {
        if (this.cache.get(key)) {
            return this.cache.get(key);    
        }
    }
    
    var index = Driver.hashCode(key) % TABLE_ELEMETS;
    var o = new Buffer(4);
    fs.readSync(this.fd, o, 0, o.length, index << 2);
    var offset = o.readUInt32BE(0);

    var record_header = new Buffer(HEADER.SIZE); 
    
    while(offset != EOL) {        
        fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
        var curr_key_size = record_header.readUInt32BE(HEADER.KEY_LENGTH_OFFSET);
        var curr_key = new Buffer(curr_key_size);
        fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + HEADER.SIZE);                
        if (Comparator.compare(key, curr_key) === Comparator.EQUAL) {
            var curr_value_size = record_header.readUInt32BE(HEADER.VALUE_LENGTH_OFFSET);
            var curr_value = new Buffer(curr_value_size);
            fs.readSync(this.fd, curr_value, 0, curr_value_size, offset + HEADER.SIZE + curr_key_size);
            return curr_value.toString();
        } else if (Comparator.compare(key, curr_key) === Comparator.LESS) {
            offset = record_header.readUInt32BE(HEADER.NEXT_OFFSET);
        } else if (Comparator.compare(key, curr_key) === Comparator.MORE) {
            return null;
        }
    }
    
    return null;
}

Driver.prototype.remove = function(key) {
    
    key = Driver.stringify(key);
        
    var index = Driver.hashCode(key) % TABLE_ELEMETS;
    var o = new Buffer(4);
    fs.readSync(this.fd, o, 0, o.length, index << 2);
    var offset = o.readUInt32BE(0);
    
    var pred_offset = null;

    var record_header = new Buffer(HEADER.SIZE);
    record_header.writeUInt32BE(EOL, HEADER.NEXT_OFFSET);

    while(offset != EOL) {
        fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
        var curr_key_size = record_header.readUInt32BE(HEADER.KEY_LENGTH_OFFSET);
        var curr_key = new Buffer(curr_key_size);
        fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + HEADER.SIZE);
        if (Comparator.compare(key, curr_key) === Comparator.EQUAL) {
            offset = record_header.readUInt32BE(HEADER.NEXT_OFFSET);
            break;            
        } else if (Comparator.compare(key, curr_key) === Comparator.LESS) {
            pred_offset = offset;
            offset = record_header.readUInt32BE(HEADER.NEXT_OFFSET);
        } else if (Comparator.compare(key, curr_key) === Comparator.MORE) {
            return false;
        }
    }
    
    if (pred_offset) {
        var o = new Buffer(4);
        o.writeUInt32BE(offset, 0);
        fs.writeSync(this.fd, o, 0, o.length, pred_offset);
    } else {
        var o = new Buffer(4);
        o.writeUInt32BE(EOL, 0);
        fs.writeSync(this.fd, o, 0, o.length, index << 2);
    }
    
    if (this.cache) {
        this.cache.remove(key);
    }
    
    return true;
}

Driver.hashCode = function(str) {
    var ch, hash = 0;
    if (str.length == 0) return hash;
    for (var i=0; i<str.length; i++) {
        ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash = hash & hash;
    }
    return hash & 0x7fffffff;
}


Driver.stringify = function(s) {
    return typeof s === "string" ? s : s.toString();
}







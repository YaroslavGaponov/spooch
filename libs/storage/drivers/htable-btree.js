/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var fs = require("fs");
var util = require("util");

var HEADER = {
    SIGN: "SPOOCH",
    VERSION: 0x00000000,
    
    SIGN_OFFSET: 0,    
    VERSION_OFFSET: 6,
    TABLE_ELEMETS_OFFSET: 10,
    
    SIZE: 14
};

var TABLE = {
    TABLE_ELEMETS: 1024,
    TABLE_SIZE: 1024 << 2,
    EOL: 0xFFFFFFFF
};

var RECORD_HEADER = {
    LEFT_OFFSET: 0,
    RIGHT_OFFSET: 4,
    KEY_LENGTH_OFFSET: 8,
    VALUE_LENGTH_OFFSET: 12,
    
    SIZE: 16
};

var Comparator = {
    MORE: 1, LESS: -1, EQUAL:  0,    
    compare:
        function(a, b) {
            if (a.length > b.length) return this.MORE;
            if (a.length < b.length) return this.LESS;
            for(var i=0; i<a.length; i++) {
                if (a.charCodeAt(i) > b.charCodeAt(i)) return this.MORE;
                if (a.charCodeAt(i) < b.charCodeAt(i)) return this.LESS;
            }
            return this.EQUAL;
        }
}


var Driver = module.exports = function(filename, cache) {
    this.filename = filename;
    this.cache = cache;
}

Driver.prototype.open = function() {
    this.buffers = {};    
    
    var exists = fs.existsSync(this.filename);    
    if (exists) {
        this.fd = fs.openSync(this.filename, "r+");
        
        var header = new Buffer(HEADER.SIZE);
        fs.readSync(this.fd, header, 0, header.length, 0);
        TABLE.TABLE_ELEMETS = header.readUInt32BE(HEADER.TABLE_ELEMETS_OFFSET);
        TABLE.TABLE_SIZE = TABLE.TABLE_ELEMETS << 2;

        this.eof = fs.fstatSync(this.fd).size;
    } else {
        this.fd = fs.openSync(this.filename, "wx+");
        
        var header = new Buffer(HEADER.SIZE);
        header.write(HEADER.SIGN, HEADER.SIGN_OFFSET);
        header.writeUInt32BE(HEADER.VERSION, HEADER.VERSION_OFFSET);
        header.writeUInt32BE(TABLE.TABLE_ELEMETS, HEADER.TABLE_ELEMETS_OFFSET);
        fs.writeSync(this.fd, header, 0, header.length, 0);
        
        var table = new Buffer(TABLE.TABLE_SIZE); table.fill(TABLE.EOL & 0xFF);
        fs.writeSync(this.fd, table, 0, TABLE.TABLE_SIZE, HEADER.SIZE);
        this.eof = HEADER.SIZE + TABLE.TABLE_SIZE;
    }

    return true;
}

Driver.prototype.close = function() {
    this.buffers = null;
    if (this.cache) {
        this.cache.clear();
        this.cache = null;
    }
    fs.closeSync(this.fd);
    
    return true;
}

Driver.prototype.forEach = function(cb) {
    
    var read = function(offset) {
        if (offset != TABLE.EOL) {        
            fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
            var curr_key_size = record_header.readUInt32BE(RECORD_HEADER.KEY_LENGTH_OFFSET);
            var curr_key = new Buffer(curr_key_size);
            fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + RECORD_HEADER.SIZE);
            var curr_value_size = record_header.readUInt32BE(RECORD_HEADER.VALUE_LENGTH_OFFSET);
            var curr_value = new Buffer(curr_value_size);
            fs.readSync(this.fd, curr_value, 0, curr_value_size, offset + RECORD_HEADER.SIZE + curr_key_size);
            cb(Driver.stringify(curr_key), Driver.stringify(curr_value));
            read(record_header.readUInt32BE(RECORD_HEADER.LEFT_OFFSET));
            read(record_header.readUInt32BE(RECORD_HEADER.RIGHT_OFFSET));
        }        
    }
    
    for(var index=0; index<TABLE.TABLE_ELEMETS; index++) {
        
        var o = this._newBuffer(4);
        fs.readSync(this.fd, o, 0, o.length, HEADER.SIZE + (index << 2));
        var offset = o.readUInt32BE(0);
        
        var record_header = this._newBuffer(RECORD_HEADER.SIZE); 
    
        read(offset);   
    }
}

Driver.prototype.set = function(key, value) {
    
    key = Driver.stringify(key);
    value = Driver.stringify(value);
        
    var offset = this._getStartOffset(key);
    
    var pred_offset = null;
    var left_offset = rigth_offset = TABLE.EOL;
        
    var record_header = this._newBuffer(RECORD_HEADER.SIZE);
    record_header.writeUInt32BE(TABLE.EOL, RECORD_HEADER.LEFT_OFFSET);
    record_header.writeUInt32BE(TABLE.EOL, RECORD_HEADER.RIGHT_OFFSET);

    while(offset != TABLE.EOL) {
        fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
        var curr_key_size = record_header.readUInt32BE(RECORD_HEADER.KEY_LENGTH_OFFSET);
        var curr_key = new Buffer(curr_key_size);
        fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + RECORD_HEADER.SIZE);
        var compared = Comparator.compare(key, Driver.stringify(curr_key));
        if (compared === Comparator.EQUAL) {
            left_offset = record_header.readUInt32BE(RECORD_HEADER.LEFT_OFFSET);
            rigth_offset = record_header.readUInt32BE(RECORD_HEADER.RIGHT_OFFSET);
            break;            
        } else if (compared === Comparator.LESS) {
            pred_offset = offset;
            offset = record_header.readUInt32BE(RECORD_HEADER.LEFT_OFFSET);
        } else {
            pred_offset = offset;
            offset = record_header.readUInt32BE(RECORD_HEADER.RIGHT_OFFSET);
        }
    }
    
    var rec = new Buffer(RECORD_HEADER.SIZE + key.length + value.length);
    rec.writeUInt32BE(left_offset, RECORD_HEADER.LEFT_OFFSET);
    rec.writeUInt32BE(rigth_offset, RECORD_HEADER.RIGHT_OFFSET);
    rec.writeUInt32BE(key.length, RECORD_HEADER.KEY_LENGTH_OFFSET);
    rec.writeUInt32BE(value.length, RECORD_HEADER.VALUE_LENGTH_OFFSET);
    rec.write(key, RECORD_HEADER.SIZE);
    rec.write(value, RECORD_HEADER.SIZE + key.length);
    
    var bytes = fs.writeSync(this.fd, rec, 0, rec.length, this.eof);

    if (pred_offset) {
        var o = this._newBuffer(4);
        o.writeUInt32BE(this.eof, 0);
        if (compared === Comparator.LESS) {
            fs.writeSync(this.fd, o, 0, o.length, pred_offset + RECORD_HEADER.LEFT_OFFSET);
        } else {
            fs.writeSync(this.fd, o, 0, o.length, pred_offset + RECORD_HEADER.RIGHT_OFFSET);
        }
    } else {
        this._setStartOffset(key, this.eof);
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
        if (this.cache.exists(key)) {
            return this.cache.get(key);    
        }
    }

    var offset = this._getStartOffset(key);    
    
    var record_header = this._newBuffer(RECORD_HEADER.SIZE); 
    
    while(offset != TABLE.EOL) {        
        fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
        var curr_key_size = record_header.readUInt32BE(RECORD_HEADER.KEY_LENGTH_OFFSET);
        var curr_key = new Buffer(curr_key_size);
        fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + RECORD_HEADER.SIZE);
        var compared = Comparator.compare(key, Driver.stringify(curr_key));
        if (compared === Comparator.EQUAL) {
            var curr_value_size = record_header.readUInt32BE(RECORD_HEADER.VALUE_LENGTH_OFFSET);
            var curr_value = new Buffer(curr_value_size);
            fs.readSync(this.fd, curr_value, 0, curr_value_size, offset + RECORD_HEADER.SIZE + curr_key_size);
            return Driver.stringify(curr_value);
        } else if (compared === Comparator.LESS) {
            offset = record_header.readUInt32BE(RECORD_HEADER.LEFT_OFFSET);
        } else {
            offset = record_header.readUInt32BE(RECORD_HEADER.RIGHT_OFFSET);
        }
    }
    
    return null;
}

Driver.prototype.remove = function(key) {
    
    key = Driver.stringify(key);

    var offset = this._getStartOffset(key);
        
    var pred_offset = null;
    var left_offset = rigth_offset = TABLE.EOL;

    var record_header = this._newBuffer(RECORD_HEADER.SIZE);
    record_header.writeUInt32BE(TABLE.EOL, RECORD_HEADER.LEFT_OFFSET);
    record_header.writeUInt32BE(TABLE.EOL, RECORD_HEADER.RIGHT_OFFSET);

    while(offset != TABLE.EOL) {
        fs.readSync(this.fd, record_header, 0, record_header.length, offset);        
        var curr_key_size = record_header.readUInt32BE(RECORD_HEADER.KEY_LENGTH_OFFSET);
        var curr_key = new Buffer(curr_key_size);
        fs.readSync(this.fd, curr_key, 0, curr_key_size, offset + RECORD_HEADER.SIZE);
        var compared = Comparator.compare(key, Driver.stringify(curr_key));
        if (compared === Comparator.EQUAL) {
            left_offset = record_header.readUInt32BE(RECORD_HEADER.LEFT_OFFSET);
            rigth_offset = record_header.readUInt32BE(RECORD_HEADER.RIGHT_OFFSET);
            break;            
        } else if (compared === Comparator.LESS) {
            pred_offset = offset;
            offset = record_header.readUInt32BE(RECORD_HEADER.LEFT_OFFSET);
        } else {
            pred_offset = offset;
            offset = record_header.readUInt32BE(RECORD_HEADER.RIGHT_OFFSET);
        }
    }
    
    if (pred_offset) {
        var o = this._newBuffer(4);
        o.writeUInt32BE(left_offset, RECORD_HEADER.LEFT_OFFSET);
        o.writeUInt32BE(rigth_offset, RECORD_HEADER.RIGHT_OFFSET);
        if (compared === Comparator.LESS) {
            fs.writeSync(this.fd, o, 0, o.length, pred_offset + RECORD_HEADER.LEFT_OFFSET);
        } else {
            fs.writeSync(this.fd, o, 0, o.length, pred_offset + RECORD_HEADER.RIGHT_OFFSET);
        }
    } else {
        this._setStartOffset(key, TABLE.EOL);
    }
    
    if (this.cache) {
        this.cache.remove(key);
    }
    
    return true;
}

Driver.prototype._newBuffer = function(size) {
    if (!this.buffers[size]) {
        return this.buffers[size]= new Buffer(size);
    }
    return this.buffers[size];
}

Driver.prototype._getStartOffset = function(key) {
    var index = Driver.hashCode(key) % TABLE.TABLE_ELEMETS;    
    var o = this._newBuffer(4);
    fs.readSync(this.fd, o, 0, o.length, HEADER.SIZE + (index << 2));
    var offset = o.readUInt32BE(0);
    return offset;    
}

Driver.prototype._setStartOffset = function(key, offset) {
    var index = Driver.hashCode(key) % TABLE.TABLE_ELEMETS;
    var o = this._newBuffer(4);
    o.writeUInt32BE(offset, 0);
    fs.writeSync(this.fd, o, 0, o.length, HEADER.SIZE + (index << 2));    
}

Driver.hashCode = function(s) {
    var ch, hash = 0;
    if (s.length == 0) return hash;
    var length = s.length <= 32 ? s.length : 32;
    for (var i=0; i<length; i++) {
        ch = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash = hash & hash;
    }
    return hash & 0x7fffffff;
}

Driver.stringify = function(s) {
    return typeof s === "string" ? s : s.toString();
}







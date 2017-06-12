const utils = require("./utils");
const fs = require('fs');

function Indexer(setup) {
	this.setup = setup;
	this.algoliaIdx = []; 
	this.maxFiles = 0;
}

Indexer.prototype.run = function(){
	var _that = this;
	var indexTime = +new Date();

	return new Promise(function(resolve, reject){

		if(_that.setup.fileList && (_that.setup.fileList instanceof Array) && _that.setup.fileList.length>0){
			_that.maxFiles = _that.setup.fileList.length;
			_that.loopResults(_that.setup.fileList, _that.setup, indexTime, resolve, reject);
		}else{
			_that.recursiveloop(_that.setup.dir, function(err,result){
				if(!result){
					console.error("no files in " + _that.setup.dir);
					return;
				}

				_that.loopResults(result, _that.setup, indexTime, resolve, reject);
			});
		}
	});

};

Indexer.prototype.loopResults = function(result, setup, indexTime, resolve, reject){
	var _that = this;

	for(i=0;i<result.length;i++){
		utils.parseMD(result[i], setup)
		.then(
			function(props){
				if(!props){
					_that.maxFiles--;
					return;
				}

				if(
					(!props.draft || props.draft===false) && 
					(setup.index_empty_content===undefined || setup.index_empty_content===true || (setup.index_empty_content===false && props.content.replace(/\s/g,"")!=="")) &&
					(!utils.checkArrInStr(props.path,setup.excludes)) 
				){
					props.indexTime = indexTime;
					_that.algoliaIdx.push(props);
				}
				_that.maxFiles--;
				if(_that.maxFiles===0){
					resolve(_that.algoliaIdx);
				}
			}
		).catch(
			function(err){
				//reject(err);
				console.log(err);
				_that.maxFiles--;
			}
		);	    	
	}
}

// Asynchronous function to read folders and files recursively
Indexer.prototype.recursiveloop = function(dir, done){
  var results = [];
  var _that = this;
  fs.readdir(dir, function(err, list){
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          _that.recursiveloop(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          _that.maxFiles++;
          results.push(file);
          next();
        }
      });
    })();
  });
}

module.exports.Indexer = Indexer;
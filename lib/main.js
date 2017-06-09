const utils = require("./utils");
const fs = require('fs');

var algoliaIdx = []; 
var maxFiles = 0;

function Indexer(setup) {
	this.setup = setup;
	algoliaIdx = []; 
	maxFiles = 0;
}

Indexer.prototype.run = function(){
	var _that = this;
	var indexTime = +new Date();

	return new Promise(function(resolve, reject){

		if(_that.setup.fileList && (_that.setup.fileList instanceof Array) && _that.setup.fileList.length>0){
			maxFiles = _that.setup.fileList.length;
			loopResults(_that.setup.fileList, _that.setup, indexTime, resolve, reject);
		}else{
			recursiveloop(_that.setup.dir, function(err,result){
				if(!result){
					console.error("no files in " + _that.setup.dir);
					return;
				}

				loopResults(result, _that.setup, indexTime, resolve, reject);
			});
		}
	});

};

function loopResults(result, setup, indexTime, resolve, reject){

	for(i=0;i<result.length;i++){
		utils.parseMD(result[i], setup)
		.then(
			function(props){
				if(!props){
					maxFiles--;
					return;
				}

				if(
					(!props.draft || props.draft===false) && 
					(setup.index_empty_content===undefined || setup.index_empty_content===true || (setup.index_empty_content===false && props.content.replace(/\s/g,"")!=="")) &&
					(!utils.checkArrInStr(props.path,setup.excludes)) 
				){
					props.indexTime = indexTime;
					algoliaIdx.push(props);
				}
				maxFiles--;
				if(maxFiles===0){
					resolve(algoliaIdx);
				}
			}
		).catch(
			function(err){
				//reject(err);
				console.log(err);
				maxFiles--;
			}
		);	    	
	}
}

// Asynchronous function to read folders and files recursively
function recursiveloop(dir, done){
  var results = [];
  fs.readdir(dir, function(err, list){
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          recursiveloop(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          maxFiles++;
          results.push(file);
          next();
        }
      });
    })();
  });
}

module.exports.Indexer = Indexer;
